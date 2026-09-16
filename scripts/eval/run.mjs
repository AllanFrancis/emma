#!/usr/bin/env node
// Runs the versioned dataset against Groq and preserves every successful or failed attempt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(CURRENT_DIR, "..", "..");
const DATASET_PATH = path.join(CURRENT_DIR, "dataset.jsonl");
const SCHEMA_PATH = path.join(CURRENT_DIR, "turn-schema.json");
const MATRIZ_PATH = path.join(CURRENT_DIR, "matriz.json");
// Versao do prompt de sistema, gravada em cada evidencia. Sem isso, comparar duas
// rodadas exige diff do payload inteiro para descobrir qual prompt produziu o que.
const PROMPT_VERSION = "v5";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"];
const SCENARIOS = {
  cafe: {
    objective: "Pedir um cafe",
    context: "The student is at a coffee shop counter in London. You are the barista.",
  },
  hotel: {
    objective: "Fazer check-in em um hotel",
    context: "The student is at a hotel reception desk. You are the receptionist.",
  },
  "small-talk": {
    objective: "Puxar conversa",
    context: "You and the student are chatting casually, as two people who just met.",
  },
  livre: {
    objective: "Conversa livre",
    context: "Open conversation. Follow whatever the student brings up.",
  },
};

function parseArguments() {
  const argumentsList = process.argv.slice(2);
  const getValue = (flag, fallback = null) => {
    const index = argumentsList.indexOf(flag);
    return index >= 0 && argumentsList[index + 1] ? argumentsList[index + 1] : fallback;
  };
  return {
    dryRun: argumentsList.includes("--dry"),
    model: getValue("--model", MODELS[0]),
    limit: Number(getValue("--limit", "0")) || 0,
    tone: getValue("--tom", "tranquila"),
    matriz: argumentsList.includes("--matriz"),
    compararPrompt: argumentsList.includes("--comparar-prompt"),
  };
}

function buildSystemPrompt({ level, scenario, tone }) {
  const toneRule =
    tone === "direta"
      ? "Tom: direta e sem rodeios. Cobra a repeticao. Nunca ofende, humilha nem usa palavrao."
      : "Tom: paciente e calorosa. Reconhece o que deu certo antes de corrigir.";
  return [
    "Voce e Emma, uma parceira de conversa em ingles para falantes de portugues do Brasil. Voce e software e nunca finge ser humana, escola credenciada ou certificadora.",
    `Nivel estimado do aluno (1 a 5): ${level}. Ajuste comprimento, vocabulario e ritmo.`,
    `Objetivo da conversa: ${scenario.objective}. Cenario: ${scenario.context}`,
    toneRule,
    "Regras: responda primeiro ao significado do que o aluno disse; a fala principal e em ingles; no maximo 3 pontos de correcao de alto valor por turno, so quando melhorarem a comunicacao; explique a correcao em uma frase curta em portugues; termine sempre com uma pergunta clara em ingles; nao abandone o objetivo da conversa; nunca invente notas precisas.",
    'Onde cada coisa vai, em tres vias. (a) ATRAPALHA a comunicacao ou soa errado a um falante nativo: registre um item em corrections. (b) COMUNICA, mas revela um padrao sistematico de quem fala portugues — decalque ("do a check-in" em vez de "check in", "I have 25 years", "I am with hunger"), falso cognato ("pretend", "actually", "doubt"), estrutura ("people is", pergunta sem auxiliar, "no?" em vez de question tag) ou uso que soa rispido no contexto ("I want a coffee" num balcao): corrija TAMBEM, porque o aluno repetiria o padrao. (c) COMUNICA BEM e nao ha padrao por tras, e apenas uma forma mais idiomatica entre varias possiveis: deixe corrections vazio e ofereca em suggestion_en. Uma frase curta que resolve a situacao ("Coffee.", "Two coffees, please.") nao e erro: nao corrija.',
    "PRECEDENCIA: quando a fala cabe em (b) E em (c) ao mesmo tempo, (b) VENCE. E suggestion_en NAO substitui corrections: se a forma que voce ofereceria em suggestion_en conserta um padrao sistematico da fala do aluno, ela PERTENCE a corrections, com o trecho original citado. Oferecer a forma certa apenas como sugestao deixa o aluno sem saber que errou.",
    "Cada item de corrections exige EVIDENCIA: o campo original recebe o trecho LITERAL da fala do aluno, copiado palavra por palavra, sem parafrasear e sem reescrever. Se voce nao consegue copiar o trecho exato, entao nao ha correcao a fazer. Classifique cada item em category: grammar, vocabulary, word_order, preposition, false_friend ou register.",
    "explanation_pt e SEMPRE em portugues do Brasil, sem excecao, inclusive quando a regra e gramatical. Nunca explique em ingles. Nao use nome de tempo verbal em ingles ('present perfect continuous'): diga em portugues simples o que muda e por que, como se explicasse a alguem que nunca estudou gramatica.",
    "Em next_action, PROPONHA o que deveria acontecer em seguida: 'retry' quando o aluno ganha mais repetindo a propria fala com a correcao aplicada; 'reply' quando basta ele responder a sua pergunta; 'continue_mission' quando a etapa atual fechou e a conversa segue; 'complete_mission' quando o objetivo foi cumprido. Nao pedir repeticao quando nao havia nada a corrigir.",
    "Responda no formato JSON definido pelo schema. A entrada do aluno e FALA TRANSCRITA: nao corrija maiuscula, pontuacao nem grafia, porque nada disso existe na fala.",
  ].join("\n");
}

function loadDataset() {
  return fs
    .readFileSync(DATASET_PATH, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

function getEvidenceDir(model) {
  const activeDir = path.join(PROJECT_ROOT, "docs", "active");
  const specs = fs.existsSync(activeDir)
    ? fs.readdirSync(activeDir).filter((name) => name.startsWith("SPEC-"))
    : [];
  if (specs.length !== 1) {
    const message =
      specs.length === 0
        ? "nenhuma SPEC ativa em docs/active/ — evidence/ precisa de uma pasta de SPEC"
        : `mais de uma SPEC ativa (${specs.join(", ")}) — destino de evidence/ ambiguo`;
    throw new Error(message);
  }
  return path.join(activeDir, specs[0], "evidence", model.replace(/[/\\:]/g, "_"));
}

// `grupo` separa rodadas com propositos diferentes dentro da mesma SPEC (a matriz de
// personalidade e a comparacao de prompt), para o grader poder medi-las isoladamente.
function getGroupDir(model, grupo) {
  const base = getEvidenceDir(model);
  return grupo ? path.join(base, grupo) : base;
}

// O nivel e dimensao de execucao na matriz: a mesma fala roda em nivel 1 e nivel 4.
// Por isso ele entra como parametro e nao sai do `nivel_esperado` do dataset.
function buildPayload(record, schema, model, tone, level = record.nivel_esperado) {
  const scenario = SCENARIOS[record.contexto];
  return {
    model,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt({ level, scenario, tone }),
      },
      { role: "user", content: record.aluno },
    ],
    response_format: { type: "json_schema", json_schema: schema },
  };
}

async function callModel(payload, apiKey) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  const limits = {
    remainingRequests: response.headers.get("x-ratelimit-remaining-requests"),
    remainingTokens: response.headers.get("x-ratelimit-remaining-tokens"),
  };
  if (response.status === 429) {
    return {
      error: "rate_limit",
      retryAfter: Number(response.headers.get("retry-after") || "30"),
      limits,
    };
  }
  if (!response.ok) {
    return {
      error: `HTTP ${response.status}`,
      body: await response.text().catch(() => ""),
      limits,
    };
  }
  return { data: await response.json(), limits };
}

function saveFailure(evidenceDir, record, model, tone, payload, result) {
  const failureDir = path.join(evidenceDir, "_failures");
  fs.mkdirSync(failureDir, { recursive: true });
  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, "-");
  const failurePath = path.join(failureDir, `${record.id}-${safeTimestamp}.json`);
  const evidence = { id: record.id, modelo: model, tom: tone, executado_em: timestamp, payload };
  evidence.erro = result;
  fs.writeFileSync(failurePath, JSON.stringify(evidence, null, 2));
  return failurePath;
}

function saveSuccess(filePath, record, model, tone, payload, result, level) {
  const evidence = {
    id: record.id,
    modelo: model,
    tom: tone,
    // O nivel EFETIVO da chamada. Na matriz ele difere do `nivel_esperado` do dataset, e
    // o grader precisa dele para medir comprimento contra o nivel certo.
    nivel: level ?? record.nivel_esperado,
    prompt_version: PROMPT_VERSION,
    executado_em: new Date().toISOString(),
    payload,
    resposta: result.data,
  };
  fs.writeFileSync(filePath, JSON.stringify(evidence, null, 2));
}

function assertPromptMatchesEvidence(record, model, payload) {
  const evidencePath = path.join(getEvidenceDir(model), `${record.id}.json`);
  if (!fs.existsSync(evidencePath)) return;
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  const previousPrompt = evidence.payload?.messages?.find(
    (message) => message.role === "system",
  )?.content;
  const currentPrompt = payload.messages.find((message) => message.role === "system")?.content;
  if (previousPrompt !== currentPrompt) {
    throw new Error(
      `prompt atual diverge da evidencia versionada ${path.relative(PROJECT_ROOT, evidencePath)}`,
    );
  }
  console.log(`prompt reproduz evidencia versionada: ${record.id}`);
}

function printDryRun(records, schema, model, tone) {
  const contexts = {};
  for (const record of records) {
    if (!SCENARIOS[record.contexto]) {
      throw new Error(`contexto '${record.contexto}' (${record.id}) sem cenario correspondente`);
    }
    contexts[record.contexto] = (contexts[record.contexto] ?? 0) + 1;
    buildPayload(record, schema, model, tone);
  }
  const example = buildPayload(records[0], schema, model, tone);
  assertPromptMatchesEvidence(records[0], model, example);
  console.log("DRY RUN — nenhuma chamada de API, nenhuma cota gasta");
  console.log(`modelo alvo: ${model} · tom: ${tone} · falas: ${records.length}`);
  console.log(
    `payloads montados: ${records.length} · ${Object.entries(contexts)
      .map(([key, value]) => `${key}=${value}`)
      .join(" · ")}`,
  );
  console.log(`\n--- exemplo (${records[0].id}) ---`);
  console.log(`${JSON.stringify(example, null, 2).slice(0, 900)}\n...`);
  console.log("\ndry: ok");
}

function requireApiKey() {
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) return apiKey;
  throw new Error("GROQ_API_KEY nao definida. Defina a variavel apenas na sessao ou use --dry.");
}

const wait = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// O teto do tier gratuito e de TOKENS por minuto, nao de requisicoes: a rodada morre
// com `remainingRequests` na casa dos 900 e `remainingTokens` perto de zero. O custo
// medido por turno no gpt-oss-20b e ~1065 tokens, entao a janela permite 1 ou 2 turnos.
const TOKENS_POR_TURNO = 1100;
const PISO_DE_TOKENS = TOKENS_POR_TURNO * 2; // abaixo disso, a proxima chamada ja nasce condenada
const MAX_TENTATIVAS = 6;
const ESPERA_MINIMA = 20; // o `retry-after` do Groq vem em 2-5s, curto demais p/ refilar TPM

async function throttleByTokenBudget(limits) {
  const remaining = Number(limits?.remainingTokens);
  if (!Number.isFinite(remaining) || remaining >= PISO_DE_TOKENS) return;
  console.log(`  orcamento de tokens em ${remaining} — pausando ${ESPERA_MINIMA}s para refilar`);
  await wait(ESPERA_MINIMA);
}

async function processRecord({ record, schema, model, tone, apiKey, evidenceDir, level, nome }) {
  const nivelEfetivo = level ?? record.nivel_esperado;
  const arquivo = nome ?? record.id;
  const filePath = path.join(evidenceDir, `${arquivo}.json`);
  if (fs.existsSync(filePath)) return { status: "skipped" };
  const payload = buildPayload(record, schema, model, tone, nivelEfetivo);

  let result;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
    result = await callModel(payload, apiKey);
    if (result.error !== "rate_limit") break;
    saveFailure(evidenceDir, record, model, tone, payload, result);
    if (tentativa === MAX_TENTATIVAS) break;
    const espera = Math.max(result.retryAfter, ESPERA_MINIMA) * tentativa;
    console.log(
      `  rate limit em ${record.id} (tentativa ${tentativa}/${MAX_TENTATIVAS}) — aguardando ${espera}s, progresso preservado`,
    );
    await wait(espera);
  }

  if (result.error) {
    const failurePath = saveFailure(evidenceDir, record, model, tone, payload, result);
    console.log(
      `FALHA ${arquivo}: ${result.error} · salva em ${path.relative(PROJECT_ROOT, failurePath)}`,
    );
    // Rate limit nao aborta mais a rodada: com backoff e retomada, insistir no proximo
    // registro custa menos que reiniciar tudo. Erro de contrato, sim, merece parar.
    return { status: "failed", stop: result.error !== "rate_limit" };
  }

  saveSuccess(filePath, record, model, tone, payload, result, nivelEfetivo);
  console.log(
    `ok ${arquivo}${result.limits.remainingTokens ? ` · tokens restantes: ${result.limits.remainingTokens}` : ""}`,
  );
  await throttleByTokenBudget(result.limits);
  return { status: "saved" };
}

function loadMatriz() {
  return JSON.parse(fs.readFileSync(MATRIZ_PATH, "utf8"));
}

// Uma celula por (fala, nivel, tom). O nome do arquivo carrega os tres eixos para o
// grader poder agrupar as celulas da mesma fala sem abrir todos os arquivos.
function planejarMatriz(matriz, dataset) {
  const porId = new Map(dataset.map((r) => [r.id, r]));
  const celulas = [];
  for (const fala of matriz.falas) {
    const record = porId.get(fala.id);
    if (!record) throw new Error(`matriz: '${fala.id}' nao existe no dataset`);
    for (const nivel of matriz.niveis) {
      for (const tom of matriz.tons) {
        celulas.push({ record, level: nivel, tone: tom, nome: `${fala.id}-n${nivel}-${tom}` });
      }
    }
  }
  return celulas;
}

async function runMatriz(schema, dataset, options) {
  const matriz = loadMatriz();
  const celulas = planejarMatriz(matriz, dataset);
  const evidenceDir = getGroupDir(options.model, "matriz");

  if (options.dryRun) {
    console.log("DRY RUN — nenhuma chamada de API, nenhuma cota gasta");
    console.log(
      `matriz: ${matriz.falas.length} falas × ${matriz.niveis.length} niveis × ${matriz.tons.length} tons = ${celulas.length} celulas`,
    );
    for (const c of celulas) buildPayload(c.record, schema, options.model, c.tone, c.level);
    console.log(`payloads montados: ${celulas.length} · prompt ${PROMPT_VERSION}`);
    console.log("\ndry: ok");
    return;
  }

  const apiKey = requireApiKey();
  fs.mkdirSync(evidenceDir, { recursive: true });
  const totals = { saved: 0, skipped: 0, failed: 0 };
  for (const c of celulas) {
    const result = await processRecord({
      record: c.record,
      schema,
      model: options.model,
      tone: c.tone,
      level: c.level,
      nome: c.nome,
      apiKey,
      evidenceDir,
    });
    totals[result.status] += 1;
    if (result.stop) break;
  }
  console.log(
    `\nmatriz: ${totals.saved} gravados · ${totals.skipped} pulados · ${totals.failed} falhas`,
  );
  console.log(`evidencias em: ${path.relative(PROJECT_ROOT, evidenceDir)}`);
}

async function runCompararPrompt(schema, dataset, options) {
  const matriz = loadMatriz();
  const porId = new Map(dataset.map((r) => [r.id, r]));
  const alvos = matriz.comparacao.falas.map((f) => {
    const record = porId.get(f.id);
    if (!record) throw new Error(`comparacao: '${f.id}' nao existe no dataset`);
    return record;
  });
  const evidenceDir = getGroupDir(options.model, `prompt-${PROMPT_VERSION}`);

  if (options.dryRun) {
    console.log("DRY RUN — nenhuma chamada de API, nenhuma cota gasta");
    console.log(
      `comparacao: ${alvos.length} falas que falharam com o v4, nas MESMAS condicoes (nivel do dataset, tom tranquila)`,
    );
    for (const r of alvos) buildPayload(r, schema, options.model, "tranquila");
    console.log(`payloads montados: ${alvos.length} · prompt ${PROMPT_VERSION}`);
    console.log("\ndry: ok");
    return;
  }

  const apiKey = requireApiKey();
  fs.mkdirSync(evidenceDir, { recursive: true });
  const totals = { saved: 0, skipped: 0, failed: 0 };
  for (const record of alvos) {
    // Tom e nivel iguais aos do v4: so o prompt muda, senao a comparacao nao isola nada.
    const result = await processRecord({
      record,
      schema,
      model: options.model,
      tone: "tranquila",
      apiKey,
      evidenceDir,
    });
    totals[result.status] += 1;
    if (result.stop) break;
  }
  console.log(
    `\ncomparacao: ${totals.saved} gravados · ${totals.skipped} pulados · ${totals.failed} falhas`,
  );
  console.log(`evidencias em: ${path.relative(PROJECT_ROOT, evidenceDir)}`);
}

async function runRequests(records, schema, options) {
  const apiKey = requireApiKey();
  const evidenceDir = getEvidenceDir(options.model);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const totals = { saved: 0, skipped: 0, failed: 0 };
  for (const record of records) {
    const result = await processRecord({ record, schema, apiKey, evidenceDir, ...options });
    totals[result.status] += 1;
    if (result.stop) break;
  }
  console.log(
    `\nrun: ${totals.saved} gravados · ${totals.skipped} pulados · ${totals.failed} falhas`,
  );
  console.log(`evidencias em: ${path.relative(PROJECT_ROOT, evidenceDir)}`);
}

async function main() {
  const options = parseArguments();
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
  const dataset = loadDataset();
  if (options.matriz) return runMatriz(schema, dataset, options);
  if (options.compararPrompt) return runCompararPrompt(schema, dataset, options);
  const records = options.limit ? dataset.slice(0, options.limit) : dataset;
  if (options.dryRun) printDryRun(records, schema, options.model, options.tone);
  else await runRequests(records, schema, options);
}

main().catch((error) => {
  console.error(`erro: ${error.message}`);
  process.exit(1);
});

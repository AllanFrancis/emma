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
const CONVERSATIONS_PATH = path.join(CURRENT_DIR, "conversations.jsonl");
// Versao do prompt de sistema, gravada em cada evidencia. Sem isso, comparar duas
// rodadas exige diff do payload inteiro para descobrir qual prompt produziu o que.
const PROMPT_VERSION = "v5";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"];

// ---------------------------------------------------------------------------
// Amostragem controlada (SPEC-20260916-2048-metodologia-de-eval)
//
// Suporte CONFIRMADO na referencia viva da API do Groq
// (https://console.groq.com/docs/api-reference, consultada em 2026-09-16), e nao por
// analogia com a API da OpenAI:
//   `temperature` — number|null, opcional, default 1, faixa 0-2.
//   `seed`        — integer|null, opcional: o sistema faz "best effort to sample
//                   deterministically, such that repeated requests with the same seed and
//                   parameters should return the same result". Determinismo NAO e
//                   garantido, e a propria doc manda observar `system_fingerprint` para
//                   saber quando o backend mudou e o determinismo deixou de valer.
// A pagina de compatibilidade OpenAI do Groq acrescenta uma pegadinha: temperature 0 e
// convertida para 1e-8. Nao e o valor escolhido aqui, mas fica registrado.
//
// TEMPERATURE FIXADA EM 1 — o default da API. Duas razoes: (a) e o regime sob o qual as
// 215 evidencias ja arquivadas foram geradas, entao fixar aqui torna rodada nova
// comparavel com o historico em vez de abrir uma quebra; (b) o risco declarado no main.md
// e que temperatura baixa degrada a naturalidade, que e qualidade de produto. Quem quiser
// decodificacao quase gulosa passa `--temperature`. O valor de PRODUCAO segue sendo
// decisao separada e ainda nao tomada.
//
// SEED FIXADO — e o que faz duas rodadas da mesma condicao serem comparaveis. Variar o
// seed DE PROPOSITO (`--seed`) e como se mede a variancia residual, com cada repeticao
// reproduzivel.
const AMOSTRAGEM_PADRAO = { temperature: 1, seed: 20260916 };
let AMOSTRAGEM = { ...AMOSTRAGEM_PADRAO };

// Timeout DERIVADO do custo medido, nao arbitrado. Nas 215 evidencias arquivadas que
// gravaram `usage`, a parede (queue_time + total_time) deu p50 1,28s · p90 1,95s ·
// p99 2,39s e MAXIMO 2,91s. O turno mais caro somou 3.433 tokens e o throughput de
// completion mais lento observado foi 403 tok/s (p1), o que poe o pior caso de geracao em
// ~8,5s. 30s = ~10x o pior caso observado e ~3,5x o pior caso estimado: folga para nao
// cortar rodada lenta, e curto o bastante para matar conexao pendurada. Sem isso, o
// `fetch` sem timeout pendurou a rodada da matriz por ~15 minutos em `livre-09-n4-direta`.
const TIMEOUT_MS = 30_000;

// Pontos de injecao do self-test. Em producao sao o `fetch` global e o timeout derivado.
let fetchImpl = (...args) => fetch(...args);
let timeoutMs = TIMEOUT_MS;
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
    conversa: argumentsList.includes("--conversa"),
    conversaId: getValue("--conversa-id", null),
    selfTest: argumentsList.includes("--self-test"),
    temperature: Number(getValue("--temperature", String(AMOSTRAGEM_PADRAO.temperature))),
    seed: Number(getValue("--seed", String(AMOSTRAGEM_PADRAO.seed))),
  };
}

// A amostragem e resolvida UMA vez, no inicio, e vale para toda a rodada. Deixar cada
// caminho (dataset, matriz, comparacao, conversa) escolher a sua daria evidencia com
// parametros diferentes dentro da mesma rodada — exatamente o que esta SPEC vem impedir.
function configurarAmostragem(options) {
  const { temperature, seed } = options;
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new Error(`--temperature fora da faixa 0-2 aceita pelo Groq: ${options.temperature}`);
  }
  if (!Number.isInteger(seed)) {
    throw new Error(`--seed precisa ser inteiro (o Groq recusa o resto): ${options.seed}`);
  }
  AMOSTRAGEM = { temperature, seed };
  console.log(`amostragem: temperature=${temperature} · seed=${seed}`);
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
    ...AMOSTRAGEM,
  };
}

async function callModel(payload, apiKey) {
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      // Sem isso a rodada nao tem como distinguir "lenta" de "pendurada".
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    // `AbortSignal.timeout` rejeita com DOMException de nome TimeoutError. Rede caida
    // chega aqui tambem, e as duas se tratam igual: registra e segue para o proximo.
    const estourou = error?.name === "TimeoutError" || error?.name === "AbortError";
    return {
      error: estourou ? "timeout" : "rede",
      detalhe: `${error?.name ?? "Error"}: ${error?.message ?? ""}`.trim(),
      timeout_ms: estourou ? timeoutMs : undefined,
      limits: {},
    };
  }
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
    const body = await response.text().catch(() => "");
    // Falha de GERACAO, nao de contrato nosso: o strict mode devolve 400 com
    // `code: json_validate_failed` quando o modelo nao consegue produzir JSON no schema.
    // A DEC-20260916-0311 preve retry e depois fallback; parar a rodada inteira por uma
    // geracao ruim e o que esta SPEC vem corrigir.
    if (response.status === 400 && body.includes("json_validate_failed")) {
      return { error: "json_validate_failed", body, limits };
    }
    return { error: `HTTP ${response.status}`, body, limits };
  }
  return { data: await response.json(), limits };
}

// O nome do arquivo de falha carrega a CELULA, nao so a fala. Antes, duas celulas da mesma
// fala (`livre-02` em n1/tranquila e em n4/direta) gravavam falha com o mesmo prefixo, e a
// metrica de confiabilidade nao tinha como dizer qual geracao falhou nem qual recuperou.
function saveFailure(evidenceDir, record, model, tone, payload, result, nome, nivel) {
  const failureDir = path.join(evidenceDir, "_failures");
  fs.mkdirSync(failureDir, { recursive: true });
  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, "-");
  const celula = nome ?? record.id;
  const failurePath = path.join(failureDir, `${celula}-${safeTimestamp}.json`);
  const evidence = {
    id: record.id,
    celula,
    modelo: model,
    tom: tone,
    nivel: nivel ?? record.nivel_esperado,
    executado_em: timestamp,
    amostragem: { ...AMOSTRAGEM },
    payload,
  };
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
    // Amostragem PEDIDA e EFETIVA no mesmo lugar. O Groq devolve o seed que usou em
    // `x_groq.seed` e o `system_fingerprint` do backend — a doc manda observar o
    // fingerprint justamente porque o determinismo do seed morre quando ele muda.
    // Comparar duas rodadas sem esses quatro numeros nao e comparacao.
    amostragem: {
      temperature: payload.temperature ?? null,
      seed: payload.seed ?? null,
      seed_efetivo: result.data?.x_groq?.seed ?? null,
      system_fingerprint: result.data?.system_fingerprint ?? null,
    },
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
// Teto BAIXO e de proposito: `json_validate_failed` que persiste em 3 geracoes seguidas
// nao e azar de amostragem, e sinal de schema ou prompt incompativel com o modelo. Insistir
// mais queima orcamento de tokens para reencontrar o mesmo problema.
const MAX_TENTATIVAS_GERACAO = 3;
// Falhas que a rodada absorve e segue. Erro fora desta lista para a rodada.
const ERROS_QUE_NAO_ABORTAM = new Set(["rate_limit", "json_validate_failed", "timeout", "rede"]);

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

  // Duas causas de nova tentativa, com orcamentos SEPARADOS. Rate limit e espera: o teto
  // e alto e cada tentativa dorme. `json_validate_failed` e geracao ruim: o teto e baixo e
  // a proxima tentativa vai na hora, porque nao ha nada para refilar.
  let result;
  let esperas = 0;
  let geracoes = 0;
  for (;;) {
    result = await callModel(payload, apiKey);

    if (result.error === "rate_limit") {
      esperas += 1;
      saveFailure(evidenceDir, record, model, tone, payload, result, arquivo, nivelEfetivo);
      if (esperas >= MAX_TENTATIVAS) break;
      const espera = Math.max(result.retryAfter, ESPERA_MINIMA) * esperas;
      console.log(
        `  rate limit em ${arquivo} (tentativa ${esperas}/${MAX_TENTATIVAS}) — aguardando ${espera}s, progresso preservado`,
      );
      await wait(espera);
      continue;
    }

    if (result.error === "json_validate_failed") {
      geracoes += 1;
      // NUNCA apagar ocorrencia de falha recuperada — a metrica de confiabilidade existe
      // para isso (invariante herdada da SPEC-20260916-1652). A falha vai para o disco
      // ANTES do retry, com o nome da celula, para que a recuperacao seja atribuivel.
      saveFailure(evidenceDir, record, model, tone, payload, result, arquivo, nivelEfetivo);
      if (geracoes >= MAX_TENTATIVAS_GERACAO) break;
      console.log(
        `  json_validate_failed em ${arquivo} (geracao ${geracoes}/${MAX_TENTATIVAS_GERACAO}) — retry in-process, DEC-20260916-0311`,
      );
      continue;
    }

    break;
  }

  if (result.error) {
    const failurePath = saveFailure(
      evidenceDir,
      record,
      model,
      tone,
      payload,
      result,
      arquivo,
      nivelEfetivo,
    );
    console.log(
      `FALHA ${arquivo}: ${result.error} · salva em ${path.relative(PROJECT_ROOT, failurePath)}`,
    );
    // Falha de espera, de geracao ou de rede nao aborta a rodada: com retry e retomada,
    // seguir para o proximo registro custa menos que reiniciar tudo. Erro de contrato
    // NOSSO (schema recusado, 401, 404) continua parando, porque insistir nele e desperdicio.
    return { status: "failed", stop: !ERROS_QUE_NAO_ABORTAM.has(result.error) };
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

function loadConversations() {
  return fs
    .readFileSync(CONVERSATIONS_PATH, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

// A conversa e a unidade de evidencia, mas NAO a unidade de retomada: com historico
// acumulado o custo cresce a cada turno, e perder uma conversa de 5 turnos por um rate
// limit no ultimo turno significa repagar os quatro anteriores. Por isso o arquivo e
// gravado a cada turno com `completa: false` e a retomada reconstroi `messages` a partir
// das respostas ja gravadas.
function conversationEvidencePath(evidenceDir, conversation) {
  return path.join(evidenceDir, `${conversation.id}.json`);
}

function loadPartialConversation(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Reconstroi o historico no formato da API a partir dos turnos ja gravados. A fala da
// Emma volta como o JSON literal que ela emitiu — e o que o produto tambem faria, e e o
// unico jeito de o modelo enxergar as proprias correcoes anteriores.
function rebuildMessages(systemPrompt, turnosGravados) {
  const messages = [{ role: "system", content: systemPrompt }];
  for (const turno of turnosGravados) {
    messages.push({ role: "user", content: turno.aluno });
    messages.push({ role: "assistant", content: JSON.stringify(turno.resposta) });
  }
  return messages;
}

function buildConversationSystemPrompt(conversation, tone) {
  const scenario = SCENARIOS[conversation.contexto];
  if (!scenario) {
    throw new Error(
      `contexto '${conversation.contexto}' (${conversation.id}) sem cenario correspondente`,
    );
  }
  return buildSystemPrompt({ level: conversation.nivel, scenario, tone });
}

async function processConversation({ conversation, schema, model, tone, apiKey, evidenceDir }) {
  const filePath = conversationEvidencePath(evidenceDir, conversation);
  const systemPrompt = buildConversationSystemPrompt(conversation, tone);
  const anterior = loadPartialConversation(filePath);
  if (anterior?.completa) return { status: "skipped", turnos: anterior.turnos.length };

  const turnos = anterior?.turnos ?? [];
  if (turnos.length > 0) {
    console.log(`  retomando ${conversation.id} a partir do turno ${turnos.length + 1}`);
  }

  const evidence = {
    id: conversation.id,
    missao: conversation.missao,
    contexto: conversation.contexto,
    nivel: conversation.nivel,
    fecha_missao: conversation.fecha_missao,
    modelo: model,
    tom: tone,
    prompt_version: PROMPT_VERSION,
    executado_em: anterior?.executado_em ?? new Date().toISOString(),
    system_prompt: systemPrompt,
    completa: false,
    turnos,
  };

  for (const turno of conversation.turnos.slice(turnos.length)) {
    const messages = rebuildMessages(systemPrompt, turnos);
    messages.push({ role: "user", content: turno.aluno });
    const payload = {
      model,
      messages,
      response_format: { type: "json_schema", json_schema: schema },
      ...AMOSTRAGEM,
    };

    // Mesma politica do caminho por turno: espera e geracao tem orcamentos separados.
    let result;
    let esperas = 0;
    let geracoes = 0;
    for (;;) {
      result = await callModel(payload, apiKey);

      if (result.error === "rate_limit") {
        esperas += 1;
        if (esperas >= MAX_TENTATIVAS) break;
        const espera = Math.max(result.retryAfter, ESPERA_MINIMA) * esperas;
        console.log(
          `  rate limit em ${conversation.id} t${turno.n} (tentativa ${esperas}/${MAX_TENTATIVAS}) — aguardando ${espera}s, turnos anteriores preservados`,
        );
        await wait(espera);
        continue;
      }

      if (result.error === "json_validate_failed") {
        geracoes += 1;
        if (geracoes >= MAX_TENTATIVAS_GERACAO) break;
        console.log(
          `  json_validate_failed em ${conversation.id} t${turno.n} (geracao ${geracoes}/${MAX_TENTATIVAS_GERACAO}) — retry in-process, DEC-20260916-0311`,
        );
        continue;
      }

      break;
    }

    if (result.error) {
      evidence.erro = { turno: turno.n, ...result };
      fs.writeFileSync(filePath, JSON.stringify(evidence, null, 2));
      console.log(`FALHA ${conversation.id} t${turno.n}: ${result.error} · parcial preservada`);
      // Uma conversa e uma SEQUENCIA: perder o turno do meio invalida os seguintes, entao
      // aqui a falha para esta conversa sempre — mas a `runConversas` decide se a RODADA
      // continua nas outras conversas.
      return {
        status: "failed",
        stop: !ERROS_QUE_NAO_ABORTAM.has(result.error),
        turnos: turnos.length,
      };
    }

    const conteudo = result.data?.choices?.[0]?.message?.content ?? "";
    let resposta;
    try {
      resposta = JSON.parse(conteudo);
    } catch {
      evidence.erro = { turno: turno.n, error: "json_invalido", conteudo };
      fs.writeFileSync(filePath, JSON.stringify(evidence, null, 2));
      console.log(`FALHA ${conversation.id} t${turno.n}: resposta nao e JSON · parcial preservada`);
      return { status: "failed", stop: true, turnos: turnos.length };
    }

    turnos.push({
      n: turno.n,
      aluno: turno.aluno,
      espera: turno.espera,
      // O historico ENVIADO neste turno, nao o reconstruido depois: e o que permite
      // auditar o que o modelo tinha em maos quando repetiu uma pergunta.
      mensagens_enviadas: messages,
      resposta,
      usage: result.data?.usage ?? null,
      // Por TURNO, porque uma conversa pode atravessar uma troca de backend: o
      // `system_fingerprint` mudando no meio explica variacao que nao vem do historico.
      amostragem: {
        temperature: payload.temperature ?? null,
        seed: payload.seed ?? null,
        seed_efetivo: result.data?.x_groq?.seed ?? null,
        system_fingerprint: result.data?.system_fingerprint ?? null,
      },
    });
    fs.writeFileSync(filePath, JSON.stringify(evidence, null, 2));
    console.log(
      `ok ${conversation.id} t${turno.n} · ${resposta.next_action}` +
        `${result.limits.remainingTokens ? ` · tokens restantes: ${result.limits.remainingTokens}` : ""}`,
    );
    await throttleByTokenBudget(result.limits);
  }

  evidence.completa = true;
  fs.writeFileSync(filePath, JSON.stringify(evidence, null, 2));
  return { status: "saved", turnos: turnos.length };
}

async function runConversas(schema, options) {
  const todas = loadConversations();
  const conversas = options.conversaId ? todas.filter((c) => c.id === options.conversaId) : todas;
  if (conversas.length === 0) {
    throw new Error(`conversa '${options.conversaId}' nao existe em conversations.jsonl`);
  }
  const evidenceDir = getGroupDir(options.model, "conversas");

  if (options.dryRun) {
    console.log("DRY RUN — nenhuma chamada de API, nenhuma cota gasta");
    let chamadas = 0;
    for (const conversa of conversas) {
      buildConversationSystemPrompt(conversa, options.tone);
      chamadas += conversa.turnos.length;
      console.log(
        `  ${conversa.id.padEnd(15)} missao=${conversa.missao.padEnd(11)} n${conversa.nivel} · ${conversa.turnos.length} turnos · fecha_missao=${conversa.fecha_missao}`,
      );
    }
    console.log(
      `\nconversas: ${conversas.length} · chamadas: ${chamadas} · prompt ${PROMPT_VERSION} · tom ${options.tone}`,
    );
    console.log(
      `custo cresce por turno (historico acumulado): estimativa ${chamadas * TOKENS_POR_TURNO}+ tokens`,
    );
    console.log("\ndry: ok");
    return;
  }

  const apiKey = requireApiKey();
  fs.mkdirSync(evidenceDir, { recursive: true });
  const totals = { saved: 0, skipped: 0, failed: 0 };
  for (const conversa of conversas) {
    const result = await processConversation({
      conversation: conversa,
      schema,
      model: options.model,
      tone: options.tone,
      apiKey,
      evidenceDir,
    });
    totals[result.status] += 1;
    if (result.stop) break;
  }
  console.log(
    `\nconversas: ${totals.saved} gravadas · ${totals.skipped} puladas · ${totals.failed} falhas`,
  );
  console.log(`evidencias em: ${path.relative(PROJECT_ROOT, evidenceDir)}`);
}

// ---------------------------------------------------------------------------
// Self-test do RUNNER (SPEC-20260916-2048-metodologia-de-eval). Nao toca a rede: troca
// `fetchImpl` e `timeoutMs` por dublês. Prova o que a rodada real nao pode provar sem
// queimar orcamento de tokens — que o retry acontece, que o timeout dispara e que a falha
// gravada identifica a celula.
// ---------------------------------------------------------------------------

function respostaFalsa({ status = 200, body = null, headers = {} }) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (nome) => headers[nome] ?? null },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

function turnoValidoFalso() {
  return {
    id: "chatcmpl-fake",
    system_fingerprint: "fp_fake",
    x_groq: { id: "req_fake", seed: 20260916 },
    usage: { total_tokens: 1200, total_time: 0.5, queue_time: 0.1 },
    choices: [{ message: { content: JSON.stringify({ reply_en: "Sure. Small or large?" }) } }],
  };
}

async function runSelfTestRunner() {
  console.log("self-test do runner — nenhuma chamada de rede");
  const os = await import("node:os");
  const falhas = [];
  const checar = (nome, condicao, detalhe = "") => {
    if (condicao) return;
    falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  };

  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
  const record = {
    id: "cafe-01",
    aluno: "I want a coffee please",
    contexto: "cafe",
    nivel_esperado: 2,
    tipo_erro: "register",
    deve_corrigir: ["I want"],
  };
  const fetchOriginal = fetchImpl;
  const timeoutOriginal = timeoutMs;
  const amostragemOriginal = { ...AMOSTRAGEM };

  try {
    // --- classificacao de falha -------------------------------------------------
    fetchImpl = async () =>
      respostaFalsa({
        status: 400,
        body: {
          error: { code: "json_validate_failed", failed_generation: "{ nao fecha" },
        },
      });
    let r = await callModel({ model: "x" }, "chave-falsa");
    checar(
      "400 com code json_validate_failed vira json_validate_failed",
      r.error === "json_validate_failed",
      `veio ${r.error}`,
    );

    fetchImpl = async () =>
      respostaFalsa({ status: 400, body: { error: { code: "model_decommissioned" } } });
    r = await callModel({ model: "x" }, "chave-falsa");
    checar("400 de outra causa continua HTTP 400", r.error === "HTTP 400", `veio ${r.error}`);

    fetchImpl = async () => respostaFalsa({ status: 429, headers: { "retry-after": "4" } });
    r = await callModel({ model: "x" }, "chave-falsa");
    checar("429 vira rate_limit", r.error === "rate_limit", `veio ${r.error}`);
    checar("rate_limit preserva retry-after", r.retryAfter === 4, `veio ${r.retryAfter}`);

    // --- timeout: a rodada NAO trava -------------------------------------------
    // O dublê honra o signal e nunca resolve por conta propria. Se o timeout nao
    // disparasse, este teste penduraria — que e exatamente a falha de ~15 minutos que a
    // SPEC descreve. O relogio ao redor prova que nao pendurou.
    timeoutMs = 60;
    fetchImpl = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason));
      });
    // `AbortSignal.timeout` usa timer UNREF: sozinho ele nao segura o event loop. Em
    // producao quem segura e o socket aberto do `fetch`, entao o timeout dispara e aborta.
    // Com um dublê que apenas espera o abort, nao ha handle nenhum: o node esvazia a fila e
    // sai com codigo 0 ANTES dos 60ms, em silencio. Este timer ref'd existe so para o
    // self-test poder OBSERVAR o timeout acontecer — descoberto na marra nesta SPEC.
    const seguraLoop = setTimeout(() => {}, 5000);
    const t0 = Date.now();
    r = await callModel({ model: "x" }, "chave-falsa");
    const decorrido = Date.now() - t0;
    clearTimeout(seguraLoop);
    checar("conexao pendurada vira timeout", r.error === "timeout", `veio ${r.error}`);
    checar("timeout registra o limite usado", r.timeout_ms === 60, `veio ${r.timeout_ms}`);
    checar(
      "timeout devolve em menos de 1s com limite de 60ms",
      decorrido < 1000,
      `levou ${decorrido}ms`,
    );
    timeoutMs = timeoutOriginal;

    // --- retry de geracao recupera, e a falha fica gravada ----------------------
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emma-selftest-"));
    let chamadas = 0;
    // Os headers de rate limit vao no dublê porque o Groq SEMPRE os manda: sem eles,
    // `throttleByTokenBudget` le `Number(null)` como 0 e dorme 20s por turno. Ver a
    // [nota] no journal desta SPEC — e comportamento a endurecer, mas fora do escopo aqui.
    const headersDeCota = {
      "x-ratelimit-remaining-requests": "900",
      "x-ratelimit-remaining-tokens": "50000",
    };
    fetchImpl = async () => {
      chamadas += 1;
      if (chamadas <= 2) {
        return respostaFalsa({
          status: 400,
          body: { error: { code: "json_validate_failed" } },
          headers: headersDeCota,
        });
      }
      return respostaFalsa({
        status: 200,
        body: turnoValidoFalso(),
        headers: headersDeCota,
      });
    };
    const resultado = await processRecord({
      record,
      schema,
      model: "openai/gpt-oss-20b",
      tone: "direta",
      apiKey: "chave-falsa",
      evidenceDir: dir,
      level: 4,
      nome: "cafe-01-n4-direta",
    });
    checar(
      "retry recupera e grava sucesso",
      resultado.status === "saved",
      `veio ${resultado.status}`,
    );
    checar("recuperou na terceira geracao", chamadas === 3, `foram ${chamadas} chamadas`);

    const falhasGravadas = fs.existsSync(path.join(dir, "_failures"))
      ? fs.readdirSync(path.join(dir, "_failures"))
      : [];
    checar(
      "as 2 falhas recuperadas NAO foram apagadas",
      falhasGravadas.length === 2,
      `gravadas ${falhasGravadas.length}`,
    );
    checar(
      "o nome da falha carrega a CELULA, nao so a fala",
      falhasGravadas.every((n) => n.startsWith("cafe-01-n4-direta-")),
      falhasGravadas.join(", "),
    );
    if (falhasGravadas.length > 0) {
      const falha = JSON.parse(
        fs.readFileSync(path.join(dir, "_failures", falhasGravadas[0]), "utf8"),
      );
      checar(
        "a falha grava a celula em campo proprio",
        falha.celula === "cafe-01-n4-direta",
        falha.celula,
      );
      checar("a falha grava o nivel efetivo", falha.nivel === 4, String(falha.nivel));
      checar(
        "a falha grava a amostragem",
        falha.amostragem?.temperature === AMOSTRAGEM.temperature &&
          falha.amostragem?.seed === AMOSTRAGEM.seed,
        JSON.stringify(falha.amostragem),
      );
    }

    // --- amostragem no payload e na evidencia ----------------------------------
    // O nome do arquivo de SUCESSO tambem e o da celula, nao o da fala.
    const sucesso = JSON.parse(fs.readFileSync(path.join(dir, "cafe-01-n4-direta.json"), "utf8"));
    checar(
      "o payload gravado carrega temperature e seed",
      sucesso.payload?.temperature === AMOSTRAGEM.temperature &&
        sucesso.payload?.seed === AMOSTRAGEM.seed,
      JSON.stringify({ t: sucesso.payload?.temperature, s: sucesso.payload?.seed }),
    );
    checar(
      "a evidencia grava a amostragem pedida",
      sucesso.amostragem?.seed === AMOSTRAGEM.seed,
      JSON.stringify(sucesso.amostragem),
    );
    checar(
      "a evidencia grava o seed EFETIVO devolvido pelo Groq",
      sucesso.amostragem?.seed_efetivo === 20260916,
      String(sucesso.amostragem?.seed_efetivo),
    );
    checar(
      "a evidencia grava o system_fingerprint",
      sucesso.amostragem?.system_fingerprint === "fp_fake",
      String(sucesso.amostragem?.system_fingerprint),
    );
    fs.rmSync(dir, { recursive: true, force: true });

    // --- validacao dos parametros ----------------------------------------------
    const recusa = (opcoes) => {
      try {
        configurarAmostragem({ temperature: 1, seed: 1, ...opcoes });
        return false;
      } catch {
        return true;
      }
    };
    checar("temperature acima de 2 e recusada", recusa({ temperature: 2.5 }));
    checar("temperature negativa e recusada", recusa({ temperature: -1 }));
    checar("seed fracionario e recusado", recusa({ seed: 1.5 }));
  } finally {
    fetchImpl = fetchOriginal;
    timeoutMs = timeoutOriginal;
    AMOSTRAGEM = amostragemOriginal;
  }

  for (const falha of falhas) console.error(`FALHA: ${falha}`);
  console.log(
    `\nself-test do runner: ${falhas.length} falha(s) · timeout derivado ${TIMEOUT_MS}ms · amostragem padrao temperature=${AMOSTRAGEM_PADRAO.temperature} seed=${AMOSTRAGEM_PADRAO.seed}`,
  );
  if (falhas.length === 0) {
    console.log(
      "retry, timeout, nome de celula e gravacao de amostragem se comportam como especificado.",
    );
  }
  // `process.exitCode` em vez de `process.exit`: com stdout em pipe no Windows, o exit
  // imediato trunca o que ainda nao foi drenado — e um self-test que nao imprime nada nao
  // serve para nada.
  process.exitCode = falhas.length > 0 ? 1 : 0;
}

async function main() {
  const options = parseArguments();
  if (options.selfTest) return runSelfTestRunner();
  configurarAmostragem(options);
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
  const dataset = loadDataset();
  if (options.conversa) return runConversas(schema, options);
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

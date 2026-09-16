#!/usr/bin/env node
// Runs the versioned dataset against Groq and preserves every successful or failed attempt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(CURRENT_DIR, "..", "..");
const DATASET_PATH = path.join(CURRENT_DIR, "dataset.jsonl");
const SCHEMA_PATH = path.join(CURRENT_DIR, "turn-schema.json");
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
    'Onde cada coisa vai, em tres vias. (a) ATRAPALHA a comunicacao ou soa errado a um falante nativo: registre um item em corrections. (b) COMUNICA, mas revela um padrao sistematico de quem fala portugues — decalque ("do a check-in" em vez de "check in", "I have 25 years", "I am with hunger"), falso cognato ("pretend", "actually", "doubt"), estrutura ("people is", pergunta sem auxiliar) ou uso que soa rispido no contexto ("I want a coffee" num balcao): corrija TAMBEM, porque o aluno repetiria o padrao. (c) COMUNICA BEM e nao ha padrao por tras, e apenas uma forma mais idiomatica entre varias possiveis: deixe corrections vazio e ofereca em suggestion_en. Uma frase curta que resolve a situacao ("Coffee.", "Two coffees, please.") nao e erro: nao corrija.',
    "Cada item de corrections exige EVIDENCIA: o campo original recebe o trecho LITERAL da fala do aluno, copiado palavra por palavra, sem parafrasear e sem reescrever. Se voce nao consegue copiar o trecho exato, entao nao ha correcao a fazer. Classifique cada item em category: grammar, vocabulary, word_order, preposition, false_friend ou register.",
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

function buildPayload(record, schema, model, tone) {
  const scenario = SCENARIOS[record.contexto];
  return {
    model,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt({ level: record.nivel_esperado, scenario, tone }),
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

function saveSuccess(filePath, record, model, tone, payload, result) {
  const evidence = {
    id: record.id,
    modelo: model,
    tom: tone,
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

async function processRecord({ record, schema, model, tone, apiKey, evidenceDir }) {
  const filePath = path.join(evidenceDir, `${record.id}.json`);
  if (fs.existsSync(filePath)) return { status: "skipped" };
  const payload = buildPayload(record, schema, model, tone);
  let result = await callModel(payload, apiKey);
  if (result.error === "rate_limit") {
    saveFailure(evidenceDir, record, model, tone, payload, result);
    console.log(`  rate limit — aguardando ${result.retryAfter}s (progresso preservado)`);
    await wait(result.retryAfter);
    result = await callModel(payload, apiKey);
  }
  if (result.error) {
    const failurePath = saveFailure(evidenceDir, record, model, tone, payload, result);
    console.log(
      `FALHA ${record.id}: ${result.error} · salva em ${path.relative(PROJECT_ROOT, failurePath)}`,
    );
    return { status: "failed", stop: result.error === "rate_limit" };
  }
  saveSuccess(filePath, record, model, tone, payload, result);
  console.log(
    `ok ${record.id}${result.limits.remainingRequests ? ` · req restantes: ${result.limits.remainingRequests}` : ""}`,
  );
  return { status: "saved" };
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
  const records = options.limit ? dataset.slice(0, options.limit) : dataset;
  if (options.dryRun) printDryRun(records, schema, options.model, options.tone);
  else await runRequests(records, schema, options);
}

main().catch((error) => {
  console.error(`erro: ${error.message}`);
  process.exit(1);
});

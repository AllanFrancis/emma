#!/usr/bin/env node
// Runs the mechanical dialogue-quality checks and prints the comparison table.
// Subjective criteria remain a human decision documented in the report.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateTurn, validateEvidence } from "./turn-validator.mjs";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(CURRENT_DIR, "..", "..");
const DATASET_PATH = path.join(CURRENT_DIR, "dataset.jsonl");
const SCHEMA_PATH = path.join(CURRENT_DIR, "turn-schema.json");
const TURN_SCHEMA = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const WORD_LIMIT_BY_LEVEL = { 1: 15, 2: 18, 3: 26, 4: 36, 5: 48 };
const METALANGUAGE_PATTERN =
  /\b(grammar|grammatical|mistake|error|correction|conjugat|tense|verb form)\b/i;
const PORTUGUESE_PATTERN =
  /\b(que|nao|não|seu|sua|deseja|dizendo|diga|fazer|frase|mais|uma|para|com|responda|pergunte|agora|voce|você|isso|porque|quando|em vez de|do|da|dos|das|no|na|pedido|tamanho|conte|escolha|use o|repita)\b/gi;
const ENGLISH_PATTERN =
  /\b(the|your|you|verb|before|subject|word|order|sentence|answer|say|tell|ask|instead|question)\b/gi;

function isPortuguese(text) {
  if (typeof text !== "string" || text.trim() === "") return false;
  if (/[áàâãéêíóôõúç]/i.test(text)) return true;
  const portugueseMatches = (text.match(PORTUGUESE_PATTERN) ?? []).length;
  const englishMatches = (text.match(ENGLISH_PATTERN) ?? []).length;
  return portugueseMatches >= 2 || (portugueseMatches >= 1 && englishMatches === 0);
}

function countWords(text) {
  return typeof text === "string" ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

// Contrato v2: correcao e array de objeto, entao o teto de 3 e contagem EXATA.
// O contrato v1 media isso contando "em vez de" na prosa e devolvia Infinity quando
// nao reconhecia o formato — ou seja, reprovava turno bem corrigido em prosa livre.
function countCorrections(turn) {
  return Array.isArray(turn?.corrections) ? turn.corrections.length : Number.POSITIVE_INFINITY;
}

const CHECKS = [
  {
    id: "C1",
    name: "contrato valido contra o JSON Schema",
    criterion: "base — sem isso nada mais e mensuravel",
    check: (turn) => validateTurn(turn, TURN_SCHEMA).length === 0,
  },
  {
    id: "C2",
    name: "termina com pergunta",
    criterion: "faz a pessoa continuar falando ingles",
    check: (turn) => typeof turn.reply_en === "string" && turn.reply_en.trim().endsWith("?"),
  },
  {
    id: "C3",
    name: "teto de 3 correcoes",
    criterion: "corrige somente o que importa",
    check: (turn) => countCorrections(turn) <= 3,
  },
  {
    id: "C4",
    name: "nao corrige caso de controle",
    criterion: "nao vira aula de gramatica",
    check: (turn, record) => (record.tipo_erro !== "nenhum" ? null : countCorrections(turn) === 0),
  },
  {
    id: "C5",
    name: "corrige quando ha o que corrigir",
    criterion: "ensina de fato",
    check: (turn, record) =>
      record.deve_corrigir.length === 0
        ? null
        : Array.isArray(turn.corrections) && turn.corrections.length > 0,
  },
  {
    id: "C6",
    name: "instrucao presente",
    criterion: "diz o que fazer agora",
    check: (turn) => typeof turn.instruction_pt === "string" && turn.instruction_pt.trim() !== "",
  },
  {
    id: "C7",
    name: "instrucao em portugues",
    criterion: "explica em portugues quando necessario",
    check: (turn) => isPortuguese(turn.instruction_pt ?? ""),
  },
  {
    id: "C8",
    name: "comprimento compativel com o nivel",
    criterion: "adapta a dificuldade",
    check: (turn, record) =>
      countWords(turn.reply_en) <= WORD_LIMIT_BY_LEVEL[record.nivel_esperado],
  },
  {
    id: "C9",
    name: "sem metalinguagem na fala em ingles",
    criterion: "ensina sem soar artificial",
    check: (turn) => !METALANGUAGE_PATTERN.test(turn.reply_en ?? ""),
  },
  {
    id: "C10",
    name: "oferece resposta modelo",
    criterion: "destrava quem nao sabe o que dizer",
    check: (turn) => typeof turn.suggestion_en === "string" && turn.suggestion_en.trim() !== "",
  },
  {
    id: "C11",
    name: "correcao cita evidencia literal",
    criterion: "correcao auditavel — nao vale parafrasear a fala do aluno",
    check: (turn, record) =>
      countCorrections(turn) === 0 ? null : validateEvidence(turn, record.aluno).length === 0,
  },
  {
    id: "C12",
    name: "next_action coerente com o caso",
    criterion: "nao cobra repeticao de quem nao errou",
    check: (turn, record) => (record.tipo_erro !== "nenhum" ? null : turn.next_action !== "retry"),
  },
];

function evaluateTurn(turn, record) {
  const result = {};
  for (const check of CHECKS) {
    try {
      result[check.id] = check.check(turn, record);
    } catch {
      result[check.id] = false;
    }
  }
  return result;
}

function loadDataset() {
  const records = new Map();
  const lines = fs.readFileSync(DATASET_PATH, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const record = JSON.parse(line);
    records.set(record.id, record);
  }
  return records;
}

// A fala de referencia do self-test; a evidencia das correcoes tem de sair daqui.
const FIXTURE_UTTERANCE = "I want a coffee please";

function createCorrection(overrides = {}) {
  return {
    original: "I want a coffee",
    suggested: "I'd like a coffee",
    explanation_pt: "Num pedido, 'I'd like' soa mais natural do que 'I want'.",
    category: "register",
    ...overrides,
  };
}

function createFixture(overrides = {}) {
  return {
    reply_en: "Nice choice! Small or large?",
    reply_pt: "Boa escolha! Pequeno ou grande?",
    instruction_pt: "Agora diga o tamanho que você quer.",
    corrections: [createCorrection()],
    suggestion_en: "A small one, please.",
    suggestion_pt: "Um pequeno, por favor.",
    words: ["I'd like"],
    focus: "pedidos com I'd like",
    next_action: "retry",
    ...overrides,
  };
}

function buildSelfTestCases() {
  const errorRecord = {
    tipo_erro: "gramatical",
    deve_corrigir: ["x"],
    nivel_esperado: 2,
    aluno: FIXTURE_UTTERANCE,
  };
  const controlRecord = {
    tipo_erro: "nenhum",
    deve_corrigir: [],
    nivel_esperado: 3,
    aluno: FIXTURE_UTTERANCE,
  };
  return [
    {
      name: "valid turn",
      turn: createFixture(),
      record: errorRecord,
      expected: { C1: true, C3: true, C11: true },
    },
    {
      name: "missing field",
      turn: { reply_en: "Hi?" },
      record: errorRecord,
      expected: { C1: false },
    },
    {
      name: "wrong type",
      turn: createFixture({ words: "coffee" }),
      record: errorRecord,
      expected: { C1: false },
    },
    {
      name: "extra field",
      turn: createFixture({ extra: true }),
      record: errorRecord,
      expected: { C1: false },
    },
    {
      name: "too many words",
      turn: createFixture({ words: ["a", "b", "c", "d"] }),
      record: errorRecord,
      expected: { C1: false },
    },
    {
      name: "contrato v1 (correction_pt) nao passa mais",
      turn: createFixture({ correction_pt: "Em vez de X, diga Y" }),
      record: errorRecord,
      expected: { C1: false },
    },
    {
      name: "four corrections",
      turn: createFixture({ corrections: Array.from({ length: 4 }, () => createCorrection()) }),
      record: errorRecord,
      expected: { C1: false, C3: false },
    },
    {
      name: "corrections ausente",
      turn: createFixture({ corrections: undefined }),
      record: errorRecord,
      expected: { C3: false, C5: false },
    },
    {
      name: "categoria fora do enum",
      turn: createFixture({ corrections: [createCorrection({ category: "spelling" })] }),
      record: errorRecord,
      expected: { C1: false },
    },
    {
      name: "next_action fora do enum",
      turn: createFixture({ next_action: "advance" }),
      record: errorRecord,
      expected: { C1: false },
    },
    {
      name: "control without correction",
      turn: createFixture({ corrections: [], next_action: "reply" }),
      record: controlRecord,
      expected: { C4: true, C5: null, C11: null, C12: true },
    },
    {
      name: "control with correction",
      turn: createFixture(),
      record: controlRecord,
      expected: { C4: false },
    },
    {
      name: "control cobrando repeticao",
      turn: createFixture({ corrections: [], next_action: "retry" }),
      record: controlRecord,
      expected: { C12: false },
    },
    {
      name: "evidencia parafraseada",
      turn: createFixture({ corrections: [createCorrection({ original: "I desire a coffee" })] }),
      record: errorRecord,
      expected: { C1: true, C11: false },
    },
    {
      name: "evidencia com maiuscula e pontuacao",
      turn: createFixture({ corrections: [createCorrection({ original: "I WANT a coffee." })] }),
      record: errorRecord,
      expected: { C11: true },
    },
  ];
}

function runSelfTest() {
  const cases = buildSelfTestCases();
  let failures = 0;
  for (const testCase of cases) {
    const actual = evaluateTurn(testCase.turn, testCase.record);
    for (const [checkId, expected] of Object.entries(testCase.expected)) {
      if (actual[checkId] === expected) continue;
      failures += 1;
      console.log(
        `FALHA ${testCase.name} · ${checkId}: esperado ${expected}, obtido ${actual[checkId]}`,
      );
    }
  }
  console.log(
    `\nself-test: ${cases.length} casos · ${CHECKS.length} checagens · ${failures} falha(s)`,
  );
  if (failures === 0) console.log("as checagens mecanicas se comportam como especificado.");
  process.exit(failures > 0 ? 1 : 0);
}

function findEvidenceTargets() {
  const activeDir = path.join(PROJECT_ROOT, "docs", "active");
  if (!fs.existsSync(activeDir)) return [];
  const targets = [];
  for (const spec of fs.readdirSync(activeDir).filter((name) => name.startsWith("SPEC-"))) {
    const evidenceDir = path.join(activeDir, spec, "evidence");
    if (!fs.existsSync(evidenceDir)) continue;
    for (const model of fs.readdirSync(evidenceDir).filter((name) => !name.startsWith("_"))) {
      const modelDir = path.join(evidenceDir, model);
      if (fs.statSync(modelDir).isDirectory()) targets.push({ model, modelDir });
    }
  }
  return targets;
}

function extractTurn(rawEvidence) {
  const content = rawEvidence?.resposta?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function gradeModel(target, dataset) {
  const files = fs.readdirSync(target.modelDir).filter((name) => name.endsWith(".json"));
  const counts = {};
  let unreadable = 0;
  for (const file of files) {
    const rawEvidence = JSON.parse(fs.readFileSync(path.join(target.modelDir, file), "utf8"));
    const record = dataset.get(rawEvidence.id);
    const turn = extractTurn(rawEvidence);
    if (!turn || !record) {
      unreadable += 1;
      continue;
    }
    for (const [checkId, passed] of Object.entries(evaluateTurn(turn, record))) {
      if (passed === null) continue;
      counts[checkId] ??= { passed: 0, total: 0 };
      counts[checkId].total += 1;
      if (passed) counts[checkId].passed += 1;
    }
  }
  return { model: target.model, sampleSize: files.length, unreadable, counts };
}

function printRows(rows) {
  const modelWidth = Math.max(...rows.map((row) => row.model.length), 6);
  const header = [
    "modelo".padEnd(modelWidth),
    "n",
    ...CHECKS.map((check) => check.id.padStart(4)),
  ].join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));
  for (const row of rows) {
    const cells = CHECKS.map((check) => {
      const count = row.counts[check.id];
      if (!count || count.total === 0) return "   —";
      return `${Math.round((count.passed / count.total) * 100)}%`.padStart(4);
    });
    console.log(
      [row.model.padEnd(modelWidth), String(row.sampleSize).padStart(2), ...cells].join(" | "),
    );
  }
}

function printLegend(rows) {
  console.log("\nlegenda:");
  for (const check of CHECKS)
    console.log(`  ${check.id.padEnd(4)} ${check.name} — ${check.criterion}`);
  const unreadableRows = rows.filter((row) => row.unreadable > 0);
  if (unreadableRows.length > 0) {
    console.log("\nrespostas ilegiveis (fora do contrato):");
    for (const row of unreadableRows) console.log(`  ${row.model}: ${row.unreadable}`);
  }
  console.log("\nESTA TABELA NAO APROVA MODELO. Ela filtra quem nao atende o minimo mecanico.");
  console.log(
    "Os criterios subjetivos exigem leitura humana das evidencias antes da recomendacao.",
  );
}

function printTable() {
  const targets = findEvidenceTargets();
  if (targets.length === 0) {
    console.log("nenhuma evidencia gravada ainda.");
    console.log("rode: node scripts/eval/run.mjs --model <id> (com GROQ_API_KEY no ambiente)");
    return;
  }
  const dataset = loadDataset();
  const rows = targets.map((target) => gradeModel(target, dataset));
  printRows(rows);
  printLegend(rows);
}

// Gate da rodada real: existe evidencia suficiente e TODO turno gravado respeita o
// contrato v2, incluindo a evidencia citada. Sai diferente de zero se faltar rodada —
// o gate diz a verdade sobre o que ainda nao foi medido.
const MINIMO_TURNOS = 40;

function assertContract() {
  const targets = findEvidenceTargets();
  if (targets.length === 0) {
    console.log("ERRO  nenhuma evidencia gravada — a rodada real ainda nao aconteceu.");
    console.log("rode: GROQ_API_KEY=<chave> node scripts/eval/run.mjs --model openai/gpt-oss-20b");
    process.exit(1);
  }

  const dataset = loadDataset();
  let problemas = 0;

  for (const target of targets) {
    const files = fs.readdirSync(target.modelDir).filter((name) => name.endsWith(".json"));
    let contratoInvalido = 0;
    let semEvidencia = 0;
    let semRegistro = 0;

    for (const file of files) {
      const rawEvidence = JSON.parse(fs.readFileSync(path.join(target.modelDir, file), "utf8"));
      const record = dataset.get(rawEvidence.id);
      const turn = extractTurn(rawEvidence);
      if (!record) {
        semRegistro += 1;
        continue;
      }
      if (!turn || validateTurn(turn, TURN_SCHEMA).length > 0) {
        contratoInvalido += 1;
        continue;
      }
      if (validateEvidence(turn, record.aluno).length > 0) semEvidencia += 1;
    }

    // Falha de rate limit e transitoria: o teto de tokens do tier gratuito nao diz nada
    // sobre o contrato, e conta-la como falha de contrato travaria o criterio para sempre.
    // Falha de CONTRATO (json_validate_failed, HTTP 4xx do schema) e outra historia.
    const failuresDir = path.join(target.modelDir, "_failures");
    let falhasDeContrato = 0;
    let falhasTransitorias = 0;
    if (fs.existsSync(failuresDir)) {
      for (const name of fs.readdirSync(failuresDir).filter((f) => f.endsWith(".json"))) {
        const registro = JSON.parse(fs.readFileSync(path.join(failuresDir, name), "utf8"));
        if (registro?.erro?.error === "rate_limit") falhasTransitorias += 1;
        else falhasDeContrato += 1;
      }
    }

    const linha = [
      `${target.model}: ${files.length} turnos`,
      `contrato invalido=${contratoInvalido}`,
      `sem evidencia=${semEvidencia}`,
      `falhas de contrato=${falhasDeContrato}`,
    ].join(" · ");

    const reprovou =
      files.length < MINIMO_TURNOS ||
      contratoInvalido > 0 ||
      semEvidencia > 0 ||
      falhasDeContrato > 0 ||
      semRegistro > 0;
    console.log(`${reprovou ? "ERRO  " : "ok    "}${linha}`);
    if (falhasTransitorias > 0) {
      console.log(
        `      ${falhasTransitorias} falha(s) de rate limit ignorada(s) — transitoria, nao e falha de contrato`,
      );
    }
    if (files.length < MINIMO_TURNOS) {
      console.log(
        `      apenas ${files.length} turnos — o criterio exige ao menos ${MINIMO_TURNOS}`,
      );
    }
    if (semRegistro > 0) {
      console.log(`      ${semRegistro} evidencia(s) sem fala correspondente no dataset`);
    }
    if (reprovou) problemas += 1;
  }

  console.log(
    `\nassert-contract: ${targets.length} modelo(s) · ${problemas} reprovado(s) sob o contrato v2`,
  );
  process.exit(problemas > 0 ? 1 : 0);
}

if (process.argv.includes("--self-test")) runSelfTest();
else if (process.argv.includes("--assert-contract")) assertContract();
else printTable();

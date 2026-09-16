#!/usr/bin/env node
// Runs the mechanical dialogue-quality checks and prints the comparison table.
// Subjective criteria remain a human decision documented in the report.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateTurn } from "./turn-validator.mjs";

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

function countCorrections(text) {
  if (typeof text !== "string" || text.trim() === "") return 0;
  const markers = text.match(/\bem vez de\b/gi) ?? [];
  return markers.length > 0 ? markers.length : Number.POSITIVE_INFINITY;
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
    check: (turn) => countCorrections(turn.correction_pt) <= 3,
  },
  {
    id: "C4",
    name: "nao corrige caso de controle",
    criterion: "nao vira aula de gramatica",
    check: (turn, record) =>
      record.tipo_erro !== "nenhum" ? null : (turn.correction_pt ?? "").trim() === "",
  },
  {
    id: "C5",
    name: "corrige quando ha o que corrigir",
    criterion: "ensina de fato",
    check: (turn, record) =>
      record.deve_corrigir.length === 0 ? null : (turn.correction_pt ?? "").trim() !== "",
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

function createFixture(overrides = {}) {
  return {
    reply_en: "Nice choice! Small or large?",
    reply_pt: "Boa escolha! Pequeno ou grande?",
    instruction_pt: "Agora diga o tamanho que você quer.",
    correction_pt: "Em vez de X, diga Y — soa mais natural.",
    suggestion_en: "A small one, please.",
    suggestion_pt: "Um pequeno, por favor.",
    words: ["I'd like"],
    focus: "pedidos com I'd like",
    ...overrides,
  };
}

function buildSelfTestCases() {
  const errorRecord = { tipo_erro: "gramatical", deve_corrigir: ["x"], nivel_esperado: 2 };
  const controlRecord = { tipo_erro: "nenhum", deve_corrigir: [], nivel_esperado: 3 };
  return [
    {
      name: "valid turn",
      turn: createFixture(),
      record: errorRecord,
      expected: { C1: true, C3: true },
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
      name: "four corrections",
      turn: createFixture({
        correction_pt:
          "Em vez de A, diga B. Em vez de C, diga D. Em vez de E, diga F. Em vez de G, diga H.",
      }),
      record: errorRecord,
      expected: { C3: false },
    },
    {
      name: "unstructured corrections",
      turn: createFixture({ correction_pt: "Corrija A. Corrija B. Corrija C. Corrija D." }),
      record: errorRecord,
      expected: { C3: false },
    },
    {
      name: "control without correction",
      turn: createFixture({ correction_pt: "" }),
      record: controlRecord,
      expected: { C4: true, C5: null },
    },
    {
      name: "control with correction",
      turn: createFixture(),
      record: controlRecord,
      expected: { C4: false },
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

if (process.argv.includes("--self-test")) runSelfTest();
else printTable();

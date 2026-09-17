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
// A segunda metade de cada lista foi calibrada contra as 33 explicacoes reais da rodada
// de 2026-09-16: explicacao de correcao e curta ("Use 'on' depois de 'depends'.") e cita
// palavras em ingles entre aspas, entao os marcadores genericos de conversa nao bastam.
// Cuidado deliberado: "use" fica FORA da lista inglesa, porque em portugues o imperativo
// "Use" abre quase toda explicacao; e `\bverb\b` nao casa "verbo", `\bpast\b` nao casa
// "passado".
const PORTUGUESE_PATTERN =
  /\b(que|nao|não|seu|sua|deseja|dizendo|diga|fazer|frase|mais|uma|para|com|responda|pergunte|agora|voce|você|isso|porque|quando|em vez de|do|da|dos|das|no|na|pedido|tamanho|conte|escolha|use o|repita|sem|antes|depois|como|deve|vir|verbo|pronome|sujeito|artigo|artigos|plural|singular|usamos|podemos|adicione|omitir|troque|coloque|soa|natural|forma|passado|presente)\b/gi;
const ENGLISH_PATTERN =
  /\b(the|your|you|verb|before|subject|word|order|sentence|answer|say|tell|ask|instead|question|without|uncountable|countable|noun|article|continuous|started|continues|past|present)\b/gi;

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
  {
    id: "C13",
    name: "explicacao da correcao em portugues",
    criterion: "explica em portugues quando necessario — o campo se chama explanation_pt",
    check: (turn) =>
      countCorrections(turn) === 0 || !Array.isArray(turn.corrections)
        ? null
        : turn.corrections.every((c) => isPortuguese(c?.explanation_pt ?? "")),
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
    // Os tres casos abaixo sao literais da rodada de 2026-09-16: explicacao curta em
    // portugues que cita palavra inglesa entre aspas TEM de passar, e explicacao em
    // ingles TEM de reprovar. Sem esse par, C13 vira ou peneira furada ou falso alarme.
    {
      name: "explicacao curta em portugues citando ingles",
      turn: createFixture({
        corrections: [createCorrection({ explanation_pt: "Use 'on' depois de 'depends'." })],
      }),
      record: errorRecord,
      expected: { C13: true },
    },
    {
      name: "explicacao em ingles reprova",
      turn: createFixture({
        corrections: [createCorrection({ explanation_pt: "Use 'am' instead of 'have' for age." })],
      }),
      record: errorRecord,
      expected: { C13: false },
    },
    {
      name: "explicacao em ingles com metalinguagem reprova",
      turn: createFixture({
        corrections: [
          createCorrection({
            explanation_pt:
              "Use present perfect continuous for an action that started in the past.",
          }),
        ],
      }),
      record: errorRecord,
      expected: { C13: false },
    },
    {
      name: "sem correcao, C13 nao se aplica",
      turn: createFixture({ corrections: [], next_action: "reply" }),
      record: controlRecord,
      expected: { C13: null },
    },
  ];
}

// Casos da matriz: um comparador que nunca acusa nada passa em qualquer rodada e nao
// protege nada. Estes casos provam que ele acusa o que deve e SILENCIA no que e legitimo —
// em particular, correcao diferente entre NIVEIS e adaptacao correta, nao violacao.
function buildMatrizTestCases() {
  const celula = (nivel, tom, turn) => ({ nivel, tom, turn });
  const comCorrecao = (over = {}) => createFixture(over);
  const semCorrecao = (reply) =>
    createFixture({ corrections: [], next_action: "reply", reply_en: reply });

  return [
    {
      name: "mesma correcao nos dois tons, falas diferentes",
      celulas: [
        celula(1, "tranquila", comCorrecao({ reply_en: "Nice! Small or large?" })),
        celula(1, "direta", comCorrecao({ reply_en: "Got it. Which size?" })),
      ],
      invariancia: 0,
      diferenca: 0,
      teto: 0,
    },
    {
      name: "tom direto corrige DIFERENTE — viola invariancia",
      celulas: [
        celula(1, "tranquila", comCorrecao()),
        celula(
          1,
          "direta",
          comCorrecao({
            corrections: [createCorrection({ suggested: "Could I have a coffee" })],
            reply_en: "Which size?",
          }),
        ),
      ],
      invariancia: 1,
      diferenca: 0,
      teto: 0,
    },
    {
      name: "tom direto corrige MAIS — viola teto e invariancia",
      celulas: [
        celula(1, "tranquila", comCorrecao({ reply_en: "Nice! Small or large?" })),
        celula(
          1,
          "direta",
          comCorrecao({
            corrections: [createCorrection(), createCorrection({ category: "grammar" })],
            reply_en: "Size?",
          }),
        ),
      ],
      invariancia: 1,
      diferenca: 0,
      teto: 1,
    },
    {
      name: "reply_en identico entre tons — personalidade decorativa",
      celulas: [
        celula(1, "tranquila", comCorrecao({ reply_en: "Small or large?" })),
        celula(1, "direta", comCorrecao({ reply_en: "Small or large?" })),
      ],
      invariancia: 0,
      diferenca: 1,
      teto: 0,
    },
    {
      name: "identico so em caixa e espaco ainda e identico",
      celulas: [
        celula(1, "tranquila", comCorrecao({ reply_en: "Small or large?" })),
        celula(1, "direta", comCorrecao({ reply_en: "  SMALL OR   LARGE? " })),
      ],
      invariancia: 0,
      diferenca: 1,
      teto: 0,
    },
    {
      name: "correcao diferente entre NIVEIS e legitima, nao violacao",
      celulas: [
        celula(1, "tranquila", semCorrecao("Nice! Small or large?")),
        celula(1, "direta", semCorrecao("Got it. Which size?")),
        celula(4, "tranquila", comCorrecao({ reply_en: "Sure. What size would you like?" })),
        celula(4, "direta", comCorrecao({ reply_en: "Which size?" })),
      ],
      invariancia: 0,
      diferenca: 0,
      teto: 0,
    },
    {
      name: "controle em ambos os tons, sem correcao nenhuma",
      celulas: [
        celula(4, "tranquila", semCorrecao("That sounds great. What did you do?")),
        celula(4, "direta", semCorrecao("Nice. And what did you do?")),
      ],
      invariancia: 0,
      diferenca: 0,
      teto: 0,
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

  // Um caso de teste por linha da tabela de semantica do main.md. Sem eles, a mudanca do
  // gate seria indistinguivel de uma flexibilizacao feita depois de ver o resultado.
  const geracaoCases = [
    {
      nome: "valida na 1a tentativa",
      entrada: { id: "a", falhasDeContrato: 0, temEvidenciaValida: true },
      classe: "valid_first_attempt",
      reprova: false,
    },
    {
      nome: "json_validate_failed + retry bem-sucedido",
      entrada: { id: "b", falhasDeContrato: 1, temEvidenciaValida: true },
      classe: "recovered_after_retry",
      reprova: false,
    },
    {
      nome: "varias falhas mas recuperada dentro do teto",
      entrada: { id: "c", falhasDeContrato: 6, temEvidenciaValida: true },
      classe: "recovered_after_retry",
      reprova: false,
    },
    {
      nome: "retries esgotados sem resposta valida",
      entrada: { id: "d", falhasDeContrato: 6, temEvidenciaValida: false },
      classe: "unrecovered_contract_failure",
      reprova: true,
    },
    {
      nome: "erro de contrato nao recuperavel (1 falha, sem evidencia)",
      entrada: { id: "e", falhasDeContrato: 1, temEvidenciaValida: false },
      classe: "unrecovered_contract_failure",
      reprova: true,
    },
    {
      nome: "recuperou porem acima do teto de retries",
      entrada: { id: "f", falhasDeContrato: 7, temEvidenciaValida: true },
      classe: "unrecovered_contract_failure",
      reprova: true,
    },
    {
      nome: "fala nao executada nao e falha de confiabilidade",
      entrada: { id: "g", falhasDeContrato: 0, temEvidenciaValida: false },
      classe: "nao_executada",
      reprova: false,
    },
  ];
  for (const c of geracaoCases) {
    const r = classificarGeracao(c.entrada);
    if (r.classe !== c.classe) {
      failures += 1;
      console.log(`FALHA geracao · ${c.nome}: esperado classe ${c.classe}, obtido ${r.classe}`);
    }
    if (r.reprova !== c.reprova) {
      failures += 1;
      console.log(
        `FALHA geracao · ${c.nome}: esperado ${c.reprova ? "reprovar" : "nao reprovar"}, obtido ${r.reprova ? "reprovou" : "nao reprovou"}`,
      );
    }
  }

  // O gate de tamanho valida o DESENHO. Um numero unico para todos os grupos deixaria
  // passar matriz pela metade OU reprovaria a comparacao controlada para sempre.
  const tamanhoCases = [
    { model: "m/matriz", n: 48, ok: true, nome: "matriz completa" },
    { model: "m/matriz", n: 47, ok: false, nome: "matriz com uma celula faltando" },
    { model: "m/matriz", n: 49, ok: false, nome: "matriz com celula a mais que o previsto" },
    { model: "m/prompt-v5", n: 7, ok: true, nome: "comparacao controlada completa" },
    { model: "m/prompt-v5", n: 1, ok: false, nome: "comparacao controlada com 1 de 7" },
    { model: "m/prompt-v5", n: 40, ok: false, nome: "comparacao controlada com turnos a mais" },
    { model: "m", n: 45, ok: true, nome: "dataset acima do minimo" },
    { model: "m", n: 39, ok: false, nome: "dataset abaixo do minimo" },
  ];
  for (const c of tamanhoCases) {
    const obtido = conferirTamanho(c.model, c.n).ok;
    if (obtido === c.ok) continue;
    failures += 1;
    console.log(
      `FALHA tamanho · ${c.nome}: esperado ${c.ok ? "aceitar" : "recusar"}, obtido ${obtido ? "aceitou" : "recusou"}`,
    );
  }

  const matrizCases = buildMatrizTestCases();
  for (const c of matrizCases) {
    const obtido = {
      invariancia: violacoesDeInvariancia(c.celulas).length,
      diferenca: violacoesDeDiferenca(c.celulas).length,
      teto: violacoesDeTeto(c.celulas).length,
    };
    for (const chave of ["invariancia", "diferenca", "teto"]) {
      if (obtido[chave] === c[chave]) continue;
      failures += 1;
      console.log(
        `FALHA matriz · ${c.name} · ${chave}: esperado ${c[chave]} violacao(oes), obtido ${obtido[chave]}`,
      );
    }
  }

  console.log(
    `\nself-test: ${cases.length} casos de turno + ${matrizCases.length} de matriz + ${tamanhoCases.length} de tamanho + ${geracaoCases.length} de classificacao de geracao · ${CHECKS.length} checagens · ${failures} falha(s)`,
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
      if (!fs.statSync(modelDir).isDirectory()) continue;
      // Uma SPEC pode ter rodadas com propositos diferentes (a matriz de personalidade e a
      // comparacao de prompt). Cada subpasta do modelo e um alvo proprio, para as medidas
      // nao se misturarem numa media que nao significa nada.
      const entradas = fs.readdirSync(modelDir).filter((name) => !name.startsWith("_"));
      const temJsonSolto = entradas.some((name) => name.endsWith(".json"));
      const subgrupos = entradas.filter((name) =>
        fs.statSync(path.join(modelDir, name)).isDirectory(),
      );
      if (temJsonSolto) targets.push({ model, modelDir });
      for (const grupo of subgrupos) {
        targets.push({ model: `${model}/${grupo}`, modelDir: path.join(modelDir, grupo) });
      }
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

// Na matriz o nivel e dimensao de execucao: a mesma fala roda em nivel 1 e 4. Medir
// comprimento (C8) contra o `nivel_esperado` do dataset daria o resultado errado nas duas
// celulas, entao o nivel gravado na evidencia tem precedencia.
function recordEfetivo(record, rawEvidence) {
  const nivel = rawEvidence?.nivel;
  if (!Number.isInteger(nivel) || nivel === record.nivel_esperado) return record;
  return { ...record, nivel_esperado: nivel };
}

function gradeModel(target, dataset) {
  const files = fs.readdirSync(target.modelDir).filter((name) => name.endsWith(".json"));
  const counts = {};
  let unreadable = 0;
  for (const file of files) {
    const rawEvidence = JSON.parse(fs.readFileSync(path.join(target.modelDir, file), "utf8"));
    const base = dataset.get(rawEvidence.id);
    const record = base ? recordEfetivo(base, rawEvidence) : base;
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

// Cada DESENHO experimental tem um tamanho proprio, e o gate valida o desenho — nao
// aplica um numero unico a todos. Afrouxar para o menor deles deixaria passar uma matriz
// pela metade; exigir o maior de todos reprovaria a comparacao controlada para sempre,
// porque ela tem 7 falas POR DESENHO e nao por falta de execucao.
function desenhoDoGrupo(model) {
  const matriz = JSON.parse(fs.readFileSync(MATRIZ_PATH, "utf8"));
  if (model.endsWith("/matriz")) {
    const n = matriz.falas.length * matriz.niveis.length * matriz.tons.length;
    return {
      rotulo: `matriz ${matriz.falas.length}x${matriz.niveis.length}x${matriz.tons.length}`,
      exigencia: "exata",
      n,
    };
  }
  if (/\/prompt-/.test(model)) {
    return {
      rotulo: "comparacao controlada",
      exigencia: "exata",
      n: matriz.comparacao.falas.length,
    };
  }
  // Rodada do dataset inteiro: minimo, porque o dataset pode crescer sem invalidar nada.
  return { rotulo: "dataset", exigencia: "minima", n: MINIMO_TURNOS };
}

// Classificacao de falha de geracao — decisao do usuario em 2026-09-16 20:43, registrada no
// journal ANTES desta implementacao. Separa duas dimensoes que estavam colapsadas numa so:
// VALIDADE FINAL DO CONTRATO (a execucao entregou turno valido?) e CONFIABILIDADE DA
// GERACAO (quantas vezes o modelo falhou no caminho?). Falha recuperada nao reprova o
// contrato e NUNCA e apagada da contagem.
//
// Fundamento: DEC-20260916-0311 ja prevê retry e fallback para `json_validate_failed`.
// Isto aplica a decisao ao gate, em vez de abrir excecao para acomodar um resultado.
const MAX_RETRIES_CONTRATO = 6; // espelha MAX_TENTATIVAS do run.mjs

/**
 * Entrada por fala: quantas falhas de contrato foram registradas e se existe evidencia
 * final valida. Saida: a classe da fala e se ela reprova o contrato.
 * Funcao PURA — nao le disco, para ser testavel sem rodada.
 */
function classificarGeracao({ id, falhasDeContrato, temEvidenciaValida }) {
  if (falhasDeContrato === 0 && temEvidenciaValida) {
    return { id, classe: "valid_first_attempt", reprova: false };
  }
  if (falhasDeContrato > 0 && temEvidenciaValida) {
    if (falhasDeContrato > MAX_RETRIES_CONTRATO) {
      // Recuperou, mas acima do teto: o contrato exige que o teto seja respeitado.
      return {
        id,
        classe: "unrecovered_contract_failure",
        reprova: true,
        motivo: "teto de retries excedido",
      };
    }
    return {
      id,
      classe: "recovered_after_retry",
      reprova: false,
      tentativas: falhasDeContrato + 1,
    };
  }
  if (falhasDeContrato > 0 && !temEvidenciaValida) {
    return {
      id,
      classe: "unrecovered_contract_failure",
      reprova: true,
      motivo: "nenhuma tentativa produziu resposta valida",
    };
  }
  // Sem falha e sem evidencia: a fala simplesmente nao foi executada. Quem reprova isso e
  // o gate de TAMANHO do desenho, nao o de confiabilidade — cada um no seu papel.
  return { id, classe: "nao_executada", reprova: false };
}

function conferirTamanho(model, encontrados) {
  const d = desenhoDoGrupo(model);
  if (d.exigencia === "exata" && encontrados !== d.n) {
    return {
      ok: false,
      nota: `${d.rotulo} exige EXATAMENTE ${d.n} turnos (encontrados ${encontrados}) — desenho ${encontrados < d.n ? "incompleto" : "com turnos a mais que o previsto"}`,
    };
  }
  if (d.exigencia === "minima" && encontrados < d.n) {
    return {
      ok: false,
      nota: `${d.rotulo} exige ao menos ${d.n} turnos (encontrados ${encontrados})`,
    };
  }
  return { ok: true, nota: `${d.rotulo} · ${encontrados}/${d.n}` };
}

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

    // A unidade da metrica de confiabilidade e a GERACAO (um arquivo de evidencia), nao a
    // fala: na matriz a mesma fala produz 4 geracoes. Contar por fala subnotificaria 48
    // geracoes validas como 12.
    const validasPorId = new Map();

    for (const file of files) {
      const rawEvidence = JSON.parse(fs.readFileSync(path.join(target.modelDir, file), "utf8"));
      const base = dataset.get(rawEvidence.id);
      const record = base ? recordEfetivo(base, rawEvidence) : base;
      const turn = extractTurn(rawEvidence);
      if (!record) {
        semRegistro += 1;
        continue;
      }
      if (!turn || validateTurn(turn, TURN_SCHEMA).length > 0) {
        contratoInvalido += 1;
        continue;
      }
      if (validateEvidence(turn, record.aluno).length > 0) {
        semEvidencia += 1;
        continue;
      }
      validasPorId.set(rawEvidence.id, (validasPorId.get(rawEvidence.id) ?? 0) + 1);
    }

    // Rate limit e infraestrutura sao dimensao SEPARADA: nao dizem nada sobre a semantica
    // do modelo. Falha de contrato (`json_validate_failed`, 4xx de schema) e agrupada POR
    // FALA, porque a classificacao depende de a fala ter ou nao evidencia valida no fim.
    const failuresDir = path.join(target.modelDir, "_failures");
    const falhasContratoPorFala = new Map();
    let falhasDeInfra = 0;
    if (fs.existsSync(failuresDir)) {
      for (const name of fs.readdirSync(failuresDir).filter((f) => f.endsWith(".json"))) {
        const registro = JSON.parse(fs.readFileSync(path.join(failuresDir, name), "utf8"));
        if (registro?.erro?.error === "rate_limit") {
          falhasDeInfra += 1;
          continue;
        }
        const id = registro?.id ?? "(sem id)";
        falhasContratoPorFala.set(id, (falhasContratoPorFala.get(id) ?? 0) + 1);
      }
    }

    // Metricas de recuperacao, nomeadas na decisao do usuario. Toda fala com evidencia ou
    // com falha registrada e classificada; nenhuma ocorrencia e apagada.
    const metrica = {
      valid_first_attempt: 0,
      recovered_after_retry: 0,
      unrecovered_contract_failure: 0,
    };
    const recuperadas = [];
    const naoRecuperadas = [];
    const idsConhecidos = new Set([...validasPorId.keys(), ...falhasContratoPorFala.keys()]);
    for (const id of idsConhecidos) {
      const validas = validasPorId.get(id) ?? 0;
      const r = classificarGeracao({
        id,
        falhasDeContrato: falhasContratoPorFala.get(id) ?? 0,
        temEvidenciaValida: validas > 0,
      });
      if (r.classe === "valid_first_attempt") {
        metrica.valid_first_attempt += validas;
      } else if (r.classe === "recovered_after_retry") {
        // Os registros de falha sao gravados por FALA, nao por celula, entao nao da para
        // dizer QUAL geracao recuperou. Conta-se 1 recuperacao e as demais geracoes
        // validas da mesma fala seguem como validas de primeira.
        metrica.recovered_after_retry += 1;
        metrica.valid_first_attempt += Math.max(0, validas - 1);
        recuperadas.push(r);
      } else if (r.classe === "unrecovered_contract_failure") {
        metrica.unrecovered_contract_failure += 1;
        naoRecuperadas.push(r);
      }
    }

    const tamanho = conferirTamanho(target.model, files.length);

    const linha = [
      `${target.model}: ${tamanho.nota}`,
      `contrato invalido=${contratoInvalido}`,
      `sem evidencia citada=${semEvidencia}`,
      `nao recuperadas=${metrica.unrecovered_contract_failure}`,
    ].join(" · ");

    // VALIDADE DO CONTRATO: falha RECUPERADA nao reprova. O que reprova e desenho
    // incompleto, turno gravado invalido, correcao sem evidencia, ou falha nao recuperada.
    const reprovou =
      !tamanho.ok ||
      contratoInvalido > 0 ||
      semEvidencia > 0 ||
      metrica.unrecovered_contract_failure > 0 ||
      semRegistro > 0;
    console.log(`${reprovou ? "ERRO  " : "ok    "}${linha}`);

    // CONFIABILIDADE DA GERACAO: reportada SEMPRE, inclusive quando o contrato passa.
    console.log(
      `      confiabilidade: valid_first_attempt=${metrica.valid_first_attempt} · recovered_after_retry=${metrica.recovered_after_retry} · unrecovered_contract_failure=${metrica.unrecovered_contract_failure}`,
    );
    for (const r of recuperadas) {
      console.log(
        `      RECUPERADA  ${r.id}: json_validate_failed em ${r.tentativas - 1} tentativa(s), resposta valida depois — contabilizada, nao apagada`,
      );
    }
    for (const r of naoRecuperadas) {
      console.log(`      NAO RECUPERADA  ${r.id}: ${r.motivo}`);
    }
    if (falhasDeInfra > 0) {
      console.log(
        `      infra: ${falhasDeInfra} rate limit — dimensao separada, nao e falha semantica do modelo`,
      );
    }
    if (semRegistro > 0) {
      console.log(`      ${semRegistro} evidencia(s) sem fala correspondente no dataset`);
    }
    if (reprovou) problemas += 1;
  }

  console.log(
    `\nassert-contract: ${targets.length} desenho(s) · ${problemas} reprovado(s) na VALIDADE do contrato`,
  );
  console.log(
    "Validade e confiabilidade sao dimensoes distintas: o desenho pode passar e ainda haver falha de geracao registrada.",
  );
  process.exit(problemas > 0 ? 1 : 0);
}

// ─────────────────────────── matriz de personalidade ───────────────────────────
// A pergunta da SPEC-20260916-1652 nao e "quao bom foi o turno", e "o que mudou e o que
// NAO mudou quando o tom e o nivel mudaram". Isso exige comparar celulas entre si, e nao
// agregar tudo numa media — media de 4 celulas esconde exatamente o que se quer medir.

const MATRIZ_PATH = path.join(CURRENT_DIR, "matriz.json");

// Campos que a personalidade NAO pode tocar. Se qualquer um diverge entre tons, o produto
// tem duas pedagogias e nao duas personalidades.
const CAMPOS_PROTEGIDOS = ["suggested", "category"];

function carregarCelulas() {
  const alvos = findEvidenceTargets().filter((t) => t.model.endsWith("/matriz"));
  const porFala = new Map();
  for (const alvo of alvos) {
    for (const file of fs.readdirSync(alvo.modelDir).filter((f) => f.endsWith(".json"))) {
      const ev = JSON.parse(fs.readFileSync(path.join(alvo.modelDir, file), "utf8"));
      const turn = extractTurn(ev);
      if (!turn) continue;
      if (!porFala.has(ev.id)) porFala.set(ev.id, []);
      porFala.get(ev.id).push({ nivel: ev.nivel, tom: ev.tom, turn });
    }
  }
  return porFala;
}

function assinaturaPedagogica(turn) {
  const corr = Array.isArray(turn.corrections) ? turn.corrections : [];
  return JSON.stringify({
    itens: corr.map((c) => CAMPOS_PROTEGIDOS.map((k) => String(c?.[k] ?? "")).join("|")).sort(),
    focus: String(turn.focus ?? ""),
  });
}

function normalizarTexto(t) {
  return String(t ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Toda assercao da matriz exige a matriz COMPLETA antes de concluir qualquer coisa.
// Sem isso, uma rodada pela metade faz as assercoes passarem por falta de dados — e um
// gate que passa antes de a medicao terminar e pior que gate nenhum.
function exigirCelulas(porFala) {
  if (porFala.size === 0) {
    console.log("ERRO  nenhuma celula da matriz gravada — a rodada ainda nao aconteceu.");
    console.log("rode: GROQ_API_KEY=<chave> node scripts/eval/run.mjs --matriz");
    process.exit(1);
  }
  const matriz = JSON.parse(fs.readFileSync(MATRIZ_PATH, "utf8"));
  const esperadas = matriz.niveis.length * matriz.tons.length;
  const incompletas = [];
  for (const fala of matriz.falas) {
    const celulas = porFala.get(fala.id) ?? [];
    const chaves = new Set(celulas.map((c) => `n${c.nivel}-${c.tom}`));
    if (chaves.size !== esperadas) incompletas.push(`${fala.id} (${chaves.size}/${esperadas})`);
  }
  if (incompletas.length > 0) {
    console.log(
      `ERRO  matriz INCOMPLETA — ${incompletas.length} de ${matriz.falas.length} falas sem todas as celulas.`,
    );
    console.log(`      ${incompletas.join(", ")}`);
    console.log("      Assercao sobre matriz parcial nao conclui nada; termine a rodada primeiro.");
    process.exit(1);
  }
}

function assertCompleto() {
  const matriz = JSON.parse(fs.readFileSync(MATRIZ_PATH, "utf8"));
  const esperadas = matriz.niveis.length * matriz.tons.length;
  const porFala = carregarCelulas();
  exigirCelulas(porFala);
  let problemas = 0;
  for (const fala of matriz.falas) {
    const celulas = porFala.get(fala.id) ?? [];
    const chaves = new Set(celulas.map((c) => `n${c.nivel}-${c.tom}`));
    const faltando = [];
    for (const n of matriz.niveis) {
      for (const t of matriz.tons) if (!chaves.has(`n${n}-${t}`)) faltando.push(`n${n}-${t}`);
    }
    if (faltando.length > 0) {
      console.log(
        `ERRO  ${fala.id}: ${chaves.size}/${esperadas} celulas — falta ${faltando.join(", ")}`,
      );
      problemas += 1;
    }
  }
  console.log(
    `\nassert-completo: ${matriz.falas.length} falas × ${esperadas} celulas · ${problemas} incompleta(s)`,
  );
  process.exit(problemas > 0 ? 1 : 0);
}

// A invariancia e POR NIVEL: nivel diferente pode legitimamente mudar o que se corrige
// (um erro sutil nao vale a pena para quem esta comecando). O que nao pode mudar e a
// correcao entre TONS no mesmo nivel. Comparar as 4 celulas de uma vez confundiria as
// duas coisas e acusaria como violacao o que e adaptacao correta ao nivel.
function agruparPorNivel(celulas) {
  const porNivel = new Map();
  for (const c of celulas) {
    if (!porNivel.has(c.nivel)) porNivel.set(c.nivel, []);
    porNivel.get(c.nivel).push(c);
  }
  return porNivel;
}

// As tres funcoes abaixo sao PURAS: recebem celulas e devolvem violacoes, sem ler disco
// nem sair do processo. E o que permite testa-las no self-test sem gastar API.
function violacoesDeInvariancia(celulas) {
  const out = [];
  for (const [nivel, grupo] of agruparPorNivel(celulas)) {
    const assinaturas = new Map();
    for (const c of grupo) assinaturas.set(c.tom, assinaturaPedagogica(c.turn));
    if (new Set(assinaturas.values()).size > 1) out.push({ nivel, grupo });
  }
  return out;
}

function violacoesDeDiferenca(celulas) {
  const out = [];
  for (const [nivel, grupo] of agruparPorNivel(celulas)) {
    if (grupo.length < 2) continue;
    const falas = grupo.map((c) => normalizarTexto(c.turn.reply_en));
    if (new Set(falas).size === 1) out.push({ nivel, grupo });
  }
  return out;
}

function violacoesDeTeto(celulas) {
  const out = [];
  for (const [nivel, grupo] of agruparPorNivel(celulas)) {
    const contagens = grupo.map((c) => ({ tom: c.tom, n: countCorrections(c.turn) }));
    if (new Set(contagens.map((x) => x.n)).size > 1) out.push({ nivel, contagens });
  }
  return out;
}

function assertInvariancia() {
  const porFala = carregarCelulas();
  exigirCelulas(porFala);
  let violacoes = 0;
  for (const [id, celulas] of porFala) {
    for (const v of violacoesDeInvariancia(celulas)) {
      violacoes += 1;
      console.log(`ERRO  ${id} nivel ${v.nivel}: a correcao MUDOU entre tons`);
      for (const c of v.grupo) {
        const corr = Array.isArray(c.turn.corrections) ? c.turn.corrections : [];
        const itens =
          corr.map((x) => `"${x.original}" -> "${x.suggested}" (${x.category})`).join(" · ") ||
          "(nenhuma)";
        console.log(`        ${c.tom}: ${corr.length} correcao(oes) — ${itens}`);
        console.log(`          focus: "${c.turn.focus ?? ""}"`);
      }
    }
  }
  console.log(
    `\nassert-invariancia: ${porFala.size} falas · ${violacoes} violacao(oes) da verdade pedagogica`,
  );
  process.exit(violacoes > 0 ? 1 : 0);
}

function assertDiferenca() {
  const porFala = carregarCelulas();
  exigirCelulas(porFala);
  let iguais = 0;
  for (const [id, celulas] of porFala) {
    for (const v of violacoesDeDiferenca(celulas)) {
      iguais += 1;
      console.log(
        `ERRO  ${id} nivel ${v.nivel}: reply_en IDENTICO entre tons — personalidade decorativa`,
      );
      console.log(`        "${v.grupo[0].turn.reply_en}"`);
    }
  }
  console.log(`\nassert-diferenca: ${porFala.size} falas · ${iguais} sem diferenca de estilo`);
  process.exit(iguais > 0 ? 1 : 0);
}

function assertTeto() {
  const porFala = carregarCelulas();
  exigirCelulas(porFala);
  let desequilibrios = 0;
  for (const [id, celulas] of porFala) {
    for (const v of violacoesDeTeto(celulas)) {
      desequilibrios += 1;
      console.log(
        `ERRO  ${id} nivel ${v.nivel}: quantidade de correcao difere por tom — ${v.contagens.map((x) => `${x.tom}=${x.n}`).join(" · ")}`,
      );
    }
  }
  console.log(
    `\nassert-teto: ${porFala.size} falas · ${desequilibrios} caso(s) em que o tom mudou QUANTO se corrige`,
  );
  process.exit(desequilibrios > 0 ? 1 : 0);
}

// As assercoes dizem se algo quebrou; elas nao dizem se os dois tons SOAM diferentes a
// um leitor humano. Este relatorio existe para o criterio de leitura humana e para a
// invariante "nunca afirmar ganho sem mostrar as saidas lado a lado".
function relatorioMatriz() {
  const matriz = JSON.parse(fs.readFileSync(MATRIZ_PATH, "utf8"));
  const dataset = loadDataset();
  const porFala = carregarCelulas();
  exigirCelulas(porFala);

  for (const fala of matriz.falas) {
    const record = dataset.get(fala.id);
    const celulas = porFala.get(fala.id) ?? [];
    console.log(`\n${"=".repeat(78)}`);
    console.log(`${fala.id} · ${record.tipo_erro} · aluno: "${record.aluno}"`);
    console.log(`motivo da inclusao: ${fala.motivo}`);
    if (record.deve_corrigir.length > 0) {
      console.log(`deve_corrigir: ${JSON.stringify(record.deve_corrigir)}`);
    }
    if (record.nao_deve_corrigir.length > 0) {
      console.log(`nao_deve_corrigir: ${JSON.stringify(record.nao_deve_corrigir)}`);
    }

    for (const nivel of matriz.niveis) {
      const grupo = celulas.filter((c) => c.nivel === nivel);
      console.log(`\n  --- nivel ${nivel} ---`);
      // A correcao aparece UMA vez quando e igual nos dois tons: e o resultado esperado,
      // e repetir esconderia a diferenca real, que esta na fala e na explicacao.
      const assinaturas = new Set(grupo.map((c) => assinaturaPedagogica(c.turn)));
      if (assinaturas.size === 1 && grupo.length > 0) {
        const corr = grupo[0].turn.corrections ?? [];
        console.log(
          `  correcao (IGUAL nos dois tons): ${corr.length === 0 ? "nenhuma" : ""}`.trimEnd(),
        );
        for (const c of corr)
          console.log(`    "${c.original}" -> "${c.suggested}" (${c.category})`);
      } else {
        console.log(`  correcao DIVERGIU entre tons:`);
        for (const c of grupo) {
          const corr = c.turn.corrections ?? [];
          console.log(
            `    ${c.tom}: ${corr.map((x) => `"${x.original}" -> "${x.suggested}"`).join(" · ") || "nenhuma"}`,
          );
        }
      }
      for (const c of grupo) {
        console.log(`  [${c.tom}] ${c.turn.reply_en}`);
        console.log(`           instrucao: ${c.turn.instruction_pt}`);
        for (const x of c.turn.corrections ?? [])
          console.log(`           expl: ${x.explanation_pt}`);
        console.log(`           next_action: ${c.turn.next_action}`);
      }
    }
  }
  console.log(`\n${"=".repeat(78)}`);
  console.log("ESTE RELATORIO NAO APROVA NADA. As assercoes dizem o que quebrou;");
  console.log("se os dois tons soam de fato diferentes e julgamento humano.");
}

// Comparacao cirurgica v4 -> v5 nas 7 falas que falharam. A evidencia do v4 esta
// arquivada; a do v5 foi gravada no grupo prompt-v5 desta SPEC.
function compararPrompt() {
  const matriz = JSON.parse(fs.readFileSync(MATRIZ_PATH, "utf8"));
  const dataset = loadDataset();
  const v4Dir = path.join(
    PROJECT_ROOT,
    "docs",
    "archive",
    "SPEC-20260916-1450-contrato-do-turno-v2",
    "evidence",
    "openai_gpt-oss-20b",
  );
  const alvoV5 = findEvidenceTargets().find((t) => t.model.includes("/prompt-"));
  if (!alvoV5) {
    console.log("ERRO  nenhuma evidencia do prompt novo — a comparacao ainda nao aconteceu.");
    console.log("rode: GROQ_API_KEY=<chave> node scripts/eval/run.mjs --comparar-prompt");
    process.exit(1);
  }

  let ausentes = 0;
  const linhas = [];
  for (const alvo of matriz.comparacao.falas) {
    const p4 = path.join(v4Dir, `${alvo.id}.json`);
    const p5 = path.join(alvoV5.modelDir, `${alvo.id}.json`);
    if (!fs.existsSync(p4) || !fs.existsSync(p5)) {
      console.log(`ERRO  ${alvo.id}: falta evidencia (${!fs.existsSync(p4) ? "v4" : "v5"})`);
      ausentes += 1;
      continue;
    }
    const e4 = JSON.parse(fs.readFileSync(p4, "utf8"));
    const e5 = JSON.parse(fs.readFileSync(p5, "utf8"));
    const t4 = extractTurn(e4);
    const t5 = extractTurn(e5);
    const base = dataset.get(alvo.id);
    const r4 = evaluateTurn(t4, recordEfetivo(base, e4));
    const r5 = evaluateTurn(t5, recordEfetivo(base, e5));
    linhas.push({ alvo, base, t4, t5, r4, r5 });
  }

  for (const l of linhas) {
    console.log(`\n===== ${l.alvo.id} · falha no v4: ${l.alvo.falha_v4} =====`);
    console.log(`aluno: "${l.base.aluno}"`);
    console.log(`deve_corrigir: ${JSON.stringify(l.base.deve_corrigir)}`);
    for (const [rotulo, turn] of [
      ["v4", l.t4],
      ["v5", l.t5],
    ]) {
      const corr = Array.isArray(turn.corrections) ? turn.corrections : [];
      console.log(`  [${rotulo}] ${corr.length} correcao(oes)`);
      for (const c of corr) {
        console.log(`       "${c.original}" -> "${c.suggested}" (${c.category})`);
        console.log(`       ${c.explanation_pt}`);
      }
      if (corr.length === 0) console.log(`       suggestion_en: "${turn.suggestion_en}"`);
    }
    const mudou = ["C4", "C5", "C11", "C12", "C13"]
      .filter((k) => l.r4[k] !== l.r5[k])
      .map((k) => `${k}: ${l.r4[k]} -> ${l.r5[k]}`);
    console.log(`  delta: ${mudou.length ? mudou.join(" · ") : "nenhuma checagem mudou"}`);
  }

  // Veredito por fala, olhando as checagens que medem PEDAGOGIA (nao forma).
  const CHAVES_PEDAGOGICAS = ["C4", "C5", "C13"];
  const vereditoDe = (l) => {
    const up = CHAVES_PEDAGOGICAS.filter((k) => l.r4[k] === false && l.r5[k] === true);
    const down = CHAVES_PEDAGOGICAS.filter((k) => l.r4[k] === true && l.r5[k] === false);
    if (up.length && down.length) return { rotulo: "TROCA", detalhe: `+${up} / -${down}` };
    if (up.length) return { rotulo: "MELHORA", detalhe: `+${up}` };
    if (down.length) return { rotulo: "REGRESSAO", detalhe: `-${down}` };
    return { rotulo: "equivalencia", detalhe: "" };
  };

  // Confianca vem de CORROBORACAO, nao de tamanho de efeito. Sem seed e sem temperature
  // fixada, um par v4/v5 e n=1 por versao: qualquer diferenca isolada pode ser amostragem.
  // Se a fala tambem esta na matriz, as celulas dizem se o comportamento se repete.
  const matrizPorFala = carregarCelulasSeExistir();
  const confiancaDe = (id) => {
    const celulas = matrizPorFala.get(id);
    if (!celulas || celulas.length === 0) {
      return "BAIXA — n=1 por versao, sem seed/temperature e sem corroboracao na matriz";
    }
    const corrigiram = celulas.filter((c) => countCorrections(c.turn) > 0).length;
    const consistente = corrigiram === 0 || corrigiram === celulas.length;
    return `${consistente ? "MEDIA" : "BAIXA"} — n=1 por versao; matriz: ${corrigiram}/${celulas.length} celulas corrigiram${consistente ? " (comportamento consistente)" : " (comportamento misto = assinatura de amostragem)"}`;
  };

  console.log(
    `\n${"=".repeat(78)}\nTABELA FINAL — v4 x v5 em condicao identica (nivel do dataset, tom tranquila)\n`,
  );
  for (const l of linhas) {
    const c4 = (r) => (r.C4 === null ? "n/a" : r.C4 ? "passa" : "FALHA");
    const c5 = (r) => (r.C5 === null ? "n/a" : r.C5 ? "passa" : "FALHA");
    const n4 = (l.t4.corrections ?? []).length;
    const n5 = (l.t5.corrections ?? []).length;
    const v = vereditoDe(l);
    const sug4 = (l.t4.corrections ?? []).map((x) => x.suggested);
    const sug5 = (l.t5.corrections ?? []).map((x) => x.suggested);
    const mesmaCorrecao =
      n4 === n5 && sug4.every((s, i) => s.toLowerCase() === (sug5[i] ?? "").toLowerCase());

    console.log(`[${l.alvo.id}] ${l.base.tipo_erro} · falha no v4: ${l.alvo.falha_v4}`);
    console.log(`  aluno: "${l.base.aluno}"`);
    console.log(`  correcoes emitidas ....... v4=${n4}  v5=${n5}`);
    console.log(`  next_action .............. v4=${l.t4.next_action}  v5=${l.t5.next_action}`);
    console.log(`  C4 (nao corrige controle)  v4=${c4(l.r4)}  v5=${c4(l.r5)}`);
    console.log(`  C5 (corrige quando ha) ... v4=${c5(l.r4)}  v5=${c5(l.r5)}`);
    console.log(
      `  C13 (explicacao em pt) ... v4=${l.r4.C13 === null ? "n/a" : l.r4.C13 ? "passa" : "FALHA"}  v5=${l.r5.C13 === null ? "n/a" : l.r5.C13 ? "passa" : "FALHA"}`,
    );
    console.log(
      `  diferenca pedagogica ..... ${n4 !== n5 ? `QUANTIDADE mudou (${n4} -> ${n5})` : mesmaCorrecao ? "nenhuma (mesma correcao)" : "MESMO numero, correcao diferente"}`,
    );
    console.log(`  veredito ................. ${v.rotulo}${v.detalhe ? ` (${v.detalhe})` : ""}`);
    console.log(`  confianca ................ ${confiancaDe(l.alvo.id)}`);
    console.log("");
  }

  const cont = { MELHORA: 0, REGRESSAO: 0, TROCA: 0, equivalencia: 0 };
  for (const l of linhas) cont[vereditoDe(l).rotulo] += 1;
  console.log(
    `comparar-prompt: ${linhas.length}/${matriz.comparacao.falas.length} falas · ${cont.MELHORA} melhora · ${cont.REGRESSAO} regressao · ${cont.TROCA} troca · ${cont.equivalencia} equivalencia · ${ausentes} sem evidencia`,
  );
  console.log("O VEREDITO E HUMANO: estes numeros dizem o que mudou, nao se a mudanca vale.");
  process.exit(ausentes > 0 || linhas.length !== matriz.comparacao.falas.length ? 1 : 0);
}

// Versao tolerante de carregarCelulas: a comparacao de prompt nao DEPENDE da matriz, mas
// usa as celulas como corroboracao quando existem. Falhar aqui por matriz ausente seria
// acoplar dois desenhos que sao independentes.
function carregarCelulasSeExistir() {
  try {
    return carregarCelulas();
  } catch {
    return new Map();
  }
}

const argv = process.argv;
if (argv.includes("--self-test")) runSelfTest();
else if (argv.includes("--matriz")) {
  if (argv.includes("--assert-completo")) assertCompleto();
  else if (argv.includes("--assert-invariancia")) assertInvariancia();
  else if (argv.includes("--assert-diferenca")) assertDiferenca();
  else if (argv.includes("--assert-teto")) assertTeto();
  else if (argv.includes("--relatorio")) relatorioMatriz();
  else {
    console.log(
      "uso: grade.mjs --matriz --assert-{completo|invariancia|diferenca|teto} | --relatorio",
    );
    process.exit(2);
  }
} else if (argv.includes("--comparar-prompt")) compararPrompt();
else if (argv.includes("--assert-contract")) assertContract();
else printTable();

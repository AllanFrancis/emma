#!/usr/bin/env node
// Validacao estrutural do dataset e do schema do turno. Nao gasta chamada de API.
//   node scripts/eval/validate.mjs            -> valida dataset.jsonl
//   node scripts/eval/validate.mjs --schema   -> valida turn-schema.json
//   node scripts/eval/validate.mjs --all      -> ambos
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateTurn, validateEvidence } from "./turn-validator.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATASET = path.join(HERE, "dataset.jsonl");
const SCHEMA = path.join(HERE, "turn-schema.json");

const CONTEXTOS = new Set(["cafe", "hotel", "small-talk", "livre"]);
const TIPOS_ERRO = new Set([
  "gramatical",
  "interferencia",
  "pragmatico",
  "lexical",
  "multiplo",
  "nenhum",
]);
const CRITERIOS = new Set(["vocabulario", "gramatica", "construcao", "compreensao", "sustentacao"]);
const CAMPOS = [
  "id",
  "contexto",
  "aluno",
  "nivel_esperado",
  "criterios_observaveis",
  "deve_corrigir",
  "nao_deve_corrigir",
  "tipo_erro",
  "nota",
];
const MINIMO = 40;
const TETO_CORRECOES = 3; // regra do contrato: no maximo 3 pontos por turno

// Contrato do turno v2 — corrections[] estruturado (SPEC-20260916-1450).
const CAMPOS_TURNO = [
  "reply_en",
  "reply_pt",
  "instruction_pt",
  "corrections",
  "suggestion_en",
  "suggestion_pt",
  "words",
  "focus",
  "next_action",
];
const CAMPOS_CORRECAO = ["original", "suggested", "explanation_pt", "category"];
const CATEGORIAS = [
  "grammar",
  "vocabulary",
  "word_order",
  "preposition",
  "false_friend",
  "register",
];
const NEXT_ACTIONS = ["reply", "retry", "continue_mission", "complete_mission"];

// Fala de referencia do self-test; a evidencia das correcoes tem de sair daqui.
const FALA_FIXTURE = "I want a coffee please";

function fixtureTurno(overrides = {}) {
  return {
    reply_en: "Nice choice! Small or large?",
    reply_pt: "Boa escolha! Pequeno ou grande?",
    instruction_pt: "Agora diga o tamanho que voce quer.",
    corrections: [
      {
        original: "I want a coffee",
        suggested: "I'd like a coffee",
        explanation_pt: "Num pedido, 'I'd like' soa mais natural do que 'I want'.",
        category: "register",
      },
    ],
    suggestion_en: "A small one, please.",
    suggestion_pt: "Um pequeno, por favor.",
    words: ["I'd like"],
    focus: "pedidos com I'd like",
    next_action: "retry",
    ...overrides,
  };
}

const erros = [];
const avisos = [];

function validarDataset() {
  const linhas = fs
    .readFileSync(DATASET, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  const vistos = new Set();
  const porContexto = {};
  let semCorrecao = 0;

  linhas.forEach((linha, i) => {
    const n = i + 1;
    let r;
    try {
      r = JSON.parse(linha);
    } catch (e) {
      erros.push(`linha ${n}: JSON invalido — ${e.message}`);
      return;
    }

    for (const campo of CAMPOS) {
      if (!(campo in r)) erros.push(`linha ${n}: falta o campo '${campo}'`);
    }
    for (const campo of Object.keys(r)) {
      if (!CAMPOS.includes(campo)) erros.push(`linha ${n}: campo desconhecido '${campo}'`);
    }

    if (vistos.has(r.id)) erros.push(`linha ${n}: id duplicado '${r.id}'`);
    vistos.add(r.id);

    if (!CONTEXTOS.has(r.contexto)) {
      erros.push(`linha ${n}: contexto '${r.contexto}' fora de {${[...CONTEXTOS].join(", ")}}`);
    } else {
      porContexto[r.contexto] = (porContexto[r.contexto] || 0) + 1;
    }

    if (!TIPOS_ERRO.has(r.tipo_erro)) {
      erros.push(`linha ${n}: tipo_erro '${r.tipo_erro}' fora de {${[...TIPOS_ERRO].join(", ")}}`);
    }

    if (!Number.isInteger(r.nivel_esperado) || r.nivel_esperado < 1 || r.nivel_esperado > 5) {
      erros.push(
        `linha ${n}: nivel_esperado deve ser inteiro de 1 a 5 (recebido: ${r.nivel_esperado})`,
      );
    }

    if (typeof r.aluno !== "string" || r.aluno.trim() === "") {
      erros.push(`linha ${n}: 'aluno' vazio`);
    }

    const co = r.criterios_observaveis;
    if (typeof co !== "object" || co === null || Array.isArray(co)) {
      erros.push(`linha ${n}: criterios_observaveis deve ser objeto`);
    } else {
      if (Object.keys(co).length === 0)
        erros.push(
          `linha ${n}: criterios_observaveis vazio — toda fala evidencia ao menos um criterio`,
        );
      for (const [k, v] of Object.entries(co)) {
        if (!CRITERIOS.has(k)) erros.push(`linha ${n}: criterio desconhecido '${k}'`);
        if (!Number.isInteger(v) || v < 1 || v > 5)
          erros.push(`linha ${n}: criterio '${k}' deve ser inteiro de 1 a 5 (recebido: ${v})`);
      }
    }

    for (const campo of ["deve_corrigir", "nao_deve_corrigir"]) {
      if (!Array.isArray(r[campo])) {
        erros.push(`linha ${n}: '${campo}' deve ser array`);
      } else if (r[campo].some((x) => typeof x !== "string")) {
        erros.push(`linha ${n}: '${campo}' deve conter apenas strings`);
      }
    }

    if (Array.isArray(r.deve_corrigir)) {
      if (r.deve_corrigir.length > TETO_CORRECOES) {
        erros.push(
          `linha ${n}: deve_corrigir tem ${r.deve_corrigir.length} itens — o contrato limita a ${TETO_CORRECOES} por turno`,
        );
      }
      if (r.deve_corrigir.length === 0) semCorrecao++;
    }

    // Coerencia: nada a corrigir mas tipo_erro diz que ha erro, e vice-versa.
    if (Array.isArray(r.deve_corrigir)) {
      if (r.deve_corrigir.length === 0 && r.tipo_erro !== "nenhum") {
        erros.push(`linha ${n}: deve_corrigir vazio mas tipo_erro='${r.tipo_erro}' — incoerente`);
      }
      if (r.deve_corrigir.length > 0 && r.tipo_erro === "nenhum") {
        erros.push(`linha ${n}: ha correcoes previstas mas tipo_erro='nenhum' — incoerente`);
      }
    }
  });

  if (linhas.length < MINIMO) {
    erros.push(
      `dataset tem ${linhas.length} falas — o criterio de aceite exige ao menos ${MINIMO}`,
    );
  }

  // O dataset so mede sobre-correcao se tiver casos que NAO devem ser corrigidos.
  const pctControle = linhas.length ? (semCorrecao / linhas.length) * 100 : 0;
  if (pctControle < 20) {
    avisos.push(
      `apenas ${pctControle.toFixed(0)}% das falas sao casos de controle (sem correcao) — abaixo de 20%, o eval mede mal a sobre-correcao`,
    );
  }

  for (const ctx of CONTEXTOS) {
    if (!porContexto[ctx]) avisos.push(`nenhuma fala no contexto '${ctx}'`);
  }

  console.log(
    `dataset: ${linhas.length} falas · ${semCorrecao} casos de controle (${pctControle.toFixed(0)}%)`,
  );
  console.log(
    `  por contexto: ${Object.entries(porContexto)
      .map(([k, v]) => `${k}=${v}`)
      .join(" · ")}`,
  );
}

function validarSchema() {
  let s;
  try {
    s = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));
  } catch (e) {
    erros.push(`turn-schema.json: JSON invalido — ${e.message}`);
    return;
  }

  if (s.strict !== true) erros.push(`turn-schema.json: 'strict' deve ser true`);
  if (!s.name) erros.push(`turn-schema.json: falta 'name'`);

  const sc = s.schema;
  if (!sc) {
    erros.push(`turn-schema.json: falta 'schema'`);
    return;
  }
  if (sc.additionalProperties !== false) {
    erros.push(`turn-schema.json: additionalProperties deve ser false (exigido pelo strict mode)`);
  }

  const props = Object.keys(sc.properties || {});
  const req = sc.required || [];

  for (const campo of CAMPOS_TURNO) {
    if (!props.includes(campo)) erros.push(`turn-schema.json: falta a propriedade '${campo}'`);
    if (!req.includes(campo)) erros.push(`turn-schema.json: '${campo}' deveria ser required`);
  }
  for (const campo of props) {
    if (!CAMPOS_TURNO.includes(campo))
      erros.push(`turn-schema.json: propriedade inesperada '${campo}'`);
  }
  for (const campo of req) {
    if (!props.includes(campo))
      erros.push(`turn-schema.json: '${campo}' em required sem propriedade correspondente`);
  }

  // corrections[] e o coracao do contrato v2: array de objeto, com teto e evidencia.
  const corrections = sc.properties?.corrections;
  if (corrections?.type !== "array") {
    erros.push(`turn-schema.json: 'corrections' deve ser array`);
  } else {
    if (corrections.maxItems !== TETO_CORRECOES) {
      erros.push(
        `turn-schema.json: corrections.maxItems deve ser ${TETO_CORRECOES} (recebido: ${corrections.maxItems})`,
      );
    }
    const item = corrections.items;
    if (item?.type !== "object") {
      erros.push(`turn-schema.json: corrections.items deve ser object`);
    } else {
      if (item.additionalProperties !== false) {
        erros.push(
          `turn-schema.json: corrections.items.additionalProperties deve ser false — o strict mode recusa campo desconhecido em TODOS os niveis`,
        );
      }
      const itemProps = Object.keys(item.properties || {});
      const itemReq = item.required || [];
      for (const campo of CAMPOS_CORRECAO) {
        if (!itemProps.includes(campo))
          erros.push(`turn-schema.json: corrections.items falta '${campo}'`);
        if (!itemReq.includes(campo))
          erros.push(`turn-schema.json: corrections.items['${campo}'] deveria ser required`);
      }
      for (const campo of itemProps) {
        if (!CAMPOS_CORRECAO.includes(campo))
          erros.push(`turn-schema.json: corrections.items campo inesperado '${campo}'`);
      }
      conferirEnum(item.properties?.category, CATEGORIAS, "corrections.items.category");
    }
  }

  conferirEnum(sc.properties?.next_action, NEXT_ACTIONS, "next_action");

  const words = sc.properties?.words;
  if (words?.maxItems !== TETO_CORRECOES) {
    erros.push(
      `turn-schema.json: words.maxItems deve ser ${TETO_CORRECOES} (recebido: ${words?.maxItems})`,
    );
  }

  const fixtureErrors = validateTurn(fixtureTurno(), s);
  if (fixtureErrors.length > 0) {
    erros.push(`turn-schema.json: fixture valida foi rejeitada — ${fixtureErrors.join("; ")}`);
  }

  console.log(
    `turn-schema: ${props.length} campos · corrections[]=objeto(${CAMPOS_CORRECAO.length} campos, max ${corrections?.maxItems}) · strict=${s.strict}`,
  );
}

function conferirEnum(propriedade, esperado, nome) {
  if (!Array.isArray(propriedade?.enum)) {
    erros.push(`turn-schema.json: '${nome}' deve declarar enum`);
    return;
  }
  const faltando = esperado.filter((v) => !propriedade.enum.includes(v));
  const sobrando = propriedade.enum.filter((v) => !esperado.includes(v));
  if (faltando.length > 0)
    erros.push(`turn-schema.json: '${nome}' sem os valores ${faltando.join(", ")}`);
  if (sobrando.length > 0)
    erros.push(`turn-schema.json: '${nome}' com valores extras ${sobrando.join(", ")}`);
}

// Prova que cada classe de violacao do contrato e RECUSADA. Um validador que aceita
// tudo passa em qualquer rodada e nao protege nada; estes casos sao a prova do contrario.
function autoTeste() {
  const schema = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));
  const casos = [
    {
      nome: "turno valido",
      turno: fixtureTurno(),
      recusar: false,
    },
    {
      nome: "4a correcao estoura o teto",
      turno: fixtureTurno({
        corrections: Array.from({ length: 4 }, () => fixtureTurno().corrections[0]),
      }),
      recusar: true,
    },
    {
      nome: "categoria fora do enum",
      turno: fixtureTurno({
        corrections: [{ ...fixtureTurno().corrections[0], category: "spelling" }],
      }),
      recusar: true,
    },
    {
      nome: "next_action fora do enum",
      turno: fixtureTurno({ next_action: "advance" }),
      recusar: true,
    },
    {
      nome: "campo extra dentro de corrections[]",
      turno: fixtureTurno({
        corrections: [{ ...fixtureTurno().corrections[0], severity: "high" }],
      }),
      recusar: true,
    },
    {
      nome: "correcao sem campo obrigatorio",
      turno: fixtureTurno({
        corrections: [{ original: "I want a coffee", suggested: "I'd like a coffee" }],
      }),
      recusar: true,
    },
    {
      nome: "corrections como string (contrato v1)",
      turno: fixtureTurno({ corrections: "Em vez de X, diga Y" }),
      recusar: true,
    },
    {
      nome: "correction_pt do contrato v1 nao e mais aceito",
      turno: { ...fixtureTurno(), correction_pt: "Em vez de X, diga Y" },
      recusar: true,
    },
    {
      nome: "array vazio de correcoes e valido",
      turno: fixtureTurno({ corrections: [], next_action: "reply" }),
      recusar: false,
    },
  ];

  const casosEvidencia = [
    {
      nome: "evidencia citada literalmente",
      turno: fixtureTurno(),
      recusar: false,
    },
    {
      nome: "evidencia parafraseada nao vale",
      turno: fixtureTurno({
        corrections: [{ ...fixtureTurno().corrections[0], original: "I desire a coffee" }],
      }),
      recusar: true,
    },
    {
      nome: "original vazio nao vale",
      turno: fixtureTurno({
        corrections: [{ ...fixtureTurno().corrections[0], original: "" }],
      }),
      recusar: true,
    },
    {
      nome: "maiuscula, apostrofo curvo e espaco extra nao invalidam a evidencia",
      turno: fixtureTurno({
        corrections: [{ ...fixtureTurno().corrections[0], original: "I  WANT a coffee." }],
      }),
      recusar: false,
    },
  ];

  let falhas = 0;
  for (const caso of casos) {
    const recusado = validateTurn(caso.turno, schema).length > 0;
    if (recusado === caso.recusar) continue;
    falhas += 1;
    console.log(
      `FALHA schema · ${caso.nome}: esperado ${caso.recusar ? "recusar" : "aceitar"}, obtido ${recusado ? "recusou" : "aceitou"}`,
    );
  }
  for (const caso of casosEvidencia) {
    const recusado = validateEvidence(caso.turno, FALA_FIXTURE).length > 0;
    if (recusado === caso.recusar) continue;
    falhas += 1;
    console.log(
      `FALHA evidencia · ${caso.nome}: esperado ${caso.recusar ? "recusar" : "aceitar"}, obtido ${recusado ? "recusou" : "aceitou"}`,
    );
  }

  const total = casos.length + casosEvidencia.length;
  console.log(
    `self-test: ${total} casos (${casos.length} de schema · ${casosEvidencia.length} de evidencia) · ${falhas} falha(s)`,
  );
  if (falhas === 0) console.log("o validador recusa cada classe de violacao do contrato v2.");
  process.exit(falhas > 0 ? 1 : 0);
}

const args = process.argv.slice(2);
const soSchema = args.includes("--schema");
const tudo = args.includes("--all");

if (args.includes("--self-test")) autoTeste();

if (soSchema || tudo) validarSchema();
if (!soSchema || tudo) validarDataset();

console.log("");
for (const a of avisos) console.log(`AVISO  ${a}`);
for (const e of erros) console.log(`ERRO   ${e}`);
console.log(`\nvalidate: ${erros.length} erro(s), ${avisos.length} aviso(s)`);
process.exit(erros.length > 0 ? 1 : 0);

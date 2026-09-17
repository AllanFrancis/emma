#!/usr/bin/env node
// Runs the mechanical dialogue-quality checks and prints the comparison table.
// Subjective criteria remain a human decision documented in the report.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateTurn, validateEvidence, isSurfaceOnlyCorrection } from "./turn-validator.mjs";

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
  {
    id: "C14",
    name: "nao corrige grafia de fala transcrita",
    criterion: "caixa, pontuacao e acento nao existem na fala — DEC-20260916-0312",
    check: (turn) =>
      countCorrections(turn) === 0 || !Array.isArray(turn.corrections)
        ? null
        : turn.corrections.every((c) => !isSurfaceOnlyCorrection(c)),
  },
  // Espelho de C12 (SPEC-20260916-2048-semantica-next-action). C12 cobre um lado:
  // nao cobrar repeticao de quem nao errou. Faltava o outro: quem RECEBEU correcao
  // deve ser convidado a aplica-la. A metrica central da §20 e "o aluno produziu
  // linguagem e tentou novamente APOS receber feedback" — correcao que a conversa
  // nunca cobra e informacao, nao ensino.
  //
  // Medido em 117 turnos de evidencia antes de existir: 41 de 64 turnos com correcao
  // (64,1%) nao pediam aplicacao. O caso `hotel-10` esta gravado duas vezes, com
  // `retry` no contrato-do-turno-v2 e `reply` no prompt-v5 — o prompt regrediu o caso
  // e ninguem notou, porque nada media. Ver evidence/levantamento-taxa.md.
  //
  // Sem excecao por decisao do usuario em 2026-09-17: `continue_mission` e
  // `complete_mission` com correcao pendente TAMBEM reprovam, ainda que nunca tenham
  // ocorrido (0 de 117). Permitir observacao no fecho sem nova tentativa exige
  // semantica NOVA no contrato do turno — distinguir correcao bloqueante de
  // informativa — e nao afrouxamento desta checagem. Ver tabela-de-coerencia.md.
  {
    id: "C15",
    name: "correcao emitida pede aplicacao",
    criterion: "correcao sem aplicacao e informacao, nao ensino — espelho de C12",
    check: (turn) =>
      countCorrections(turn) === 0 || !Array.isArray(turn.corrections)
        ? null
        : turn.next_action === "retry",
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

// ---------------------------------------------------------------------------
// Checagens LONGITUDINAIS (SPEC-20260916-1652). As 15 checagens acima recebem um turno
// sem historia: por construcao nenhuma delas pode ver repeticao, retencao ou progressao.
// Estas recebem o turno E os turnos anteriores da MESMA conversa.
// ---------------------------------------------------------------------------

function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// So a pergunta interessa: a Emma pode repetir uma afirmacao ("Got it.") sem prejuizo,
// mas repetir a PERGUNTA e o que faz o aluno sentir que nao foi ouvido.
function extrairPerguntas(replyEn) {
  return String(replyEn ?? "")
    .split(/(?<=[.!?])\s+/)
    .filter((frase) => frase.trim().endsWith("?"))
    .map(normalizar)
    .filter(Boolean);
}

// Interrogativas e auxiliares nao distinguem uma pergunta de outra: e o que SOBRA delas
// que diz do que a pergunta trata. "What size would you like?" e "Which size do you
// want?" compartilham uma unica palavra de conteudo — `size` — e sao a mesma pergunta
// para quem esta conversando. Jaccard sobre os tokens brutos daria 0.25 e deixaria passar
// exatamente o caso que esta checagem existe para pegar.
const PALAVRAS_VAZIAS = new Set(
  [
    "what which who whom whose when where why how",
    "do does did is are am was were will would can could shall should may might have has had",
    "a an the you your yours i me my we us our it its that this these those",
    "to of for with about and or so then there here please",
    // Verbos de PEDIDO, nao de conteudo: "would you like" e "do you want" sao a mesma
    // pergunta, e o que a distingue de outra e o substantivo que vem depois.
    "like want need get",
  ]
    .join(" ")
    .split(" "),
);

function tokensDeConteudo(texto) {
  return new Set(texto.split(" ").filter((token) => token && !PALAVRAS_VAZIAS.has(token)));
}

function jaccard(tokensA, tokensB) {
  const intersecao = [...tokensA].filter((token) => tokensB.has(token)).length;
  const uniao = new Set([...tokensA, ...tokensB]).size;
  return uniao === 0 ? 0 : intersecao / uniao;
}

function similaridade(a, b) {
  const conteudoA = tokensDeConteudo(a);
  const conteudoB = tokensDeConteudo(b);
  // Pergunta feita so de palavras vazias ("And you?") nao tem conteudo a comparar; ali o
  // token bruto e a unica evidencia disponivel.
  if (conteudoA.size === 0 || conteudoB.size === 0) {
    return jaccard(new Set(a.split(" ")), new Set(b.split(" ")));
  }
  return jaccard(conteudoA, conteudoB);
}

const LIMIAR_PERGUNTA_REPETIDA = 0.7;

const LONGITUDINAL_CHECKS = [
  {
    id: "L1",
    name: "nao repete pergunta ja feita",
    criterion: "quem repete pergunta nao estava ouvindo",
    check: (turno, contexto) => {
      if (contexto.anteriores.length === 0) return null;
      const anteriores = contexto.anteriores.flatMap((t) => extrairPerguntas(t.resposta?.reply_en));
      const atuais = extrairPerguntas(turno.resposta?.reply_en);
      if (atuais.length === 0 || anteriores.length === 0) return null;
      return !atuais.some((atual) =>
        anteriores.some((anterior) => similaridade(atual, anterior) >= LIMIAR_PERGUNTA_REPETIDA),
      );
    },
  },
  {
    id: "L2",
    name: "nao pede dado que o aluno ja deu",
    criterion: "retencao de contexto — o modo de falha mais visivel para quem usa",
    check: (turno, contexto) => {
      const proibidos = turno.espera?.nao_pedir ?? [];
      if (proibidos.length === 0 || contexto.anteriores.length === 0) return null;
      const reply = normalizar(turno.resposta?.reply_en);
      return !proibidos.some((padrao) => reply.includes(normalizar(padrao)));
    },
  },
  {
    id: "L3",
    name: "nao repete correcao ja feita",
    criterion: "repetir correcao e punir quem acabou de acertar",
    check: (turno, contexto) => {
      if (turno.espera?.nao_corrigir_de_novo !== true) return null;
      const correcoes = Array.isArray(turno.resposta?.corrections)
        ? turno.resposta.corrections
        : [];
      if (correcoes.length === 0) return null;
      const originaisCorrigidos = new Set();
      const sugestoesDadas = new Set();
      for (const anterior of contexto.anteriores) {
        for (const c of anterior.resposta?.corrections ?? []) {
          originaisCorrigidos.add(normalizar(c?.original));
          sugestoesDadas.add(normalizar(c?.suggested));
        }
      }
      const falaAtual = normalizar(turno.aluno);
      return !correcoes.some((c) => {
        const original = normalizar(c?.original);
        const sugerido = normalizar(c?.suggested);
        // Perna 1: o trecho citado ja foi corrigido antes — ou a Emma esta corrigindo de
        // novo, ou esta citando fala de turno anterior, e as duas coisas sao defeito.
        if (original && originaisCorrigidos.has(original)) return true;
        // Perna 2: a Emma esta "corrigindo" uma forma que ela mesma sugeriu e que o aluno
        // JA APLICOU nesta fala. E o pior caso: o aluno obedeceu e foi corrigido por isso.
        return Boolean(sugerido) && sugestoesDadas.has(sugerido) && falaAtual.includes(sugerido);
      });
    },
  },
  {
    id: "L4",
    name: "next_action coerente com a etapa",
    criterion: "a conversa avanca quando deve avancar",
    check: (turno) => {
      const aceitos = turno.espera?.next_action ?? [];
      if (aceitos.length === 0) return null;
      return aceitos.includes(turno.resposta?.next_action);
    },
  },
  {
    id: "L5",
    name: "missao fecha (ou nao fecha) onde deve",
    criterion: "sem complete_mission o fecho de licao nunca dispara",
    check: (turno, contexto) => {
      // Conversa livre nao tem objetivo a cumprir: fechar missao ali e inventar um fim.
      if (!contexto.conversa.fecha_missao) {
        return turno.resposta?.next_action !== "complete_mission";
      }
      if (!contexto.ultimo) return null;
      return turno.resposta?.next_action === "complete_mission";
    },
  },
];

// As 13 checagens de turno continuam valendo DENTRO da conversa — o que muda e a origem
// do `record`: em vez do dataset.jsonl, ele vem do proprio turno roteirizado.
function recordDoTurno(turno, conversa) {
  const deveCorrigir = turno.espera?.deve_corrigir ?? [];
  return {
    id: `${conversa.id}-t${turno.n}`,
    aluno: turno.aluno,
    nivel_esperado: conversa.nivel,
    deve_corrigir: deveCorrigir,
    nao_deve_corrigir: turno.espera?.nao_deve_corrigir ?? [],
    tipo_erro: deveCorrigir.length > 0 ? "esperado" : "nenhum",
  };
}

function evaluateConversationTurn(turno, contexto) {
  const result = {};
  for (const check of LONGITUDINAL_CHECKS) {
    try {
      result[check.id] = check.check(turno, contexto);
    } catch {
      result[check.id] = false;
    }
  }
  return result;
}

function evaluateConversation(conversa) {
  const turnos = conversa.turnos ?? [];
  return turnos.map((turno, indice) => {
    const contexto = {
      conversa,
      anteriores: turnos.slice(0, indice),
      // "Ultimo turno GRAVADO" nao e "ultimo turno da conversa": numa conversa interrompida
      // por falha de contrato, o ultimo gravado e apenas onde a rodada parou. Exigir
      // `complete_mission` ali reprovaria o modelo por um turno que ele nunca chegou a ter.
      ultimo: conversa.completa === true && indice === turnos.length - 1,
    };
    return {
      turno,
      turnChecks: evaluateTurn(turno.resposta ?? {}, recordDoTurno(turno, conversa)),
      longChecks: evaluateConversationTurn(turno, contexto),
    };
  });
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
    // C14 (SPEC-20260916-2048-regra-fala-transcrita). Cada caso e um PAR: a violacao tem
    // de reprovar E a correcao legitima vizinha tem de passar. Sem o par, C14 vira alarme
    // de qualquer correcao curta — e o falso positivo aqui e pior que nao medir, porque
    // silenciaria correcao de estrutura real.
    {
      // O caso literal de `livre-02 n1 tranquila`: o modelo corrigiu "english" para
      // "English" com next_action retry, pedindo repeticao por causa de caixa.
      name: "C14 acusa correcao de caixa (english -> English)",
      turn: createFixture({
        corrections: [
          createCorrection({
            original: "english",
            suggested: "English",
            explanation_pt: "Use maiúscula em nomes de línguas.",
            category: "vocabulary",
          }),
        ],
      }),
      record: errorRecord,
      expected: { C14: false },
    },
    {
      name: "C14 acusa correcao de pontuacao (lets go -> let's go)",
      turn: createFixture({
        corrections: [createCorrection({ original: "lets go", suggested: "let's go" })],
      }),
      record: errorRecord,
      expected: { C14: false },
    },
    {
      name: "C14 acusa correcao de acento (cafe -> café)",
      turn: createFixture({
        corrections: [createCorrection({ original: "cafe", suggested: "café" })],
      }),
      record: errorRecord,
      expected: { C14: false },
    },
    {
      // O falso positivo que a SPEC nomeia: a diferenca remove uma palavra, entao NAO e
      // exclusivamente de superficie e a correcao e legitima.
      name: "C14 silencia em mudanca de estrutura (i'm agree -> I agree)",
      turn: createFixture({
        corrections: [createCorrection({ original: "i'm agree", suggested: "I agree" })],
      }),
      record: errorRecord,
      expected: { C14: true },
    },
    {
      name: "C14 silencia na correcao de registro do fixture (I want -> I'd like)",
      turn: createFixture(),
      record: errorRecord,
      expected: { C14: true },
    },
    {
      // `every`: uma correcao de superficie contamina o turno inteiro, mesmo acompanhada
      // de correcao legitima. Turno com as duas ainda entrega grafia ao aluno.
      name: "C14 acusa quando ha correcao legitima E de superficie no mesmo turno",
      turn: createFixture({
        corrections: [
          createCorrection(),
          createCorrection({ original: "english", suggested: "English" }),
        ],
      }),
      record: errorRecord,
      expected: { C14: false },
    },
    {
      name: "sem correcao, C14 nao se aplica",
      turn: createFixture({ corrections: [], next_action: "reply" }),
      record: controlRecord,
      expected: { C14: null },
    },
    // --- C15: correcao emitida pede aplicacao ----------------------------------
    // Uma checagem que nunca acusa nada passa em qualquer rodada e nao protege nada.
    // Estes casos provam que a C15 acusa os quatro valores incoerentes do enum e
    // SILENCIA quando nao ha correcao.
    {
      name: "C15 aceita correcao com retry (caso canonico)",
      turn: createFixture({ next_action: "retry" }),
      record: errorRecord,
      expected: { C15: true },
    },
    {
      // O caso literal de `hotel-10` no prompt-v5: correcao emitida e a conversa segue.
      name: "C15 acusa correcao com reply (o caso hotel-10)",
      turn: createFixture({ next_action: "reply" }),
      record: errorRecord,
      expected: { C15: false },
    },
    {
      // Sem base empirica (0 de 117) — classificado incoerente pela regra aprovada:
      // avancar de etapa com correcao pendente fecha a etapa sem oportunidade de aplicar.
      name: "C15 acusa correcao com continue_mission",
      turn: createFixture({ next_action: "continue_mission" }),
      record: errorRecord,
      expected: { C15: false },
    },
    {
      // Pior caso: a missao termina e nao existe turno futuro onde aplicar.
      name: "C15 acusa correcao com complete_mission",
      turn: createFixture({ next_action: "complete_mission" }),
      record: errorRecord,
      expected: { C15: false },
    },
    {
      name: "sem correcao, C15 nao se aplica",
      turn: createFixture({ corrections: [], next_action: "reply" }),
      record: controlRecord,
      expected: { C15: null },
    },
    {
      // O unico `complete_mission` observado em 117 turnos veio SEM correcao: desfecho
      // limpo. A C15 tem de silenciar aqui, senao reprova o fim legitimo de missao.
      name: "sem correcao com complete_mission, C15 nao se aplica",
      turn: createFixture({ corrections: [], next_action: "complete_mission" }),
      record: controlRecord,
      expected: { C15: null },
    },
    {
      // C15 nao depende de `record` — ao contrario de C12, que precisa de tipo_erro.
      // Isto permite rodar a C15 sobre QUALQUER evidencia, inclusive matriz e conversas,
      // onde o record do dataset nao se aplica. O caso prova a independencia.
      name: "C15 independe do record (controle com correcao e reply reprova)",
      turn: createFixture({ next_action: "reply" }),
      record: controlRecord,
      expected: { C15: false },
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

// Casos das checagens longitudinais. Cada um e um PAR: a violacao tem de reprovar e o
// caso legitimo vizinho tem de passar. Sem o par, L1 vira alarme de qualquer pergunta
// parecida e L3 impede a Emma de corrigir um erro que o aluno REPETIU — as duas coisas
// seriam piores que nao medir nada.
function turnoFake(n, aluno, resposta, espera = {}) {
  return { n, aluno, espera, resposta };
}

function buildConversaTestCases() {
  const conversaMissao = { id: "fake", fecha_missao: true };
  const conversaLivre = { id: "fake-livre", fecha_missao: false };
  return [
    {
      name: "L1 acusa a mesma pergunta reformulada",
      conversa: conversaMissao,
      anteriores: [turnoFake(1, "a", { reply_en: "Nice. What size would you like?" })],
      turno: turnoFake(2, "A small one.", { reply_en: "Got it. Which size do you want?" }),
      expected: { L1: false },
    },
    {
      name: "L1 silencia em pergunta nova sobre outro assunto",
      conversa: conversaMissao,
      anteriores: [turnoFake(1, "a", { reply_en: "Nice. What size would you like?" })],
      turno: turnoFake(2, "A small one.", { reply_en: "Got it. Anything else with that?" }),
      expected: { L1: true },
    },
    {
      name: "L2 acusa pedido de dado ja fornecido",
      conversa: conversaMissao,
      anteriores: [turnoFake(1, "a", { reply_en: "Hello?" })],
      turno: turnoFake(
        2,
        "A small one.",
        { reply_en: "Sure. What size would you like?" },
        {
          nao_pedir: ["what size"],
        },
      ),
      expected: { L2: false },
    },
    {
      name: "L2 silencia quando o padrao proibido nao aparece",
      conversa: conversaMissao,
      anteriores: [turnoFake(1, "a", { reply_en: "Hello?" })],
      turno: turnoFake(
        2,
        "A small one.",
        { reply_en: "Small it is. Anything else?" },
        {
          nao_pedir: ["what size"],
        },
      ),
      expected: { L2: true },
    },
    {
      name: "L3 acusa correcao cujo trecho ja foi corrigido",
      conversa: conversaMissao,
      anteriores: [
        turnoFake(1, "I want a coffee", {
          corrections: [{ original: "I want", suggested: "I'd like", category: "register" }],
        }),
      ],
      turno: turnoFake(
        2,
        "I'd like a coffee, please.",
        { corrections: [{ original: "I want", suggested: "I'd like", category: "register" }] },
        { nao_corrigir_de_novo: true },
      ),
      expected: { L3: false },
    },
    {
      name: "L3 acusa correcao da forma que o aluno acabou de aplicar",
      conversa: conversaMissao,
      anteriores: [
        turnoFake(1, "I want a coffee", {
          corrections: [{ original: "I want", suggested: "I'd like", category: "register" }],
        }),
      ],
      turno: turnoFake(
        2,
        "I'd like a coffee, please.",
        { corrections: [{ original: "I'd like", suggested: "I'd like", category: "register" }] },
        { nao_corrigir_de_novo: true },
      ),
      expected: { L3: false },
    },
    {
      name: "L3 SILENCIA quando o aluno repete o mesmo erro — corrigir de novo e legitimo",
      conversa: conversaMissao,
      anteriores: [
        turnoFake(1, "I want a coffee", {
          corrections: [{ original: "I want", suggested: "I'd like", category: "register" }],
        }),
      ],
      turno: turnoFake(
        2,
        "I want a large one",
        {
          corrections: [
            { original: "I want a large", suggested: "I'd like a large", category: "register" },
          ],
        },
        { nao_corrigir_de_novo: true },
      ),
      expected: { L3: true },
    },
    {
      name: "L4 acusa next_action fora do esperado para a etapa",
      conversa: conversaMissao,
      anteriores: [],
      turno: turnoFake(
        1,
        "By card, please.",
        { next_action: "retry" },
        {
          next_action: ["complete_mission", "continue_mission"],
        },
      ),
      expected: { L4: false },
    },
    {
      name: "L4 aceita qualquer valor da lista da etapa",
      conversa: conversaMissao,
      anteriores: [],
      turno: turnoFake(
        1,
        "By card, please.",
        { next_action: "continue_mission" },
        {
          next_action: ["complete_mission", "continue_mission"],
        },
      ),
      expected: { L4: true },
    },
    {
      name: "L5 acusa missao que nao fecha no ultimo turno",
      conversa: conversaMissao,
      anteriores: [turnoFake(1, "a", { reply_en: "x?" })],
      turno: turnoFake(2, "By card, please.", { next_action: "continue_mission" }),
      ultimo: true,
      expected: { L5: false },
    },
    {
      name: "L5 aceita complete_mission no ultimo turno",
      conversa: conversaMissao,
      anteriores: [turnoFake(1, "a", { reply_en: "x?" })],
      turno: turnoFake(2, "By card, please.", { next_action: "complete_mission" }),
      ultimo: true,
      expected: { L5: true },
    },
    {
      name: "L5 acusa complete_mission em conversa livre — nao ha missao a cumprir",
      conversa: conversaLivre,
      anteriores: [],
      turno: turnoFake(1, "Thank you.", { next_action: "complete_mission" }),
      expected: { L5: false },
    },
    {
      name: "L5 silencia em conversa livre que segue conversando",
      conversa: conversaLivre,
      anteriores: [],
      turno: turnoFake(1, "Thank you.", { next_action: "reply" }),
      expected: { L5: true },
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

  const conversaCases = buildConversaTestCases();
  for (const testCase of conversaCases) {
    const contexto = {
      conversa: testCase.conversa,
      anteriores: testCase.anteriores,
      ultimo: testCase.ultimo === true,
    };
    const actual = evaluateConversationTurn(testCase.turno, contexto);
    for (const [checkId, expected] of Object.entries(testCase.expected)) {
      if (actual[checkId] === expected) continue;
      failures += 1;
      console.log(
        `FALHA ${testCase.name} · ${checkId}: esperado ${expected}, obtido ${actual[checkId]}`,
      );
    }
  }

  // Este caso passa pelo evaluateConversation INTEIRO, e nao pelo contexto injetado a mao:
  // e a montagem do contexto que decide quem e o "ultimo" turno, e era exatamente ali que
  // L5 reprovava uma conversa apenas INTERROMPIDA por falha de contrato.
  const incompleta = {
    id: "fake-incompleta",
    fecha_missao: true,
    completa: false,
    nivel: 2,
    turnos: [
      turnoFake(1, "a", { reply_en: "Hi?", next_action: "reply" }),
      turnoFake(2, "b", { reply_en: "And then?", next_action: "continue_mission" }),
    ],
  };
  const l5Incompleta = evaluateConversation(incompleta).at(-1).longChecks.L5;
  if (l5Incompleta !== null) {
    failures += 1;
    console.log(
      `FALHA L5 nao julga fecho de conversa INCOMPLETA: esperado null, obtido ${l5Incompleta}`,
    );
  }
  const completa = { ...incompleta, id: "fake-completa", completa: true };
  const l5Completa = evaluateConversation(completa).at(-1).longChecks.L5;
  if (l5Completa !== false) {
    failures += 1;
    console.log(`FALHA L5 julga fecho de conversa COMPLETA: esperado false, obtido ${l5Completa}`);
  }

  console.log(
    `\nself-test: ${cases.length} casos de turno + ${matrizCases.length} de matriz + ${tamanhoCases.length} de tamanho + ${geracaoCases.length} de classificacao de geracao + ${conversaCases.length + 2} longitudinais · ${CHECKS.length} checagens de turno + ${LONGITUDINAL_CHECKS.length} longitudinais · ${failures} falha(s)`,
  );
  if (failures === 0) console.log("as checagens mecanicas se comportam como especificado.");
  process.exit(failures > 0 ? 1 : 0);
}

// A varredura e a mesma; a RAIZ e que decide o significado do resultado. Ver
// `findEvidenceTargets` (execucao atual) e `findHistoricalEvidenceTargets` (historico).
function collectEvidenceTargets(rootDir) {
  const activeDir = rootDir;
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
      // `conversas/` guarda uma conversa inteira por arquivo, nao um turno: lida por aqui
      // viraria "unreadable" e sujaria a contagem. Ela tem caminho proprio (--conversas).
      const subgrupos = entradas.filter(
        (name) => name !== "conversas" && fs.statSync(path.join(modelDir, name)).isDirectory(),
      );
      if (temJsonSolto) targets.push({ spec, model, modelDir });
      for (const grupo of subgrupos) {
        targets.push({ spec, model: `${model}/${grupo}`, modelDir: path.join(modelDir, grupo) });
      }
    }
  }
  return targets;
}

// Evidencia da EXECUCAO ATUAL: a SPEC ativa deste worktree. E a unica fonte da tabela da
// rodada (`printTable`) e dos gates — comportamento inalterado.
function findEvidenceTargets() {
  return collectEvidenceTargets(path.join(PROJECT_ROOT, "docs", "active"));
}

// Evidencia HISTORICA: rodadas de SPECs ja arquivadas. Fonte SEPARADA de proposito
// (SPEC-20260916-2048-regra-fala-transcrita, decisao do usuario em 2026-09-16): serve
// APENAS a levantamento e comparacao. Nenhum gate e nenhuma tabela de rodada le daqui —
// somar turnos de SPEC antiga na medida da execucao corrente daria uma media que nao
// significa nada, e e exatamente o que a separacao impede.
function findHistoricalEvidenceTargets() {
  return collectEvidenceTargets(path.join(PROJECT_ROOT, "docs", "archive"));
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

function findConversationFiles() {
  const activeDir = path.join(PROJECT_ROOT, "docs", "active");
  if (!fs.existsSync(activeDir)) return [];
  const arquivos = [];
  for (const spec of fs.readdirSync(activeDir).filter((name) => name.startsWith("SPEC-"))) {
    const evidenceDir = path.join(activeDir, spec, "evidence");
    if (!fs.existsSync(evidenceDir)) continue;
    for (const model of fs.readdirSync(evidenceDir).filter((name) => !name.startsWith("_"))) {
      const grupoDir = path.join(evidenceDir, model, "conversas");
      if (!fs.existsSync(grupoDir)) continue;
      for (const file of fs.readdirSync(grupoDir).filter((name) => name.endsWith(".json"))) {
        arquivos.push({ model, filePath: path.join(grupoDir, file) });
      }
    }
  }
  return arquivos;
}

function marcaDe(valor) {
  if (valor === null || valor === undefined) return "  ";
  return valor ? "ok" : "XX";
}

// O relatorio de conversa NAO e tabela por decisao do contrato: uma conversa so revela
// incoerencia quando lida em sequencia. A tabela entra no fim, como resumo do que ja foi
// lido — nunca como substituta da leitura.
function relatorioConversas() {
  const arquivos = findConversationFiles();
  if (arquivos.length === 0) {
    console.log("nenhuma evidencia de conversa em docs/active/*/evidence/*/conversas/");
    process.exit(1);
  }

  const totais = {};
  let turnosLidos = 0;
  let incompletas = 0;

  for (const { model, filePath } of arquivos) {
    const conversa = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const avaliacoes = evaluateConversation(conversa);
    const estado = conversa.completa ? "completa" : "INCOMPLETA";
    if (!conversa.completa) incompletas += 1;

    console.log(`\n${"=".repeat(78)}`);
    console.log(
      `${conversa.id} · ${model} · missao ${conversa.missao} · nivel ${conversa.nivel} · tom ${conversa.tom} · prompt ${conversa.prompt_version} · ${estado}`,
    );
    console.log("=".repeat(78));

    for (const { turno, turnChecks, longChecks } of avaliacoes) {
      turnosLidos += 1;
      const resposta = turno.resposta ?? {};
      console.log(`\n[t${turno.n}] aluno: ${turno.aluno}`);
      console.log(`      emma : ${resposta.reply_en ?? "—"}`);
      if (resposta.instruction_pt) console.log(`      guia : ${resposta.instruction_pt}`);
      for (const c of resposta.corrections ?? []) {
        console.log(
          `      corr : "${c.original}" -> "${c.suggested}" (${c.category}) · ${c.explanation_pt}`,
        );
      }
      console.log(
        `      next : ${resposta.next_action ?? "—"}  (esperado: ${(turno.espera?.next_action ?? []).join("|") || "—"})`,
      );

      const falhas = [];
      for (const check of [...LONGITUDINAL_CHECKS, ...CHECKS]) {
        const valor = longChecks[check.id] ?? turnChecks[check.id];
        if (valor === null || valor === undefined) continue;
        totais[check.id] ??= { passed: 0, total: 0 };
        totais[check.id].total += 1;
        if (valor) totais[check.id].passed += 1;
        else falhas.push(`${check.id} ${check.name}`);
      }
      if (falhas.length > 0) console.log(`      FALHA: ${falhas.join(" · ")}`);
      if (turno.espera?.nota) console.log(`      nota : ${turno.espera.nota}`);
    }
  }

  console.log(`\n${"=".repeat(78)}`);
  console.log("resumo mecanico (a leitura acima e que decide se soa como conversa)");
  console.log("=".repeat(78));
  for (const check of [...LONGITUDINAL_CHECKS, ...CHECKS]) {
    const t = totais[check.id];
    if (!t) continue;
    const pct = t.total === 0 ? "—" : `${Math.round((t.passed / t.total) * 100)}%`;
    console.log(
      `${check.id.padEnd(4)} ${String(t.passed + "/" + t.total).padEnd(8)} ${pct.padEnd(5)} ${check.name}`,
    );
  }
  console.log(
    `\nconversas: ${arquivos.length} · turnos: ${turnosLidos} · incompletas: ${incompletas}`,
  );
  console.log(
    "O VEREDITO E HUMANO: nenhuma destas checagens sabe se a conversa soa como conversa.",
  );
  process.exit(incompletas > 0 ? 1 : 0);
}

// Levantamento da SPEC-20260916-2048-regra-fala-transcrita: a taxa real de correcao de
// grafia nas evidencias JA GRAVADAS, sem uma unica chamada nova ao modelo. Le as duas
// fontes e as reporta SEPARADAS — a atual mede a rodada em curso, a historica mede o
// passado; a soma das duas nao e uma taxa, e uma mistura.
function levantamentoSuperficie() {
  const fontes = [
    { rotulo: "execucao atual (docs/active/)", targets: findEvidenceTargets() },
    { rotulo: "historico (docs/archive/)", targets: findHistoricalEvidenceTargets() },
  ];

  let algumaEvidencia = false;

  for (const fonte of fontes) {
    console.log(`\n${"=".repeat(78)}`);
    console.log(fonte.rotulo);
    console.log("=".repeat(78));
    if (fonte.targets.length === 0) {
      console.log("  nenhuma evidencia nesta fonte.");
      continue;
    }

    let turnos = 0;
    let turnosComCorrecao = 0;
    let turnosViolando = 0;
    let correcoes = 0;
    let correcoesSuperficie = 0;
    let violandoComRetry = 0;
    const casos = [];

    for (const target of fonte.targets) {
      const files = fs.readdirSync(target.modelDir).filter((name) => name.endsWith(".json"));
      for (const file of files) {
        const raw = JSON.parse(fs.readFileSync(path.join(target.modelDir, file), "utf8"));
        const turn = extractTurn(raw);
        if (!turn) continue;
        turnos += 1;
        const lista = Array.isArray(turn.corrections) ? turn.corrections : [];
        if (lista.length === 0) continue;
        turnosComCorrecao += 1;
        correcoes += lista.length;
        const suspeitas = lista.filter((c) => isSurfaceOnlyCorrection(c));
        if (suspeitas.length === 0) continue;
        correcoesSuperficie += suspeitas.length;
        turnosViolando += 1;
        if (turn.next_action === "retry") violandoComRetry += 1;
        for (const c of suspeitas) {
          casos.push({
            spec: target.spec,
            model: target.model,
            file,
            original: c?.original,
            suggested: c?.suggested,
            category: c?.category,
            explanation_pt: c?.explanation_pt,
            next_action: turn.next_action,
          });
        }
      }
    }

    algumaEvidencia = algumaEvidencia || turnos > 0;

    const pct = (parte, todo) => (todo === 0 ? "—" : `${((parte / todo) * 100).toFixed(1)}%`);
    console.log(`  alvos              : ${fonte.targets.length}`);
    console.log(`  turnos lidos       : ${turnos}`);
    console.log(`  turnos com correcao: ${turnosComCorrecao}`);
    console.log(`  correcoes emitidas : ${correcoes}`);
    console.log(
      `  correcoes de grafia: ${correcoesSuperficie} (${pct(correcoesSuperficie, correcoes)} das correcoes)`,
    );
    console.log(
      `  turnos violando    : ${turnosViolando} (${pct(turnosViolando, turnosComCorrecao)} dos turnos com correcao)`,
    );
    console.log(`  destes, com retry  : ${violandoComRetry}  <- o pior caso da invariante`);

    if (casos.length > 0) {
      console.log("\n  casos (leitura humana obrigatoria antes de virar gate):");
      for (const c of casos) {
        console.log(`  - ${c.spec} · ${c.model} · ${c.file}`);
        console.log(
          `      "${c.original}" -> "${c.suggested}"  (${c.category}, next_action: ${c.next_action})`,
        );
        console.log(`      ${c.explanation_pt}`);
      }
    }
  }

  console.log(
    "\nnota: `conversas/` nao entra aqui — uma conversa e um arquivo com varios turnos e tem",
  );
  console.log("caminho proprio (--conversas). Este levantamento cobre as rodadas por turno.");
  if (!algumaEvidencia) {
    console.log("\nnenhuma evidencia legivel em nenhuma das duas fontes.");
    process.exit(1);
  }
}

// Levantamento da SPEC-20260916-2048-semantica-next-action: a taxa real de correcao
// emitida SEM pedido de aplicacao nas evidencias JA GRAVADAS, sem uma unica chamada nova
// ao modelo. Mesma forma do levantamento de grafia acima, e pela mesma razao: a checagem
// nova precisa de uma taxa ANTES da intervencao, senao nao se sabe se instrucao de prompt
// bastaria. Reporta as duas fontes SEPARADAS — somar atual com historico nao da taxa, da
// mistura.
function levantamentoAplicacao() {
  const fontes = [
    { rotulo: "execucao atual (docs/active/)", targets: findEvidenceTargets() },
    { rotulo: "historico (docs/archive/)", targets: findHistoricalEvidenceTargets() },
  ];

  const ENUM_NEXT_ACTION = ["retry", "reply", "continue_mission", "complete_mission"];
  let algumaEvidencia = false;

  for (const fonte of fontes) {
    console.log(`\n${"=".repeat(78)}`);
    console.log(fonte.rotulo);
    console.log("=".repeat(78));
    if (fonte.targets.length === 0) {
      console.log("  nenhuma evidencia nesta fonte.");
      continue;
    }

    let turnos = 0;
    let semCampo = 0;
    // distribuicao["com"|"sem"][next_action] — o cruzamento que a tabela de coerencia usa
    const distribuicao = { com: {}, sem: {} };
    const casos = [];

    for (const target of fonte.targets) {
      const files = fs.readdirSync(target.modelDir).filter((name) => name.endsWith(".json"));
      for (const file of files) {
        const raw = JSON.parse(fs.readFileSync(path.join(target.modelDir, file), "utf8"));
        const turn = extractTurn(raw);
        if (!turn) continue;
        turnos += 1;

        // Evidencia anterior ao contrato do turno v2 nao tem `next_action`. Fica fora da
        // taxa por AUSENCIA DO CAMPO, nunca contada como violacao — contar ausencia como
        // falha inventaria uma lacuna que aquele contrato nao tinha como ter.
        if (typeof turn.next_action !== "string") {
          semCampo += 1;
          continue;
        }

        const lado = countCorrections(turn) > 0 ? "com" : "sem";
        distribuicao[lado][turn.next_action] = (distribuicao[lado][turn.next_action] ?? 0) + 1;

        if (lado === "com" && turn.next_action !== "retry") {
          casos.push({
            spec: target.spec,
            model: target.model,
            file,
            next_action: turn.next_action,
            nCorrecoes: turn.corrections.length,
            categorias: turn.corrections.map((c) => c?.category).join(", "),
          });
        }
      }
    }

    algumaEvidencia = algumaEvidencia || turnos > 0;

    const somaLado = (lado) => Object.values(distribuicao[lado]).reduce((a, b) => a + b, 0);
    const comCorrecao = somaLado("com");
    const semCorrecao = somaLado("sem");
    const pct = (parte, todo) => (todo === 0 ? "—" : `${((parte / todo) * 100).toFixed(1)}%`);

    console.log(`  alvos                    : ${fonte.targets.length}`);
    console.log(`  turnos lidos             : ${turnos}`);
    console.log(`  sem next_action (pre-v2) : ${semCampo}  <- fora da taxa, campo inexistente`);
    console.log(`  turnos mensuraveis       : ${comCorrecao + semCorrecao}`);

    for (const lado of ["com", "sem"]) {
      const total = lado === "com" ? comCorrecao : semCorrecao;
      console.log(`\n  ${lado} correcao — ${total} turnos:`);
      for (const na of ENUM_NEXT_ACTION) {
        const n = distribuicao[lado][na] ?? 0;
        const marca = lado === "com" && na !== "retry" && n > 0 ? "  <- incoerente" : "";
        console.log(`    ${na.padEnd(18)} ${String(n).padStart(4)}  ${pct(n, total)}${marca}`);
      }
    }

    const naoPedeAplicacao = comCorrecao - (distribuicao.com.retry ?? 0);
    console.log(
      `\n  A LACUNA: ${naoPedeAplicacao} de ${comCorrecao} turnos com correcao (${pct(naoPedeAplicacao, comCorrecao)}) nao pedem aplicacao`,
    );
    console.log("  (e exatamente o que a C15 acusa)");

    if (casos.length > 0) {
      console.log("\n  casos:");
      for (const c of casos) {
        console.log(
          `  - ${c.spec} · ${c.model} · ${c.file}  ->  next_action=${c.next_action}, ${c.nCorrecoes} correcao(oes) [${c.categorias}]`,
        );
      }
    }
  }

  console.log(
    "\nnota: `conversas/` nao entra aqui — uma conversa e um arquivo com varios turnos e tem",
  );
  console.log("caminho proprio (--conversas). Este levantamento cobre as rodadas por turno.");
  if (!algumaEvidencia) {
    console.log("\nnenhuma evidencia legivel em nenhuma das duas fontes.");
    process.exit(1);
  }
}

const argv = process.argv;
if (argv.includes("--levantamento-aplicacao")) levantamentoAplicacao();
else if (argv.includes("--levantamento-superficie")) levantamentoSuperficie();
else if (argv.includes("--conversas")) relatorioConversas();
else if (argv.includes("--self-test")) runSelfTest();
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

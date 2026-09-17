/**
 * Catálogo das perguntas do onboarding (SPEC-20260916-1652-onboarding-e-perfil).
 *
 * DADO declarativo, não componente. A tela é uma só, parametrizada por este catálogo — a
 * forma que o protótipo já usava (`QUESTIONS` + `questionView`) e que o contrato desta SPEC
 * decidiu manter.
 *
 * Os enunciados e as opções são CÓPIA LITERAL do protótipo. A §2.2 do prompt de
 * desenvolvimento manda fidelidade de ordem, conteúdo, hierarquia e estados; a forma
 * (tipografia, cor, componente) é livre, o texto não.
 *
 * SÃO SEIS, e não as oito do protótipo. `quantoFala` e `quando` foram cortadas por decisão
 * registrada no contrato: não alimentam nenhuma decisão na Fase 1, e toda pergunta no
 * onboarding custa desistência. Cobrar por nada é o pior negócio possível na tela de
 * entrada.
 */
import type { Level } from "../domain";

/** As chaves das perguntas que esta SPEC captura, na ORDEM em que aparecem. */
export const ORDEM_DAS_PERGUNTAS = [
  "audio",
  "nivel",
  "motivo",
  "bloqueio",
  "minutos",
  "personalidade",
] as const;

export type ChaveDePergunta = (typeof ORDEM_DAS_PERGUNTAS)[number];

export interface OpcaoDePergunta {
  /** Rótulo exibido. É também o valor gravado na resposta — como no protótipo. */
  readonly label: string;
  /** Subtítulo. String vazia quando o protótipo não tem um. */
  readonly sub: string;
}

export interface Pergunta {
  readonly key: ChaveDePergunta;
  readonly prompt: string;
  /** Nota de rodapé. Só `audio` tem uma no protótipo. */
  readonly note?: string;
  readonly options: readonly OpcaoDePergunta[];
}

export const PERGUNTAS: Readonly<Record<ChaveDePergunta, Pergunta>> = {
  audio: {
    key: "audio",
    prompt: "Antes de começar: como você prefere me ouvir?",
    note: "Você pode mudar isso depois",
    options: [
      { label: "Pode falar normalmente", sub: "Eu falo em inglês em toda a conversa." },
      { label: "Só nos exercícios de fala", sub: "No resto, você lê as minhas respostas." },
    ],
  },
  nivel: {
    key: "nivel",
    prompt: "Quanto você entende de inglês?",
    options: [
      { label: "Não sei nada de inglês", sub: "" },
      { label: "Conheço algumas palavras comuns", sub: "" },
      { label: "Consigo ter conversas simples", sub: "" },
      { label: "Consigo falar de assuntos variados", sub: "" },
      { label: "Falo sobre a maioria dos assuntos em detalhes", sub: "" },
    ],
  },
  motivo: {
    key: "motivo",
    prompt: "Por que você quer falar inglês?",
    options: [
      { label: "Viagem", sub: "" },
      { label: "Trabalho e carreira", sub: "" },
      { label: "Conversar sem travar", sub: "" },
      { label: "Estudo ou prova", sub: "" },
    ],
  },
  bloqueio: {
    key: "bloqueio",
    prompt: "O que mais te trava hoje?",
    options: [
      { label: "Vergonha de errar", sub: "" },
      { label: "Não sei o que responder", sub: "" },
      { label: "Falta de gente pra praticar", sub: "" },
      { label: "Congelo na hora de responder", sub: "" },
    ],
  },
  minutos: {
    key: "minutos",
    prompt: "Quantos minutos por dia dá pra encaixar?",
    options: [
      { label: "5 minutos", sub: "uma conversa curta" },
      { label: "10 minutos", sub: "o ritmo mais comum" },
      { label: "20 minutos", sub: "pra acelerar" },
      { label: "30 minutos", sub: "modo turbo" },
    ],
  },
  personalidade: {
    key: "personalidade",
    prompt: "Como você quer que eu seja na primeira lição?",
    options: [
      { label: "Tranquila", sub: "Paciente. Reconhece o que deu certo antes de corrigir." },
      { label: "Direta", sub: "Sem rodeios. Corrige na hora e cobra a repetição." },
    ],
  },
};

/**
 * Nível autoavaliado por índice da opção escolhida em `nivel`.
 *
 * As 5 opções do protótipo correspondem a 1..5 na ordem. O contrato é explícito: isto é
 * PONTO DE PARTIDA DECLARADO, nunca classificação — quem classifica é `LevelAssessment`,
 * com evidência citada, e nenhuma tela pode sugerir o contrário.
 */
export const NIVEL_POR_INDICE: readonly Level[] = [1, 2, 3, 4, 5];

/** Minutos por dia por índice da opção escolhida em `minutos`. */
export const MINUTOS_POR_INDICE: readonly number[] = [5, 10, 20, 30];

/**
 * As telas do percurso, em ordem, incluindo as que NÃO são pergunta.
 *
 * Existe para a barra de progresso contar telas REAIS. O protótipo calculava o percentual
 * sobre 8 perguntas e tinha 4 telas intercaladas fora da contagem, o que fazia o progresso
 * pular — o contrato desta SPEC trata isso como bug de UX a corrigir, não a reproduzir.
 */
export const PERCURSO = ["entrada", "promessa", ...ORDEM_DAS_PERGUNTAS] as const;

export type TelaDoPercurso = (typeof PERCURSO)[number];

/** Progresso 0..1 da tela informada, contando telas reais do percurso. */
export function progressoDa(tela: TelaDoPercurso): number {
  const indice = PERCURSO.indexOf(tela);
  if (indice < 0) return 0;
  return (indice + 1) / PERCURSO.length;
}

/** A tela seguinte, ou `undefined` quando o percurso terminou. */
export function telaSeguinte(tela: TelaDoPercurso): TelaDoPercurso | undefined {
  const indice = PERCURSO.indexOf(tela);
  if (indice < 0) return undefined;
  return PERCURSO[indice + 1];
}

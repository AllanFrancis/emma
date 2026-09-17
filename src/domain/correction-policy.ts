/**
 * Política de correção (SPEC-20260916-1652-nucleo-pedagogico).
 *
 * Duas invariantes moram aqui:
 * - "NUNCA mais de 3 correções saem do núcleo, e a truncagem é por prioridade de
 *   `category`, nunca por ordem de chegada."
 * - "Correção cujo `original` não ocorre na fala do aluno é rejeitada" (DEC-20260916-1611).
 */
import type { Category, Correction } from "./turn-contract.generated";

/** O teto do schema (`maxItems: 3`) repetido como regra executável do núcleo. */
export const MAX_CORRECTIONS = 3;

/**
 * Ordem de prioridade: o que QUEBRA a comunicação vence o que é questão de registro.
 *
 * É dado configurável de propósito. O main.md registra o risco: a ordem entre `grammar` e
 * `register` é opinião até ser medida, e a eval de personalidade pode medi-la. Trocar a
 * ordem aqui não exige tocar em nenhuma função.
 */
export const PRIORIDADE_DE_CATEGORIA: readonly Category[] = [
  // Falso cognato inverte o sentido: "pretend" por "intend" faz o ouvinte entender o
  // oposto. É o erro mais caro que existe numa conversa.
  "false_friend",
  // Ordem de palavras quebra a frase inteira para quem ouve.
  "word_order",
  // Gramática sistemática: o aluno repetiria o padrão em toda frase parecida.
  "grammar",
  "preposition",
  "vocabulary",
  // Registro comunica, só soa mal. Corrigir é ganho real, mas é o primeiro a ceder o lugar.
  "register",
];

const PESO: ReadonlyMap<Category, number> = new Map(
  PRIORIDADE_DE_CATEGORIA.map((categoria, indice) => [categoria, indice]),
);

/**
 * Normalização para conferir evidência: a fala é TRANSCRITA, então caixa, tipo de
 * apóstrofo e espaço em excesso variam sem que nada mude no que foi dito. Mesmo critério
 * do `normalizeForEvidence` do harness de eval — a regra é uma só, em duas linguagens.
 */
function normalizar(texto: string): string {
  return String(texto ?? "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function semPontuacaoDeBorda(texto: string): string {
  return texto.replace(/^[\s"'.,!?;:]+/, "").replace(/[\s"'.,!?;:]+$/, "");
}

/**
 * A correção cita a fala do aluno LITERALMENTE ou não existe. Paráfrase não é evidência:
 * o aluno não tem como reconhecer o próprio erro numa frase que ele não disse.
 */
export function temEvidencia(correction: Correction, learnerUtterance: string): boolean {
  const agulha = semPontuacaoDeBorda(normalizar(correction?.original ?? ""));
  if (agulha === "") return false;
  return normalizar(learnerUtterance).includes(agulha);
}

export interface CorrecoesResolvidas {
  readonly aceitas: readonly Correction[];
  /** Recusadas por falta de evidência na fala do aluno. */
  readonly semEvidencia: readonly Correction[];
  /** Válidas, mas cortadas pelo teto de 3 — por prioridade, não por ordem de chegada. */
  readonly truncadas: readonly Correction[];
}

/**
 * Filtra por evidência, ordena por prioridade de categoria e corta no teto.
 *
 * A ordenação é ESTÁVEL dentro da mesma categoria: duas correções de `grammar` mantêm a
 * ordem em que o modelo as propôs, porque aí não há critério pedagógico para desempatar.
 */
export function resolverCorrecoes(
  correcoes: readonly Correction[],
  learnerUtterance: string,
  maxCorrections: number = MAX_CORRECTIONS,
): CorrecoesResolvidas {
  const semEvidencia: Correction[] = [];
  const comEvidencia: Correction[] = [];

  for (const correcao of correcoes ?? []) {
    if (temEvidencia(correcao, learnerUtterance)) comEvidencia.push(correcao);
    else semEvidencia.push(correcao);
  }

  const ordenadas = comEvidencia
    .map((correcao, indice) => ({ correcao, indice }))
    .sort((a, b) => {
      const pesoA = PESO.get(a.correcao.category) ?? PRIORIDADE_DE_CATEGORIA.length;
      const pesoB = PESO.get(b.correcao.category) ?? PRIORIDADE_DE_CATEGORIA.length;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return a.indice - b.indice;
    })
    .map((entrada) => entrada.correcao);

  const teto = Math.max(0, Math.min(maxCorrections, MAX_CORRECTIONS));
  return {
    aceitas: ordenadas.slice(0, teto),
    semEvidencia,
    truncadas: ordenadas.slice(teto),
  };
}

/**
 * Quantas correções o turno pode carregar, dado o nível. Nível baixo aguenta menos
 * correção por turno: três correções para quem está no N1 é o que faz a pessoa desistir.
 */
export function maxCorrectionsPara(nivel: number): number {
  if (nivel <= 1) return 1;
  if (nivel <= 3) return 2;
  return MAX_CORRECTIONS;
}

/**
 * Política de suporte em pt-BR (SPEC-20260916-1652-nucleo-pedagogico).
 *
 * Invariante da SPEC: "NUNCA a proporção de português é escrita na interface; ela vem da
 * política, por nível." Por isso isto é TABELA DE DADOS, não `if` — a interface pergunta e
 * recebe um número, sem saber de onde veio nem poder discordar.
 */
import type { Level, TeacherPreferences } from "./types";

/**
 * Proporção de apoio em pt-BR por nível. N1 quase tudo traduzido, N5 praticamente nada:
 * o apoio existe para destravar quem não entende, e mantê-lo alto em nível alto rouba a
 * exposição ao inglês que é o produto.
 */
const SUPORTE_POR_NIVEL: Readonly<Record<Level, number>> = {
  1: 1,
  2: 0.75,
  3: 0.5,
  4: 0.25,
  5: 0.1,
};

/**
 * A preferência da professora DESLOCA a tabela, nunca a substitui. Um aluno N1 com
 * `supportLevel: minimo` continua recebendo mais apoio que um N4 com `alto` — nível é
 * evidência, preferência é gosto, e evidência ganha.
 */
const AJUSTE_POR_PREFERENCIA: Readonly<Record<TeacherPreferences["supportLevel"], number>> = {
  minimo: -0.15,
  medio: 0,
  alto: 0.15,
};

export function supportRatio(nivel: Level, preferences: TeacherPreferences): number {
  const base = SUPORTE_POR_NIVEL[nivel];
  const ajustado = base + AJUSTE_POR_PREFERENCIA[preferences.supportLevel];
  const limitado = Math.min(1, Math.max(0, ajustado));
  // Duas casas: a proporção alimenta decisão de quanto traduzir, não cálculo financeiro.
  return Math.round(limitado * 100) / 100;
}

export const TABELA_DE_SUPORTE = SUPORTE_POR_NIVEL;

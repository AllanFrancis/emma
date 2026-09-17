/**
 * Preferências efetivas (SPEC-20260916-1652-nucleo-pedagogico).
 *
 * A separação entre preferências PERSISTENTES e overrides de SESSÃO resolve por merge, e a
 * sessão NUNCA escreve no perfil — mesmo sem nenhum controle de override na interface da
 * Fase 1. A regra existe desde já porque, quando a tela existir, ela não vai ter como
 * escolher errado.
 */
import type { PreferenceOverrides, SessionState, TeacherPreferences } from "./types";

/**
 * `{...persistentes, ...overrides}`: o override ganha no turno, e some quando a sessão
 * acaba. Devolve objeto NOVO — nada aqui muta a entrada, então não há como um override
 * vazar para o perfil por referência compartilhada.
 */
export function preferenciasEfetivas(
  persistentes: TeacherPreferences,
  session: Pick<SessionState, "overrides">,
): TeacherPreferences {
  const overrides: PreferenceOverrides = session.overrides ?? {};
  // Chave presente com `undefined` não deve apagar a preferência persistente: um spread
  // cru faria exatamente isso.
  const limpos = Object.fromEntries(
    Object.entries(overrides).filter(([, valor]) => valor !== undefined),
  ) as Partial<TeacherPreferences>;
  return { ...persistentes, ...limpos };
}

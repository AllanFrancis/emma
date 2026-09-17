/**
 * Persistência do onboarding na Fase 1 (SPEC-20260916-1652-onboarding-e-perfil).
 *
 * Vive no CLIENTE, sem banco. O contrato assume o risco explicitamente: "limpar o navegador
 * apaga o onboarding — aceitável sem autenticação, e é exatamente o que a Fase 2 resolve."
 *
 * Duas coisas separadas de propósito:
 *  - as RESPOSTAS cruas, que precisam sobreviver a um recarregamento no meio do percurso;
 *  - o PERFIL montado, que é o que o núcleo consome quando o percurso termina.
 *
 * Toda leitura tolera dado ausente, corrompido ou de versão antiga devolvendo vazio, em vez
 * de lançar. Onboarding que quebra por causa de `localStorage` sujo é pior que onboarding
 * que recomeça.
 */
import type { LearnerProfile, TeacherPreferences } from "../domain";
import { montarPerfil, respostasCompletas, type Respostas } from "./perfil";
import { ORDEM_DAS_PERGUNTAS, PERGUNTAS, type ChaveDePergunta } from "./questions";

const CHAVE_RESPOSTAS = "emma.onboarding.respostas.v1";
const CHAVE_PERFIL = "emma.perfil.v1";

export interface PerfilPersistido {
  readonly profile: LearnerProfile;
  readonly preferences: TeacherPreferences;
  readonly concluidoEm: string;
}

/** `localStorage` quando existe. `undefined` no servidor, e isso não é erro. */
function deposito(): Storage | undefined {
  try {
    if (typeof globalThis.localStorage === "undefined") return undefined;
    return globalThis.localStorage;
  } catch {
    // Navegador com armazenamento bloqueado. O percurso continua, sem retomada.
    return undefined;
  }
}

function ler<T>(chave: string): T | undefined {
  const d = deposito();
  if (!d) return undefined;
  try {
    const cru = d.getItem(chave);
    if (!cru) return undefined;
    return JSON.parse(cru) as T;
  } catch {
    return undefined;
  }
}

function gravar(chave: string, valor: unknown): void {
  const d = deposito();
  if (!d) return;
  try {
    d.setItem(chave, JSON.stringify(valor));
  } catch {
    // Cota cheia ou modo privado. Não vale derrubar o onboarding por isso.
  }
}

/**
 * Respostas gravadas, filtradas contra o catálogo ATUAL.
 *
 * O filtro importa: se uma pergunta sair do catálogo ou uma opção mudar de texto, o valor
 * velho no navegador deixa de ser válido. Devolvê-lo faria `montarPerfil` lançar por
 * "resposta que não está no catálogo" numa sessão que o usuário não tem como consertar.
 */
export function lerRespostas(): Respostas {
  const cru = ler<Record<string, unknown>>(CHAVE_RESPOSTAS);
  if (!cru || typeof cru !== "object") return {};
  const limpas: Respostas = {};
  for (const chave of ORDEM_DAS_PERGUNTAS) {
    const valor = cru[chave];
    if (typeof valor !== "string") continue;
    if (!PERGUNTAS[chave].options.some((o) => o.label === valor)) continue;
    limpas[chave] = valor;
  }
  return limpas;
}

export function gravarResposta(chave: ChaveDePergunta, label: string): Respostas {
  const atuais = lerRespostas();
  const proximas: Respostas = { ...atuais, [chave]: label };
  gravar(CHAVE_RESPOSTAS, proximas);
  return proximas;
}

/**
 * Conclui o onboarding: monta e grava perfil e preferências.
 *
 * Lança se as respostas estiverem incompletas — a checagem vem de `montarPerfil`, que é a
 * fonte única dessa regra.
 */
export function concluirOnboarding(respostas: Respostas = lerRespostas()): PerfilPersistido {
  const { profile, preferences } = montarPerfil(respostas);
  const persistido: PerfilPersistido = {
    profile,
    preferences,
    concluidoEm: new Date().toISOString(),
  };
  gravar(CHAVE_PERFIL, persistido);
  return persistido;
}

export function lerPerfil(): PerfilPersistido | undefined {
  const cru = ler<PerfilPersistido>(CHAVE_PERFIL);
  if (!cru?.profile || !cru.preferences) return undefined;
  return cru;
}

export function onboardingConcluido(): boolean {
  return lerPerfil() !== undefined;
}

/** `true` quando dá para montar o perfil com o que já está gravado. */
export function prontoParaConcluir(): boolean {
  return respostasCompletas(lerRespostas());
}

/** Só para teste e para o botão de recomeçar. */
export function limparOnboarding(): void {
  const d = deposito();
  if (!d) return;
  try {
    d.removeItem(CHAVE_RESPOSTAS);
    d.removeItem(CHAVE_PERFIL);
  } catch {
    // Sem armazenamento não há o que limpar.
  }
}

/**
 * Respostas do onboarding → `LearnerProfile` + `TeacherPreferences`
 * (SPEC-20260916-1652-onboarding-e-perfil).
 *
 * Função pura. A forma dos dois objetos é definida pelo núcleo pedagógico
 * (SPEC-20260916-1652-nucleo-pedagogico, arquivada) e importada de `../domain` — esta SPEC
 * consome a forma, não a inventa.
 *
 * Invariante do contrato: todo campo gravado tem consumidor no núcleo. Campo no perfil sem
 * consumidor é dívida, não previsão — e é por isso que `preferredTime` NÃO é gravado aqui.
 */
import type { LearnerProfile, TeacherPreferences } from "../domain";
import { PREFERENCIAS_NAO_PERGUNTADAS } from "./defaults";
import {
  MINUTOS_POR_INDICE,
  NIVEL_POR_INDICE,
  ORDEM_DAS_PERGUNTAS,
  PERGUNTAS,
  type ChaveDePergunta,
} from "./questions";

/** Respostas cruas: chave da pergunta → `label` da opção escolhida. */
export type Respostas = Partial<Record<ChaveDePergunta, string>>;

export interface PerfilCapturado {
  readonly profile: LearnerProfile;
  readonly preferences: TeacherPreferences;
}

/** `true` quando todas as seis perguntas têm resposta. */
export function respostasCompletas(respostas: Respostas): boolean {
  return ORDEM_DAS_PERGUNTAS.every((chave) => typeof respostas[chave] === "string");
}

/** Índice da opção escolhida, ou -1 se não respondida ou desconhecida. */
function indiceDaEscolha(respostas: Respostas, chave: ChaveDePergunta): number {
  const escolhido = respostas[chave];
  if (typeof escolhido !== "string") return -1;
  return PERGUNTAS[chave].options.findIndex((o) => o.label === escolhido);
}

/**
 * `supportLevel` a partir da preferência de áudio.
 *
 * "Pode falar normalmente" (índice 0) = a pessoa aceita inglês em toda a conversa, então
 * precisa de MENOS apoio em português. "Só nos exercícios de fala" (índice 1) = quer ler as
 * respostas, então precisa de MAIS.
 *
 * Não existe caminho para `"minimo"` a partir de duas opções: o mínimo pressupõe alguém que
 * dispensa apoio, e o onboarding não tem como saber isso ainda. Quem move este valor depois
 * é a política de nível com evidência, não o onboarding.
 */
const SUPPORT_LEVEL_POR_AUDIO: readonly TeacherPreferences["supportLevel"][] = ["medio", "alto"];

/** `style` a partir da escolha de personalidade. */
const STYLE_POR_PERSONALIDADE: readonly TeacherPreferences["style"][] = ["tranquila", "direta"];

/**
 * Monta perfil e preferências a partir das respostas.
 *
 * Lança se faltar resposta: um perfil parcial gravado é pior que nenhum, porque o núcleo
 * passaria a decidir sobre dado que a pessoa não deu. Chame `respostasCompletas` antes.
 */
export function montarPerfil(respostas: Respostas): PerfilCapturado {
  if (!respostasCompletas(respostas)) {
    const faltando = ORDEM_DAS_PERGUNTAS.filter((c) => typeof respostas[c] !== "string");
    throw new Error(`onboarding incompleto: faltam ${faltando.join(", ")}`);
  }

  const iNivel = indiceDaEscolha(respostas, "nivel");
  const iMinutos = indiceDaEscolha(respostas, "minutos");
  const iAudio = indiceDaEscolha(respostas, "audio");
  const iPersonalidade = indiceDaEscolha(respostas, "personalidade");

  if (iNivel < 0 || iMinutos < 0 || iAudio < 0 || iPersonalidade < 0) {
    throw new Error("onboarding com resposta que não está no catálogo de opções");
  }

  const profile: LearnerProfile = {
    // Autoavaliação. PONTO DE PARTIDA declarado — a classificação real vem de
    // LevelAssessment, com evidência citada.
    selfAssessedLevel: NIVEL_POR_INDICE[iNivel]!,
    reason: respostas.motivo!,
    blocker: respostas.bloqueio!,
    minutesPerDay: MINUTOS_POR_INDICE[iMinutos]!,
    // `preferredTime` NÃO é gravado. É opcional no tipo, e na Fase 1 só alimentaria
    // notificação, que é Fase 4. Gravar criaria campo órfão, contra o critério de aceite.
  };

  const preferences: TeacherPreferences = {
    style: STYLE_POR_PERSONALIDADE[iPersonalidade]!,
    supportLevel: SUPPORT_LEVEL_POR_AUDIO[iAudio]!,
    // Não perguntados: valor único e centralizado, nunca inventado aqui.
    ...PREFERENCIAS_NAO_PERGUNTADAS,
  };

  return { profile, preferences };
}

/**
 * Núcleo pedagógico — a fronteira pública (SPEC-20260916-1652-nucleo-pedagogico).
 *
 * O lugar único do código que responde "o que ensinar agora". Quem consome (motor de
 * diálogo, telas) importa daqui e de nenhum arquivo interno.
 *
 * Invariante: nada neste módulo faz rede, conhece provedor de LLM ou importa de
 * `scripts/eval/`. O contrato do turno vem de `turn-contract.generated.ts`, gerado do
 * `scripts/eval/turn-schema.json`.
 */
export type { Category, Correction, NextAction, TurnOutput } from "./turn-contract.generated";

export type {
  Confidence,
  ConversationTurn,
  CriterionScore,
  LearnerProfile,
  Level,
  LevelAssessment,
  Mission,
  MissionStep,
  PedagogicalInput,
  PedagogicalIntent,
  PreferenceOverrides,
  RubricCriterion,
  SessionMode,
  SessionState,
  TeacherPreferences,
} from "./types";

export { decidirIntent, revisarTurno, type TurnoRevisado } from "./intent";

export {
  confiancaDe,
  fecharNivel,
  HISTERESE,
  nivelVigente,
  pontuacaoValida,
  type NivelFechado,
} from "./level-policy";

export { supportRatio, TABELA_DE_SUPORTE } from "./support-policy";

export {
  MAX_CORRECTIONS,
  maxCorrectionsPara,
  PRIORIDADE_DE_CATEGORIA,
  resolverCorrecoes,
  temEvidencia,
  type CorrecoesResolvidas,
} from "./correction-policy";

export {
  acaoDaTransicao,
  avancarMissao,
  ehUltimaEtapa,
  etapaAtual,
  etapaFechou,
  transicoesPossiveis,
  type EstadoDaMissao,
  type MissionTransition,
} from "./mission";

export { decidirNextAction, type DecisaoDeAcao } from "./next-action";

export { preferenciasEfetivas } from "./preferences";

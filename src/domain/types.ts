/**
 * Entidades do núcleo pedagógico (SPEC-20260916-1652-nucleo-pedagogico).
 *
 * Tudo aqui é dado. Nenhum destes tipos conhece rede, provedor de LLM ou componente de
 * interface — a invariante da SPEC é que o núcleo seja função pura de estado para
 * `PedagogicalIntent`.
 *
 * O contrato do TURNO não vive aqui: ele é gerado de `scripts/eval/turn-schema.json` em
 * `turn-contract.generated.ts`, porque o schema é o que o strict mode do Groq consome e
 * duas definições do mesmo contrato seriam dual-write.
 */
import type { Category, NextAction } from "./turn-contract.generated";

export type Level = 1 | 2 | 3 | 4 | 5;

/**
 * Preferências PERSISTENTES do aluno, capturadas no onboarding. A sessão nunca escreve
 * aqui: o que a sessão muda vive em `SessionState.overrides`.
 */
export interface LearnerProfile {
  /** Nível autoavaliado no onboarding. Ponto de partida declarado, nunca classificação. */
  readonly selfAssessedLevel: Level;
  readonly reason: string;
  readonly blocker: string;
  readonly minutesPerDay: number;
  /** Capturado no onboarding; só alimenta notificação, que é Fase 4. */
  readonly preferredTime?: string;
}

/**
 * Overrides de sessão. Cada chave aceita `undefined` de propósito: um formulário que
 * "limpa" um campo manda `undefined`, e isso tem de significar "não mexi nisso", não
 * "apague a preferência persistente".
 */
export type PreferenceOverrides = {
  readonly [K in keyof TeacherPreferences]?: TeacherPreferences[K] | undefined;
};

/**
 * Preferências da professora. Nunca booleano: `style` é enum ABERTO porque a Fase 1
 * entrega duas vozes e o produto vai ganhar outras sem migração de dado.
 */
export interface TeacherPreferences {
  readonly style: "tranquila" | "direta" | (string & {});
  readonly intensity: "baixa" | "media" | "alta";
  readonly supportLevel: "minimo" | "medio" | "alto";
  readonly speechRate: "lenta" | "normal" | "rapida";
}

export type RubricCriterion =
  "vocabulario" | "gramatica" | "construcao" | "compreensao" | "sustentacao";

/**
 * Uma nota de critério. `nota: null` com evidência "amostra insuficiente" é resultado
 * legítimo e obrigatório — a DEC-20260916-0314 proíbe estimativa sem amostra.
 */
export interface CriterionScore {
  readonly nota: Level | null;
  readonly evidencia: string;
}

export type Confidence = "alta" | "media" | "baixa";

/**
 * Avaliação de nível. APPEND-ONLY e imutável: o histórico é o que permite aplicar
 * histerese, e reescrever uma avaliação antiga apagaria a razão de uma promoção.
 */
export interface LevelAssessment {
  readonly criterios: Readonly<Record<RubricCriterion, CriterionScore>>;
  /** Mediana com teto aplicado. `null` quando não há critério pontuado. */
  readonly nivelFinal: Level | null;
  readonly confianca: Confidence;
  readonly justificativaPt: string;
  readonly avaliadoEm: string;
}

/** Uma etapa roteirizada da missão. O roteiro é o fallback da DEC-20260916-0311. */
export interface MissionStep {
  readonly index: number;
  /** O que o aluno precisa comunicar para a etapa fechar. */
  readonly goalPt: string;
  readonly openingEn: string;
  readonly expectedWords: readonly string[];
  readonly focusPt: string;
}

export interface Mission {
  readonly id: string;
  readonly goalPt: string;
  readonly scenarioPt: string;
  readonly targetLevel: Level;
  readonly steps: readonly MissionStep[];
}

export type SessionMode = "guided_mission" | "free_conversation" | "pronunciation";

/**
 * Estado da sessão. Vive em memória na Fase 1: sem banco, sem autenticação.
 * `overrides` são preferências TEMPORÁRIAS e resolvem por merge sobre as persistentes.
 */
export interface SessionState {
  readonly mode: SessionMode;
  readonly missionId: string;
  readonly stepIndex: number;
  readonly turnsUsed: number;
  readonly overrides?: PreferenceOverrides | undefined;
}

/** A janela recente da conversa que o núcleo enxerga. */
export interface ConversationTurn {
  readonly learnerUtterance: string;
  readonly emmaReplyEn: string;
}

/** Tudo que o núcleo precisa para decidir. Nada mais, nada de rede. */
export interface PedagogicalInput {
  readonly profile: LearnerProfile;
  readonly preferences: TeacherPreferences;
  /** Histórico append-only, do mais antigo para o mais recente. */
  readonly assessments: readonly LevelAssessment[];
  readonly session: SessionState;
  readonly mission: Mission;
  readonly recentFocus: readonly string[];
  readonly practicedExpressions: readonly string[];
  readonly recentTurns: readonly ConversationTurn[];
  /** A fala do aluno neste turno. É contra ela que a evidência de correção é conferida. */
  readonly learnerUtterance: string;
  /** `next_action` proposto pelo modelo no turno anterior, quando houver. */
  readonly proposedNextAction?: NextAction | undefined;
}

/**
 * A ÚNICA saída do núcleo, e o único insumo que o motor de diálogo recebe. Se o motor
 * precisar de algo que não está aqui, a decisão vazou para fora do núcleo.
 */
export interface PedagogicalIntent {
  readonly targetLevel: Level;
  /** Proporção de apoio em pt-BR, 0 a 1. Nunca escrita em componente. */
  readonly supportRatio: number;
  readonly missionGoal: string;
  readonly missionScenario: string;
  readonly missionStep: MissionStep;
  readonly maxCorrections: number;
  readonly priorityCategories: readonly Category[];
  readonly mustRequestProduction: boolean;
  readonly recentFocus: readonly string[];
  readonly expectedNextAction: NextAction;
  readonly effectivePreferences: TeacherPreferences;
  readonly levelConfidence: Confidence;
}

/**
 * Máquina de estados da missão (SPEC-20260916-1652-nucleo-pedagogico).
 *
 * Responde três coisas, e só o núcleo pode responder: qual é a etapa atual, o que fecha
 * uma etapa e o que fecha a missão. A interface não avança etapa contando turnos, e o
 * modelo não avança etapa pedindo — ele PROPÕE (DEC-20260916-1612).
 */
import type { NextAction } from "./turn-contract.generated";
import type { Mission, MissionStep, SessionState } from "./types";

export type MissionTransition =
  | "stay"
  /** A etapa fechou e a missão continua na etapa seguinte. */
  | "advance"
  /** A última etapa fechou: a missão cumpriu o objetivo. */
  | "complete";

/**
 * A tabela de transição. `advance` só existe quando há etapa seguinte, e `complete` só na
 * última — é isso que torna `complete_mission` na etapa 2 de 4 estruturalmente impossível,
 * em vez de proibido por um `if` que alguém pode esquecer.
 */
export function transicoesPossiveis(
  mission: Mission,
  stepIndex: number,
): readonly MissionTransition[] {
  const ultima = mission.steps.length - 1;
  if (stepIndex < 0 || stepIndex > ultima) return ["stay"];
  return stepIndex < ultima ? ["stay", "advance"] : ["stay", "complete"];
}

export function etapaAtual(mission: Mission, session: SessionState): MissionStep {
  const indice = Math.min(Math.max(session.stepIndex, 0), mission.steps.length - 1);
  const step = mission.steps[indice];
  if (!step) {
    // Missão sem etapa é dado inválido, não estado possível: falhar alto aqui é melhor
    // que devolver uma etapa fantasma que o motor transformaria em prompt.
    throw new Error(`missao '${mission.id}' nao tem etapas`);
  }
  return step;
}

export function ehUltimaEtapa(mission: Mission, stepIndex: number): boolean {
  return stepIndex >= mission.steps.length - 1;
}

/**
 * O que FECHA uma etapa: o aluno produziu linguagem que cobre o objetivo da etapa.
 *
 * "Cobrir" é medido pelas expressões esperadas da etapa aparecerem na fala. É um critério
 * grosso e assumidamente grosso: o roteiro do protótipo não declara condição de fechamento,
 * e a eval multiturno mediu que o modelo tampouco é confiável nisso. Um critério explícito
 * e testável aqui é melhor que um critério implícito dentro do prompt.
 *
 * Etapa sem `expectedWords` fecha com qualquer produção não vazia — caso do turno de
 * abertura, em que qualquer resposta do aluno já move a conversa.
 */
export function etapaFechou(step: MissionStep, learnerUtterance: string): boolean {
  const fala = String(learnerUtterance ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (fala === "") return false;
  if (step.expectedWords.length === 0) return true;
  return step.expectedWords.some((esperada) => fala.includes(esperada.toLowerCase().trim()));
}

export interface EstadoDaMissao {
  readonly step: MissionStep;
  readonly transition: MissionTransition;
  readonly nextStepIndex: number;
  readonly missionCompleted: boolean;
}

/**
 * Avança a máquina UM passo. Função pura: recebe estado e fala, devolve estado novo — não
 * muta `session`, porque estado mutável compartilhado é como decisão pedagógica vaza para
 * quem só queria renderizar uma tela.
 */
export function avancarMissao(
  mission: Mission,
  session: SessionState,
  learnerUtterance: string,
): EstadoDaMissao {
  const step = etapaAtual(mission, session);
  const fechou = etapaFechou(step, learnerUtterance);
  const possiveis = transicoesPossiveis(mission, step.index);

  if (!fechou) {
    return { step, transition: "stay", nextStepIndex: step.index, missionCompleted: false };
  }

  if (possiveis.includes("complete")) {
    return { step, transition: "complete", nextStepIndex: step.index, missionCompleted: true };
  }

  return { step, transition: "advance", nextStepIndex: step.index + 1, missionCompleted: false };
}

/** O `next_action` que a transição implica. É a proposta do NÚCLEO, e ela é a que vale. */
export function acaoDaTransicao(transition: MissionTransition): NextAction {
  if (transition === "complete") return "complete_mission";
  if (transition === "advance") return "continue_mission";
  return "reply";
}

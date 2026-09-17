/**
 * Composição do `PedagogicalIntent` (SPEC-20260916-1652-nucleo-pedagogico).
 *
 * Este é o único ponto de entrada do núcleo. Ele responde "o que ensinar agora" e é lido
 * sem entender nada de LLM — nenhum import aqui conhece rede, provedor ou componente.
 *
 * Trocar de provedor de modelo não toca nada deste arquivo. Era um dos sinais de sucesso
 * declarados no main.md.
 */
import type { Correction, NextAction } from "./turn-contract.generated";
import {
  maxCorrectionsPara,
  resolverCorrecoes,
  PRIORIDADE_DE_CATEGORIA,
} from "./correction-policy";
import { avancarMissao, etapaAtual } from "./mission";
import { decidirNextAction, type DecisaoDeAcao } from "./next-action";
import { nivelVigente } from "./level-policy";
import { preferenciasEfetivas } from "./preferences";
import { supportRatio } from "./support-policy";
import type { PedagogicalInput, PedagogicalIntent } from "./types";

/** Quantos pontos de melhoria recentes o motor recebe. Mais que isso vira lista, não foco. */
const MAX_RECENT_FOCUS = 3;

/**
 * Decide a intenção pedagógica do PRÓXIMO turno, a partir do estado e da fala atual.
 *
 * `mustRequestProduction` é sempre `true` na Fase 1: a invariante da SPEC de conversa é que
 * todo turno termine pedindo nova produção de linguagem, e turno que não devolve a bola
 * quebra o ciclo. O campo existe para que a regra seja LIDA pelo motor em vez de repetida
 * dentro do prompt — e para poder ser relaxada por política, não por edição de texto.
 */
export function decidirIntent(entrada: PedagogicalInput): PedagogicalIntent {
  const { profile, preferences, assessments, session, mission } = entrada;

  const nivel = nivelVigente(profile, assessments);
  const efetivas = preferenciasEfetivas(preferences, session);
  const estado = avancarMissao(mission, session, entrada.learnerUtterance);

  return {
    targetLevel: nivel.nivel,
    levelConfidence: nivel.confianca,
    supportRatio: supportRatio(nivel.nivel, efetivas),
    missionGoal: mission.goalPt,
    missionScenario: mission.scenarioPt,
    missionStep: estado.step,
    maxCorrections: maxCorrectionsPara(nivel.nivel),
    priorityCategories: PRIORIDADE_DE_CATEGORIA,
    mustRequestProduction: true,
    recentFocus: entrada.recentFocus.slice(-MAX_RECENT_FOCUS),
    // A intenção carrega o que a MISSÃO espera. A palavra final sobre o turno que o modelo
    // devolveu é de `revisarTurno`, que já viu as correções propostas.
    expectedNextAction: acaoEsperada(estado.transition),
    effectivePreferences: efetivas,
  };
}

function acaoEsperada(transition: ReturnType<typeof avancarMissao>["transition"]): NextAction {
  if (transition === "complete") return "complete_mission";
  if (transition === "advance") return "continue_mission";
  return "reply";
}

export interface TurnoRevisado {
  readonly corrections: readonly Correction[];
  readonly nextAction: NextAction;
  readonly decisao: DecisaoDeAcao;
  /** Recusadas por falta de evidência: não chegam ao aluno, mas ficam auditáveis. */
  readonly rejeitadasSemEvidencia: readonly Correction[];
  /** Cortadas pelo teto, por prioridade de categoria. */
  readonly truncadas: readonly Correction[];
}

/**
 * A segunda metade do núcleo: recebe o que o modelo PROPÔS e devolve o que de fato sai.
 *
 * Fica aqui, e não no motor, porque é decisão pedagógica: quais correções sobrevivem, em
 * que ordem e o que o aluno é convidado a fazer em seguida. O motor traduz isso em texto;
 * ele não escolhe.
 */
export function revisarTurno(
  entrada: PedagogicalInput,
  propostas: {
    readonly corrections: readonly Correction[];
    readonly nextAction?: NextAction;
  },
): TurnoRevisado {
  const nivel = nivelVigente(entrada.profile, entrada.assessments);
  const estado = avancarMissao(entrada.mission, entrada.session, entrada.learnerUtterance);
  const step = etapaAtual(entrada.mission, entrada.session);

  const resolvidas = resolverCorrecoes(
    propostas.corrections,
    entrada.learnerUtterance,
    maxCorrectionsPara(nivel.nivel),
  );

  const decisao = decidirNextAction({
    mission: entrada.mission,
    stepIndex: step.index,
    transition: estado.transition,
    acceptedCorrections: resolvidas.aceitas,
    proposed: propostas.nextAction ?? entrada.proposedNextAction,
  });

  return {
    corrections: resolvidas.aceitas,
    nextAction: decisao.action,
    decisao,
    rejeitadasSemEvidencia: resolvidas.semEvidencia,
    truncadas: resolvidas.truncadas,
  };
}

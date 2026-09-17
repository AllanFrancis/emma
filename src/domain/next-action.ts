/**
 * Decisão final de `next_action` (SPEC-20260916-1652-nucleo-pedagogico).
 *
 * A DEC-20260916-1612 é explícita: `next_action` é PROPOSTA do modelo, não decisão. Aqui a
 * proposta é confrontada com a etapa REAL da missão e com o que o turno de fato entregou.
 *
 * Invariante da SPEC: "`complete_mission` na etapa 2 de 4 é recusado."
 */
import type { Correction, NextAction } from "./turn-contract.generated";
import { acaoDaTransicao, type MissionTransition, transicoesPossiveis } from "./mission";
import type { Mission } from "./types";

export interface DecisaoDeAcao {
  readonly action: NextAction;
  /** `true` quando a proposta do modelo foi recusada. */
  readonly overridden: boolean;
  /** `undefined` quando o modelo não propôs nada — caso legítimo, não erro. */
  readonly proposed?: NextAction | undefined;
  readonly reasonPt: string;
}

/**
 * Regra de coerência, na ordem em que as razões pesam:
 *
 * 1. A missão manda no que é estrutural. `complete_mission` fora da última etapa e
 *    `continue_mission` sem etapa seguinte são impossíveis, não discutíveis.
 * 2. Havendo correção aceita, o turno PEDE aplicação: `retry`. Correção que o aluno não
 *    é convidado a usar é informação, não ensino.
 * 3. Não havendo correção, `retry` é recusado: cobrar repetição de quem não errou é o
 *    defeito que a checagem C12 do harness já acusa.
 * 4. Sobrando dúvida, vale o que a transição da missão implica.
 */
export function decidirNextAction(entrada: {
  readonly mission: Mission;
  readonly stepIndex: number;
  readonly transition: MissionTransition;
  readonly acceptedCorrections: readonly Correction[];
  readonly proposed?: NextAction | undefined;
}): DecisaoDeAcao {
  const { mission, stepIndex, transition, acceptedCorrections, proposed } = entrada;
  const daMissao = acaoDaTransicao(transition);
  const possiveis = transicoesPossiveis(mission, stepIndex);
  const temCorrecao = acceptedCorrections.length > 0;

  const recusar = (action: NextAction, reasonPt: string): DecisaoDeAcao => ({
    action,
    overridden: true,
    proposed,
    reasonPt,
  });

  // 1. Estrutura da missão.
  if (proposed === "complete_mission" && !possiveis.includes("complete")) {
    return recusar(
      daMissao,
      `complete_mission recusado: etapa ${stepIndex + 1} de ${mission.steps.length}, a missao nao pode fechar aqui`,
    );
  }
  if (proposed === "continue_mission" && !possiveis.includes("advance")) {
    return recusar(daMissao, "continue_mission recusado: nao existe etapa seguinte para continuar");
  }

  // 2. Correção emitida exige aplicação. Vence a proposta do modelo, mas NÃO vence o
  //    fechamento de missão: cobrar repetição depois de o objetivo ter sido cumprido
  //    transformaria a vitória do aluno em mais uma tarefa.
  if (temCorrecao && transition !== "complete") {
    if (proposed === "retry") {
      return {
        action: "retry",
        overridden: false,
        proposed,
        reasonPt: "correcao emitida e o aluno e convidado a aplicar",
      };
    }
    return recusar(
      "retry",
      "houve correcao aceita: o turno tem de pedir que o aluno aplique, nao seguir adiante",
    );
  }

  // 3. Sem correção, `retry` não se sustenta.
  if (!temCorrecao && proposed === "retry") {
    return recusar(daMissao, "retry recusado: nao houve correcao a aplicar");
  }

  // 4. Proposta coerente, ou ausente.
  if (proposed && proposed === daMissao) {
    return {
      action: daMissao,
      overridden: false,
      proposed,
      reasonPt: "proposta coerente com a etapa",
    };
  }
  if (!proposed) {
    return {
      action: daMissao,
      overridden: false,
      reasonPt: "sem proposta do modelo: vale a transicao da missao",
    };
  }
  // `reply` proposto onde a missão avançou (ou o contrário): a missão descreve o estado
  // real, e o modelo não tem como saber a etapa.
  return recusar(daMissao, `proposta '${proposed}' divergiu da transicao real da missao`);
}

import { describe, expect, test } from "bun:test";
import {
  acaoDaTransicao,
  avancarMissao,
  ehUltimaEtapa,
  etapaAtual,
  etapaFechou,
  transicoesPossiveis,
} from "./mission";
import type { Mission, MissionStep, SessionState } from "./types";

const missao: Mission = {
  id: "cafe",
  goalPt: "Pedir um cafe",
  scenarioPt: "Voce esta no balcao de uma cafeteria em Londres.",
  targetLevel: 2,
  steps: [
    {
      index: 0,
      goalPt: "cumprimentar",
      openingEn: "Hi there! What can I get you?",
      expectedWords: [],
      focusPt: "abertura",
    },
    {
      index: 1,
      goalPt: "pedir a bebida",
      openingEn: "Sure. Which one?",
      expectedWords: ["coffee"],
      focusPt: "pedido",
    },
    {
      index: 2,
      goalPt: "dizer o tamanho",
      openingEn: "Small or large?",
      expectedWords: ["small", "large"],
      focusPt: "tamanho",
    },
    {
      index: 3,
      goalPt: "pagar",
      openingEn: "How would you like to pay?",
      expectedWords: ["card", "cash"],
      focusPt: "pagamento",
    },
  ],
};

function sessao(stepIndex: number): SessionState {
  return { mode: "guided_mission", missionId: "cafe", stepIndex, turnsUsed: 0 };
}

/** Acesso por índice com falha alta: fixture errada tem de reprovar, não virar undefined. */
function etapa(indice: number): MissionStep {
  const step = missao.steps[indice];
  if (!step) throw new Error(`fixture sem etapa ${indice}`);
  return step;
}

describe("etapa atual", () => {
  test("devolve a etapa do indice", () => {
    expect(etapaAtual(missao, sessao(2)).goalPt).toBe("dizer o tamanho");
  });

  test("indice fora da faixa e limitado, nao explode", () => {
    expect(etapaAtual(missao, sessao(-5)).index).toBe(0);
    expect(etapaAtual(missao, sessao(99)).index).toBe(3);
  });
});

describe("transicoes possiveis: complete so existe na ultima etapa", () => {
  test("etapa do meio permite stay e advance, nunca complete", () => {
    expect(transicoesPossiveis(missao, 1)).toEqual(["stay", "advance"]);
    expect(transicoesPossiveis(missao, 1)).not.toContain("complete");
  });

  test("ultima etapa permite stay e complete, nunca advance", () => {
    expect(transicoesPossiveis(missao, 3)).toEqual(["stay", "complete"]);
    expect(ehUltimaEtapa(missao, 3)).toBe(true);
    expect(ehUltimaEtapa(missao, 2)).toBe(false);
  });
});

describe("o que fecha uma etapa", () => {
  test("fala vazia nao fecha nada", () => {
    expect(etapaFechou(etapa(1), "")).toBe(false);
    expect(etapaFechou(etapa(1), "   ")).toBe(false);
  });

  test("etapa sem expectedWords fecha com qualquer producao", () => {
    expect(etapaFechou(etapa(0), "hello")).toBe(true);
  });

  test("etapa com expectedWords exige a expressao na fala", () => {
    expect(etapaFechou(etapa(1), "I want a coffee please")).toBe(true);
    expect(etapaFechou(etapa(1), "I want a tea")).toBe(false);
  });

  test("qualquer uma das expressoes esperadas fecha", () => {
    expect(etapaFechou(etapa(2), "a small one")).toBe(true);
    expect(etapaFechou(etapa(2), "large, please")).toBe(true);
  });
});

describe("avancar a missao, transicao por transicao", () => {
  test("etapa 0 fecha e avanca para 1", () => {
    const estado = avancarMissao(missao, sessao(0), "hello");
    expect(estado.transition).toBe("advance");
    expect(estado.nextStepIndex).toBe(1);
    expect(estado.missionCompleted).toBe(false);
  });

  test("etapa que nao fechou fica onde esta", () => {
    const estado = avancarMissao(missao, sessao(1), "I want a tea");
    expect(estado.transition).toBe("stay");
    expect(estado.nextStepIndex).toBe(1);
  });

  test("ultima etapa fecha a missao", () => {
    const estado = avancarMissao(missao, sessao(3), "with card, please");
    expect(estado.transition).toBe("complete");
    expect(estado.missionCompleted).toBe(true);
  });

  test("nao muta a sessao — estado mutavel compartilhado e como decisao pedagogica vaza", () => {
    const original = sessao(0);
    avancarMissao(missao, original, "hello");
    expect(original.stepIndex).toBe(0);
  });

  test("percurso completo: 4 etapas, 4 transicoes, missao fechada no fim", () => {
    const falas = ["hello", "a coffee please", "a small one", "with card"];
    let indice = 0;
    const transicoes: string[] = [];
    for (const fala of falas) {
      const estado = avancarMissao(missao, sessao(indice), fala);
      transicoes.push(estado.transition);
      indice = estado.nextStepIndex;
      if (estado.missionCompleted) break;
    }
    expect(transicoes).toEqual(["advance", "advance", "advance", "complete"]);
  });
});

describe("acao que a transicao implica", () => {
  test("cada transicao tem um next_action proprio", () => {
    expect(acaoDaTransicao("complete")).toBe("complete_mission");
    expect(acaoDaTransicao("advance")).toBe("continue_mission");
    expect(acaoDaTransicao("stay")).toBe("reply");
  });
});

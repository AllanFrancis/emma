import { describe, expect, test } from "bun:test";
import { decidirNextAction } from "./next-action";
import type { Category, Correction } from "./turn-contract.generated";
import type { Mission } from "./types";

const missao: Mission = {
  id: "cafe",
  goalPt: "Pedir um cafe",
  scenarioPt: "balcao",
  targetLevel: 2,
  steps: [0, 1, 2, 3].map((index) => ({
    index,
    goalPt: `etapa ${index}`,
    openingEn: "?",
    expectedWords: [],
    focusPt: "",
  })),
};

function correcao(category: Category = "grammar"): Correction {
  return { original: "people is", suggested: "people are", explanation_pt: "plural", category };
}

describe("complete_mission prematuro e RECUSADO", () => {
  test("etapa 2 de 4 nao pode fechar a missao", () => {
    const decisao = decidirNextAction({
      mission: missao,
      stepIndex: 1,
      transition: "advance",
      acceptedCorrections: [],
      proposed: "complete_mission",
    });
    expect(decisao.overridden).toBe(true);
    expect(decisao.action).not.toBe("complete_mission");
    expect(decisao.action).toBe("continue_mission");
    expect(decisao.reasonPt).toContain("etapa 2 de 4");
  });

  test("na ultima etapa, com a missao fechando, complete_mission passa", () => {
    const decisao = decidirNextAction({
      mission: missao,
      stepIndex: 3,
      transition: "complete",
      acceptedCorrections: [],
      proposed: "complete_mission",
    });
    expect(decisao.overridden).toBe(false);
    expect(decisao.action).toBe("complete_mission");
  });
});

describe("continue_mission sem etapa seguinte e recusado", () => {
  test("ultima etapa nao tem para onde continuar", () => {
    const decisao = decidirNextAction({
      mission: missao,
      stepIndex: 3,
      transition: "complete",
      acceptedCorrections: [],
      proposed: "continue_mission",
    });
    expect(decisao.overridden).toBe(true);
    expect(decisao.action).toBe("complete_mission");
  });
});

describe("correcao emitida exige aplicacao", () => {
  test("houve correcao e o modelo propos reply: vira retry", () => {
    const decisao = decidirNextAction({
      mission: missao,
      stepIndex: 1,
      transition: "stay",
      acceptedCorrections: [correcao()],
      proposed: "reply",
    });
    expect(decisao.overridden).toBe(true);
    expect(decisao.action).toBe("retry");
  });

  test("houve correcao e o modelo propos retry: coerente, sem override", () => {
    const decisao = decidirNextAction({
      mission: missao,
      stepIndex: 1,
      transition: "stay",
      acceptedCorrections: [correcao()],
      proposed: "retry",
    });
    expect(decisao.overridden).toBe(false);
    expect(decisao.action).toBe("retry");
  });

  test("mas fechar a missao vence a cobranca de repeticao", () => {
    // Cobrar repeticao depois de o objetivo ter sido cumprido transformaria a vitoria do
    // aluno em mais uma tarefa.
    const decisao = decidirNextAction({
      mission: missao,
      stepIndex: 3,
      transition: "complete",
      acceptedCorrections: [correcao()],
      proposed: "complete_mission",
    });
    expect(decisao.action).toBe("complete_mission");
  });
});

describe("retry sem correcao e recusado", () => {
  test("nao se cobra repeticao de quem nao errou", () => {
    const decisao = decidirNextAction({
      mission: missao,
      stepIndex: 1,
      transition: "stay",
      acceptedCorrections: [],
      proposed: "retry",
    });
    expect(decisao.overridden).toBe(true);
    expect(decisao.action).toBe("reply");
    expect(decisao.reasonPt).toContain("nao houve correcao");
  });
});

describe("sem proposta, vale a transicao da missao", () => {
  test("ausencia de proposta nao e erro", () => {
    const decisao = decidirNextAction({
      mission: missao,
      stepIndex: 0,
      transition: "advance",
      acceptedCorrections: [],
    });
    expect(decisao.overridden).toBe(false);
    expect(decisao.action).toBe("continue_mission");
  });

  test("proposta que divergiu da etapa real perde", () => {
    const decisao = decidirNextAction({
      mission: missao,
      stepIndex: 0,
      transition: "advance",
      acceptedCorrections: [],
      proposed: "reply",
    });
    expect(decisao.overridden).toBe(true);
    expect(decisao.action).toBe("continue_mission");
    expect(decisao.proposed).toBe("reply");
  });
});

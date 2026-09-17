import { describe, expect, test } from "bun:test";
import { confiancaDe, fecharNivel, HISTERESE, nivelVigente } from "./level-policy";
import type {
  CriterionScore,
  LearnerProfile,
  Level,
  LevelAssessment,
  RubricCriterion,
} from "./types";

const perfil: LearnerProfile = {
  selfAssessedLevel: 2,
  reason: "trabalho",
  blocker: "travo na hora de falar",
  minutesPerDay: 10,
};

function criterios(
  notas: Partial<Record<RubricCriterion, Level | null>>,
  evidencia = "I work in a office with many people",
): Record<RubricCriterion, CriterionScore> {
  const chaves: RubricCriterion[] = [
    "vocabulario",
    "gramatica",
    "construcao",
    "compreensao",
    "sustentacao",
  ];
  return Object.fromEntries(
    chaves.map((chave) => {
      const nota = chave in notas ? (notas[chave] ?? null) : null;
      return [
        chave,
        { nota, evidencia: nota === null ? "amostra insuficiente" : evidencia } as CriterionScore,
      ];
    }),
  ) as Record<RubricCriterion, CriterionScore>;
}

function avaliacao(
  nivelFinal: Level | null,
  confianca: LevelAssessment["confianca"] = "alta",
): LevelAssessment {
  return {
    criterios: criterios({}),
    nivelFinal,
    confianca,
    justificativaPt: "fixture",
    avaliadoEm: "2026-09-16T00:00:00.000Z",
  };
}

describe("mediana, nao media", () => {
  test("o nivel e a mediana dos criterios pontuados", () => {
    // Media daria 3,2 e arredondaria para 3; a mediana de [2,3,3,4,4] tambem e 3 aqui.
    const { nivel } = fecharNivel(
      criterios({ vocabulario: 4, gramatica: 2, construcao: 3, compreensao: 4, sustentacao: 3 }),
    );
    expect(nivel).toBe(3);
  });

  test("o perfil que o produto existe para consertar: forte em vocabulario, mudo em conversa", () => {
    // Media de [5,5,5,5,1] = 4,2 -> 4. Mediana = 5, e o teto por sustentacao derruba para 4.
    // O ponto e que a media NAO enxerga o problema; a mediana + teto enxergam.
    const fechado = fecharNivel(
      criterios({ vocabulario: 5, gramatica: 5, construcao: 5, compreensao: 5, sustentacao: 1 }),
    );
    expect(fechado.medianaBruta).toBe(5);
    expect(fechado.tetoAplicado).toBe(true);
    expect(fechado.nivel).toBe(4);
  });

  test("criterio null e descartado, nao conta como zero", () => {
    const { nivel } = fecharNivel(criterios({ vocabulario: 4, gramatica: 4, construcao: 4 }));
    expect(nivel).toBe(4);
  });
});

describe("teto por sustentacao de conversa", () => {
  test("2 niveis abaixo da mediana derruba 1", () => {
    const fechado = fecharNivel(
      criterios({ vocabulario: 4, gramatica: 4, construcao: 4, sustentacao: 2 }),
    );
    expect(fechado.tetoAplicado).toBe(true);
    expect(fechado.nivel).toBe(3);
  });

  test("1 nivel abaixo NAO derruba", () => {
    const fechado = fecharNivel(
      criterios({ vocabulario: 4, gramatica: 4, construcao: 4, sustentacao: 3 }),
    );
    expect(fechado.tetoAplicado).toBe(false);
    expect(fechado.nivel).toBe(4);
  });

  test("sustentacao sem amostra nao aplica teto — ausencia de dado nao e prova de fraqueza", () => {
    const fechado = fecharNivel(
      criterios({ vocabulario: 4, gramatica: 4, construcao: 4, sustentacao: null }),
    );
    expect(fechado.tetoAplicado).toBe(false);
    expect(fechado.nivel).toBe(4);
  });

  test("o teto nunca leva abaixo de 1", () => {
    const fechado = fecharNivel(criterios({ vocabulario: 3, gramatica: 3, sustentacao: 1 }));
    expect(fechado.nivel).toBeGreaterThanOrEqual(1);
  });
});

describe("evidencia obrigatoria (DEC-20260916-0314)", () => {
  test("nota sem evidencia e descartada como se fosse null", () => {
    const base = criterios({ vocabulario: 5, gramatica: 5, construcao: 1 });
    const semEvidencia = {
      ...base,
      vocabulario: { nota: 5 as Level, evidencia: "   " },
    };
    // Sobram gramatica 5 e construcao 1 -> mediana 3.
    expect(fecharNivel(semEvidencia).nivel).toBe(3);
  });

  test("nenhum criterio pontuado devolve null, nunca um chute", () => {
    const fechado = fecharNivel(criterios({}));
    expect(fechado.nivel).toBeNull();
    expect(fechado.confianca).toBe("baixa");
  });
});

describe("confianca por quantidade de criterios", () => {
  test("4 ou mais e alta, 3 e media, 2 ou menos e baixa", () => {
    expect(confiancaDe(5)).toBe("alta");
    expect(confiancaDe(4)).toBe("alta");
    expect(confiancaDe(3)).toBe("media");
    expect(confiancaDe(2)).toBe("baixa");
    expect(confiancaDe(0)).toBe("baixa");
  });
});

describe("histerese assimetrica (DEC-20260916-0315)", () => {
  test("sem avaliacao confiavel, vale o nivel autoavaliado", () => {
    const { nivel, confianca } = nivelVigente(perfil, []);
    expect(nivel).toBe(perfil.selfAssessedLevel);
    expect(confianca).toBe("baixa");
  });

  test("uma avaliacao boa NAO promove", () => {
    const { nivel } = nivelVigente(perfil, [avaliacao(2), avaliacao(3)]);
    expect(nivel).toBe(2);
  });

  test("duas consecutivas apontando mais alto promovem 1 degrau", () => {
    const { nivel } = nivelVigente(perfil, [avaliacao(2), avaliacao(3), avaliacao(3)]);
    expect(nivel).toBe(3);
    expect(nivel - perfil.selfAssessedLevel).toBe(HISTERESE.degrauMaximo);
  });

  test("duas abaixo NAO rebaixam: descer exige tres", () => {
    const { nivel } = nivelVigente(perfil, [avaliacao(4), avaliacao(3), avaliacao(3)]);
    expect(nivel).toBe(4);
  });

  test("tres consecutivas abaixo rebaixam 1 degrau", () => {
    const { nivel } = nivelVigente(perfil, [
      avaliacao(4),
      avaliacao(3),
      avaliacao(3),
      avaliacao(3),
    ]);
    expect(nivel).toBe(3);
  });

  test("sequencia interrompida por confirmacao zera a contagem", () => {
    // Duas abaixo, uma confirmando o vigente, mais duas abaixo: nenhuma corrida chega a 3.
    const { nivel } = nivelVigente(perfil, [
      avaliacao(4),
      avaliacao(3),
      avaliacao(3),
      avaliacao(4),
      avaliacao(3),
      avaliacao(3),
    ]);
    expect(nivel).toBe(4);
  });

  test("o nivel sobe no maximo 1 degrau por vez, mesmo com salto grande na avaliacao", () => {
    const { nivel } = nivelVigente(perfil, [avaliacao(1), avaliacao(5), avaliacao(5)]);
    expect(nivel).toBe(2);
  });

  test("avaliacao de confianca baixa nao participa da contagem", () => {
    const { nivel } = nivelVigente(perfil, [
      avaliacao(2),
      avaliacao(3, "baixa"),
      avaliacao(3, "baixa"),
    ]);
    expect(nivel).toBe(2);
  });
});

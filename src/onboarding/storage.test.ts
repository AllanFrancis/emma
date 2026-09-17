import { beforeEach, describe, expect, test } from "bun:test";

import {
  decidirIntent,
  preferenciasEfetivas,
  type Mission,
  type PedagogicalInput,
} from "../domain";
import { montarPerfil, type Respostas } from "./perfil";
import { ORDEM_DAS_PERGUNTAS, PERGUNTAS } from "./questions";
import {
  concluirOnboarding,
  gravarResposta,
  lerPerfil,
  lerRespostas,
  limparOnboarding,
  onboardingConcluido,
  prontoParaConcluir,
} from "./storage";

/** `localStorage` de mentira, porque `bun test` roda sem DOM. */
function instalarDeposito(): void {
  const mapa = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mapa.get(k) ?? null,
      setItem: (k: string, v: string) => void mapa.set(k, v),
      removeItem: (k: string) => void mapa.delete(k),
      clear: () => mapa.clear(),
      key: (i: number) => [...mapa.keys()][i] ?? null,
      get length() {
        return mapa.size;
      },
    },
  });
}

function responderTudo(): Respostas {
  let respostas: Respostas = {};
  for (const chave of ORDEM_DAS_PERGUNTAS) {
    respostas = gravarResposta(chave, PERGUNTAS[chave].options[0]!.label);
  }
  return respostas;
}

beforeEach(() => {
  instalarDeposito();
  limparOnboarding();
});

describe("persistência das respostas", () => {
  test("grava e relê resposta por resposta", () => {
    expect(lerRespostas()).toEqual({});
    gravarResposta("nivel", PERGUNTAS.nivel.options[2]!.label);
    expect(lerRespostas().nivel).toBe(PERGUNTAS.nivel.options[2]!.label);
  });

  test("responder tudo destrava a conclusão", () => {
    expect(prontoParaConcluir()).toBe(false);
    responderTudo();
    expect(prontoParaConcluir()).toBe(true);
  });

  test("descarta resposta que não está mais no catálogo", () => {
    // Simula opção que mudou de texto entre versões do app.
    globalThis.localStorage.setItem(
      "emma.onboarding.respostas.v1",
      JSON.stringify({ nivel: "opção que não existe mais", motivo: "Viagem" }),
    );
    const lidas = lerRespostas();
    expect(lidas.nivel).toBeUndefined();
    expect(lidas.motivo).toBe("Viagem");
  });

  test("dado corrompido devolve vazio em vez de lançar", () => {
    globalThis.localStorage.setItem("emma.onboarding.respostas.v1", "{isto não é json");
    expect(() => lerRespostas()).not.toThrow();
    expect(lerRespostas()).toEqual({});
  });

  test("sem localStorage o percurso não quebra", () => {
    // @ts-expect-error remoção deliberada para simular SSR
    delete globalThis.localStorage;
    expect(() => lerRespostas()).not.toThrow();
    expect(lerRespostas()).toEqual({});
    expect(() => gravarResposta("nivel", PERGUNTAS.nivel.options[0]!.label)).not.toThrow();
    expect(onboardingConcluido()).toBe(false);
  });
});

describe("conclusão do onboarding", () => {
  test("grava perfil e preferências e marca como concluído", () => {
    expect(onboardingConcluido()).toBe(false);
    responderTudo();
    const persistido = concluirOnboarding();
    expect(onboardingConcluido()).toBe(true);
    expect(lerPerfil()?.profile).toEqual(persistido.profile);
    expect(lerPerfil()?.preferences).toEqual(persistido.preferences);
    expect(Date.parse(persistido.concluidoEm)).not.toBeNaN();
  });

  test("recusa concluir com respostas incompletas", () => {
    gravarResposta("nivel", PERGUNTAS.nivel.options[0]!.label);
    expect(() => concluirOnboarding()).toThrow(/incompleto/);
    expect(onboardingConcluido()).toBe(false);
  });
});

describe("a saída alimenta o núcleo de verdade", () => {
  // Este é o teste que prova o critério "gravados na forma definida pelo núcleo
  // pedagógico". Tipo compatível o compilador já garante; o que falta provar é que o núcleo
  // ACEITA o valor em runtime e produz um Intent coerente com o que foi respondido.
  const missao: Mission = {
    id: "cafe",
    goalPt: "Pedir um café",
    scenarioPt: "Você está no balcão de um café em Londres.",
    targetLevel: 2,
    steps: [
      {
        index: 0,
        goalPt: "dizer o que quer pedir",
        openingEn: "Hi there! What can I get for you today?",
        expectedWords: ["I'd like"],
        focusPt: "usar I'd like em pedidos",
      },
    ],
  };

  function entradaCom(respostas: Respostas): PedagogicalInput {
    const { profile, preferences } = montarPerfil(respostas);
    return {
      profile,
      preferences,
      assessments: [],
      session: { mode: "guided_mission", missionId: "cafe", stepIndex: 0, turnsUsed: 0 },
      mission: missao,
      recentFocus: [],
      practicedExpressions: [],
      recentTurns: [],
      learnerUtterance: "I want a coffee please",
    };
  }

  test("preferenciasEfetivas aceita as preferências capturadas, sem override", () => {
    responderTudo();
    const { preferences } = concluirOnboarding();
    const efetivas = preferenciasEfetivas(preferences, { overrides: undefined });
    expect(efetivas).toEqual(preferences);
  });

  test("decidirIntent produz um Intent sem avaliação nenhuma, usando a autoavaliação", () => {
    // Sem `LevelAssessment`, o nível vigente tem de cair na autoavaliação do onboarding —
    // que é exatamente o papel dela: ponto de partida declarado.
    const respostas: Respostas = {};
    for (const chave of ORDEM_DAS_PERGUNTAS) respostas[chave] = PERGUNTAS[chave].options[0]!.label;
    respostas.nivel = PERGUNTAS.nivel.options[3]!.label; // nível 4

    const intent = decidirIntent(entradaCom(respostas));
    expect(intent.targetLevel).toBe(4);
    expect(intent.missionGoal).toBe("Pedir um café");
    expect(intent.mustRequestProduction).toBe(true);
    expect(intent.supportRatio).toBeGreaterThanOrEqual(0);
    expect(intent.supportRatio).toBeLessThanOrEqual(1);
  });

  test("a escolha de personalidade chega ao Intent", () => {
    const base: Respostas = {};
    for (const chave of ORDEM_DAS_PERGUNTAS) base[chave] = PERGUNTAS[chave].options[0]!.label;

    const tranquila = decidirIntent(entradaCom({ ...base, personalidade: "Tranquila" }));
    const direta = decidirIntent(entradaCom({ ...base, personalidade: "Direta" }));
    expect(tranquila.effectivePreferences.style).toBe("tranquila");
    expect(direta.effectivePreferences.style).toBe("direta");
  });

  test("a preferência de áudio muda o suporte que o Intent carrega", () => {
    const base: Respostas = {};
    for (const chave of ORDEM_DAS_PERGUNTAS) base[chave] = PERGUNTAS[chave].options[0]!.label;
    const [normal, soExercicios] = PERGUNTAS.audio.options;

    const a = decidirIntent(entradaCom({ ...base, audio: normal!.label }));
    const b = decidirIntent(entradaCom({ ...base, audio: soExercicios!.label }));
    expect(a.effectivePreferences.supportLevel).toBe("medio");
    expect(b.effectivePreferences.supportLevel).toBe("alto");
    // Mais apoio declarado não pode resultar em MENOS suporte efetivo.
    expect(b.supportRatio).toBeGreaterThanOrEqual(a.supportRatio);
  });
});

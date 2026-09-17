import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decidirIntent, revisarTurno } from "./intent";
import { preferenciasEfetivas } from "./preferences";
import { supportRatio, TABELA_DE_SUPORTE } from "./support-policy";
import type { Correction } from "./turn-contract.generated";
import type { Level, Mission, PedagogicalInput, TeacherPreferences } from "./types";

const missao: Mission = {
  id: "cafe",
  goalPt: "Pedir um cafe",
  scenarioPt: "Voce esta no balcao de uma cafeteria em Londres.",
  targetLevel: 2,
  steps: [
    { index: 0, goalPt: "cumprimentar", openingEn: "Hi!", expectedWords: [], focusPt: "abertura" },
    {
      index: 1,
      goalPt: "pedir",
      openingEn: "Which one?",
      expectedWords: ["coffee"],
      focusPt: "pedido",
    },
    {
      index: 2,
      goalPt: "pagar",
      openingEn: "How to pay?",
      expectedWords: ["card"],
      focusPt: "pagamento",
    },
  ],
};

const preferencias: TeacherPreferences = {
  style: "tranquila",
  intensity: "media",
  supportLevel: "medio",
  speechRate: "normal",
};

function entrada(over: Partial<PedagogicalInput> = {}): PedagogicalInput {
  return {
    profile: { selfAssessedLevel: 2, reason: "trabalho", blocker: "travo", minutesPerDay: 10 },
    preferences: preferencias,
    assessments: [],
    session: { mode: "guided_mission", missionId: "cafe", stepIndex: 1, turnsUsed: 2 },
    mission: missao,
    recentFocus: ["plural de people", "uso de I'd like", "preposicao in/at", "artigo a/an"],
    practicedExpressions: ["I'd like"],
    recentTurns: [],
    learnerUtterance: "I want a coffee please",
    ...over,
  };
}

describe("o nucleo e funcao pura de estado, sem rede", () => {
  test("nenhum arquivo do dominio importa rede, SDK, provedor ou scripts/eval", () => {
    // Este teste É o critério de aceite. Ele lê o próprio módulo em vez de confiar em
    // revisão: qualquer import proibido que alguém adicione depois reprova aqui.
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const proibidos = [
      /from\s+["']node:https?["']/,
      /from\s+["']node:net["']/,
      /\bfetch\s*\(/,
      /from\s+["'].*scripts\/eval/,
      /from\s+["']groq/,
      /from\s+["']openai/,
      /XMLHttpRequest/,
    ];
    const arquivos = fs
      .readdirSync(dir)
      .filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
    expect(arquivos.length).toBeGreaterThan(0);
    for (const arquivo of arquivos) {
      const conteudo = fs.readFileSync(path.join(dir, arquivo), "utf8");
      for (const padrao of proibidos) {
        expect(padrao.test(conteudo), `${arquivo} casa com ${padrao}`).toBe(false);
      }
    }
  });

  test("chamar duas vezes com a mesma entrada devolve o mesmo Intent", () => {
    const dados = entrada();
    expect(decidirIntent(dados)).toEqual(decidirIntent(dados));
  });
});

describe("PedagogicalIntent como saida unica", () => {
  test("carrega tudo que o motor precisa e nada de LLM", () => {
    const intent = decidirIntent(entrada());
    expect(intent.targetLevel).toBe(2);
    expect(intent.missionGoal).toBe("Pedir um cafe");
    expect(intent.missionStep.index).toBe(1);
    expect(intent.mustRequestProduction).toBe(true);
    expect(intent.priorityCategories[0]).toBe("false_friend");
    expect(intent.maxCorrections).toBe(2);
  });

  test("recentFocus e limitado aos 3 mais recentes — mais que isso vira lista, nao foco", () => {
    const intent = decidirIntent(entrada());
    expect(intent.recentFocus).toEqual(["uso de I'd like", "preposicao in/at", "artigo a/an"]);
  });

  test("a etapa fechando muda o expectedNextAction", () => {
    const intent = decidirIntent(entrada({ learnerUtterance: "I want a coffee please" }));
    expect(intent.expectedNextAction).toBe("continue_mission");
    const parado = decidirIntent(entrada({ learnerUtterance: "I want a tea" }));
    expect(parado.expectedNextAction).toBe("reply");
  });
});

describe("suporte em pt-BR e tabela de dados, nao percentual em componente", () => {
  test("a proporcao cai conforme o nivel sobe", () => {
    const niveis: Level[] = [1, 2, 3, 4, 5];
    const proporcoes = niveis.map((n) => supportRatio(n, preferencias));
    expect(proporcoes).toEqual([1, 0.75, 0.5, 0.25, 0.1]);
    for (let i = 1; i < proporcoes.length; i += 1) {
      expect(proporcoes[i] ?? 1).toBeLessThan(proporcoes[i - 1] ?? 0);
    }
  });

  test("a tabela cobre os 5 niveis e fica entre 0 e 1", () => {
    for (const valor of Object.values(TABELA_DE_SUPORTE)) {
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThanOrEqual(1);
    }
    expect(Object.keys(TABELA_DE_SUPORTE)).toHaveLength(5);
  });

  test("a preferencia desloca a tabela, mas nivel vence gosto", () => {
    const n1Minimo = supportRatio(1, { ...preferencias, supportLevel: "minimo" });
    const n4Alto = supportRatio(4, { ...preferencias, supportLevel: "alto" });
    expect(n1Minimo).toBeGreaterThan(n4Alto);
  });

  test("nunca sai da faixa 0-1, mesmo com preferencia extrema", () => {
    expect(supportRatio(1, { ...preferencias, supportLevel: "alto" })).toBeLessThanOrEqual(1);
    expect(supportRatio(5, { ...preferencias, supportLevel: "minimo" })).toBeGreaterThanOrEqual(0);
  });
});

describe("overrides de sessao resolvem por merge e nao escrevem no perfil", () => {
  test("o override vale no turno", () => {
    const efetivas = preferenciasEfetivas(preferencias, { overrides: { style: "direta" } });
    expect(efetivas.style).toBe("direta");
    expect(efetivas.intensity).toBe("media");
  });

  test("o objeto persistente NAO e mutado", () => {
    const persistentes: TeacherPreferences = { ...preferencias };
    preferenciasEfetivas(persistentes, { overrides: { style: "direta", intensity: "alta" } });
    expect(persistentes.style).toBe("tranquila");
    expect(persistentes.intensity).toBe("media");
  });

  test("override com undefined nao apaga a preferencia persistente", () => {
    const efetivas = preferenciasEfetivas(persistentesComEstilo(), {
      overrides: { style: undefined },
    });
    expect(efetivas.style).toBe("tranquila");
  });

  test("sem overrides devolve as persistentes, em objeto novo", () => {
    const efetivas = preferenciasEfetivas(preferencias, {});
    expect(efetivas).toEqual(preferencias);
    expect(efetivas).not.toBe(preferencias);
  });

  test("o Intent expoe as preferencias EFETIVAS", () => {
    const intent = decidirIntent(
      entrada({
        session: {
          mode: "guided_mission",
          missionId: "cafe",
          stepIndex: 1,
          turnsUsed: 2,
          overrides: { supportLevel: "alto" },
        },
      }),
    );
    expect(intent.effectivePreferences.supportLevel).toBe("alto");
    // E a politica de suporte usa a efetiva, nao a persistente.
    expect(intent.supportRatio).toBe(supportRatio(2, { ...preferencias, supportLevel: "alto" }));
  });
});

function persistentesComEstilo(): TeacherPreferences {
  return { ...preferencias, style: "tranquila" };
}

describe("revisarTurno: o nucleo decide o que sai", () => {
  const comEvidencia: Correction = {
    original: "I want",
    suggested: "I'd like",
    explanation_pt: "soa melhor",
    category: "register",
  };
  const semEvidencia: Correction = {
    original: "nao esta na fala",
    suggested: "x",
    explanation_pt: "y",
    category: "false_friend",
  };
  const propostas: readonly Correction[] = [comEvidencia, semEvidencia];

  test("descarta a correcao sem evidencia e mantem a com evidencia", () => {
    const revisado = revisarTurno(entrada(), { corrections: propostas, nextAction: "reply" });
    expect(revisado.corrections.map((c) => c.original)).toEqual(["I want"]);
    expect(revisado.rejeitadasSemEvidencia).toHaveLength(1);
  });

  test("havendo correcao aceita, o next_action proposto reply vira retry", () => {
    const revisado = revisarTurno(entrada({ learnerUtterance: "I want a tea" }), {
      corrections: [comEvidencia],
      nextAction: "reply",
    });
    expect(revisado.nextAction).toBe("retry");
    expect(revisado.decisao.overridden).toBe(true);
  });

  test("complete_mission prematuro e recusado no fluxo completo", () => {
    const revisado = revisarTurno(entrada(), { corrections: [], nextAction: "complete_mission" });
    expect(revisado.nextAction).not.toBe("complete_mission");
    expect(revisado.decisao.overridden).toBe(true);
  });

  test("a proposta pode vir do input em vez do argumento", () => {
    // A fala fecha a etapa 1, entao a transicao e `advance`. Sem correcao, o `retry`
    // proposto e recusado e o que vale e a transicao real da missao.
    const revisado = revisarTurno(entrada({ proposedNextAction: "retry" }), { corrections: [] });
    expect(revisado.decisao.proposed).toBe("retry");
    expect(revisado.decisao.overridden).toBe(true);
    expect(revisado.nextAction).toBe("continue_mission");
  });
});

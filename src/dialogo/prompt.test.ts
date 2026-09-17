import { describe, expect, test } from "bun:test";

import { decidirIntent, type PedagogicalInput, type PedagogicalIntent } from "../domain";
import { MISSOES, missaoPorId } from "./missoes";
import { construirPrompt } from "./prompt";

/**
 * Entrada mínima válida para o núcleo. Usar `decidirIntent` de verdade — em vez de forjar um
 * Intent à mão — é o que garante que o prompt esteja lendo o Intent REAL do produto.
 */
function entrada(over: Partial<PedagogicalInput> = {}): PedagogicalInput {
  return {
    profile: {
      selfAssessedLevel: 2,
      reason: "Viagem",
      blocker: "Vergonha de errar",
      minutesPerDay: 10,
    },
    preferences: {
      style: "tranquila",
      intensity: "media",
      supportLevel: "medio",
      speechRate: "normal",
    },
    assessments: [],
    session: { mode: "guided_mission", missionId: "cafe", stepIndex: 0, turnsUsed: 0 },
    mission: missaoPorId("cafe")!,
    recentFocus: [],
    practicedExpressions: [],
    recentTurns: [],
    learnerUtterance: "I want a coffee please",
    ...over,
  };
}

function intentDe(over: Partial<PedagogicalInput> = {}): PedagogicalIntent {
  return decidirIntent(entrada(over));
}

describe("catálogo de missões", () => {
  test("toda missão tem ao menos uma etapa e índices contíguos desde zero", () => {
    for (const m of MISSOES) {
      expect(m.steps.length).toBeGreaterThan(0);
      m.steps.forEach((s, i) => expect(s.index).toBe(i));
    }
  });

  test("nenhuma etapa sem openingEn — sem isso o fallback tem buraco", () => {
    // O `openingEn` É o roteiro de fallback da DEC-20260916-0311. Etapa sem ele significa
    // um ponto do percurso onde o turno morreria na tela.
    for (const m of MISSOES) {
      for (const s of m.steps) expect(s.openingEn.trim()).not.toBe("");
    }
  });

  test("toda etapa declara o que o aluno precisa comunicar", () => {
    for (const m of MISSOES) {
      for (const s of m.steps) expect(s.goalPt.trim()).not.toBe("");
    }
  });

  test("ids únicos e busca por id funciona", () => {
    const ids = MISSOES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(missaoPorId("hotel")?.goalPt).toBe("Check-in no hotel");
    expect(missaoPorId("nao-existe")).toBeUndefined();
  });
});

describe("construirPrompt é função pura do Intent", () => {
  test("mesmo Intent produz exatamente o mesmo prompt", () => {
    const i = intentDe();
    expect(construirPrompt(i)).toBe(construirPrompt(i));
  });

  test("não faz rede nem toca disco — roda no teste sem nada mockado", () => {
    // Se houvesse import de rede, este teste falharia por ausência de fetch/credencial.
    expect(construirPrompt(intentDe()).length).toBeGreaterThan(0);
  });

  test("declara que a entrada é fala transcrita (DEC-20260916-0312)", () => {
    const p = construirPrompt(intentDe());
    expect(p).toContain("FALA TRANSCRITA");
    expect(p).toMatch(/nao corrija maiuscula, pontuacao nem grafia/);
  });
});

describe("o prompt LÊ o Intent, em vez de repetir política", () => {
  test("targetLevel muda o prompt de forma observável", () => {
    const baixo = construirPrompt(
      intentDe({ profile: { ...entrada().profile, selfAssessedLevel: 1 } }),
    );
    const alto = construirPrompt(
      intentDe({ profile: { ...entrada().profile, selfAssessedLevel: 5 } }),
    );
    expect(baixo).toContain("Nivel estimado do aluno (1 a 5): 1");
    expect(alto).toContain("Nivel estimado do aluno (1 a 5): 5");
    expect(baixo).not.toBe(alto);
  });

  test("maxCorrections vem do Intent, não de literal no texto", () => {
    // A eval fixa "no maximo 3" no prompt. Aqui o número é do núcleo, por nível.
    const i = intentDe();
    expect(construirPrompt(i)).toContain(`no maximo ${i.maxCorrections} ponto(s) de correcao`);
  });

  test("supportRatio muda a instrução de apoio", () => {
    const pouco = intentDe({
      preferences: { ...entrada().preferences, supportLevel: "minimo" },
      profile: { ...entrada().profile, selfAssessedLevel: 5 },
    });
    const muito = intentDe({
      preferences: { ...entrada().preferences, supportLevel: "alto" },
      profile: { ...entrada().profile, selfAssessedLevel: 1 },
    });
    expect(pouco.supportRatio).toBeLessThan(muito.supportRatio);
    expect(construirPrompt(muito)).toContain("MUITO apoio em portugues");
    expect(construirPrompt(pouco)).not.toContain("MUITO apoio em portugues");
  });

  test("style muda o tom, e valor desconhecido cai no paciente", () => {
    const direta = construirPrompt(
      intentDe({ preferences: { ...entrada().preferences, style: "direta" } }),
    );
    const tranquila = construirPrompt(
      intentDe({ preferences: { ...entrada().preferences, style: "tranquila" } }),
    );
    const inventado = construirPrompt(
      intentDe({ preferences: { ...entrada().preferences, style: "sarcastica" } }),
    );
    expect(direta).toContain("direta e sem rodeios");
    expect(tranquila).toContain("paciente e calorosa");
    // Enum ABERTO no núcleo: valor novo não pode virar prompt sem tom.
    expect(inventado).toContain("paciente e calorosa");
  });

  test("priorityCategories entra como ordem de prioridade", () => {
    const i = intentDe();
    expect(construirPrompt(i)).toContain(i.priorityCategories.join(", "));
  });

  test("a etapa da missão aparece no prompt", () => {
    const i = intentDe();
    expect(construirPrompt(i)).toContain(i.missionStep.goalPt);
  });

  test("mustRequestProduction liga a regra de devolver a bola", () => {
    const i = intentDe();
    expect(i.mustRequestProduction).toBe(true);
    expect(construirPrompt(i)).toContain("Termine SEMPRE com uma pergunta clara em ingles");
  });

  test("recentFocus vazio não gera linha; com conteúdo, gera", () => {
    const sem = construirPrompt(intentDe({ recentFocus: [] }));
    const com = construirPrompt(intentDe({ recentFocus: ["preposições de tempo"] }));
    expect(sem).not.toContain("Pontos recentes de melhoria");
    expect(com).toContain("preposições de tempo");
  });

  test("missão diferente muda objetivo e cenário", () => {
    const cafe = construirPrompt(intentDe());
    const hotel = construirPrompt(
      intentDe({
        mission: missaoPorId("hotel")!,
        session: { mode: "guided_mission", missionId: "hotel", stepIndex: 0, turnsUsed: 0 },
      }),
    );
    expect(cafe).toContain("Pedir um café");
    expect(hotel).toContain("Check-in no hotel");
  });
});

describe("o prompt não decide pedagogia", () => {
  test("não afirma teto de correção fora do que o Intent diz", () => {
    const p = construirPrompt(intentDe());
    // Nenhum número literal de teto sobrando no texto além do que veio do Intent.
    const tetos = p.match(/no maximo (\d+)/g) ?? [];
    expect(tetos).toHaveLength(1);
    expect(tetos[0]).toBe(`no maximo ${intentDe().maxCorrections}`);
  });

  test("deixa explícito que next_action é proposta, não decisão", () => {
    expect(construirPrompt(intentDe())).toContain("quem decide e o motor pedagogico");
  });
});

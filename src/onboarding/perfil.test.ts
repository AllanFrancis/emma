import { describe, expect, test } from "bun:test";

import { PREFERENCIAS_NAO_PERGUNTADAS } from "./defaults";
import { montarPerfil, respostasCompletas, type Respostas } from "./perfil";
import { ORDEM_DAS_PERGUNTAS, PERCURSO, PERGUNTAS, progressoDa, telaSeguinte } from "./questions";

/** Respostas válidas, escolhendo sempre a primeira opção de cada pergunta. */
function respostasValidas(over: Respostas = {}): Respostas {
  const base: Respostas = {};
  for (const chave of ORDEM_DAS_PERGUNTAS) base[chave] = PERGUNTAS[chave].options[0]!.label;
  return { ...base, ...over };
}

describe("catálogo das perguntas", () => {
  test("são exatamente seis, e quantoFala/quando ficaram fora", () => {
    expect(ORDEM_DAS_PERGUNTAS).toHaveLength(6);
    expect(ORDEM_DAS_PERGUNTAS).not.toContain("quantoFala");
    expect(ORDEM_DAS_PERGUNTAS).not.toContain("quando");
  });

  test("toda pergunta tem enunciado e pelo menos duas opções", () => {
    for (const chave of ORDEM_DAS_PERGUNTAS) {
      const q = PERGUNTAS[chave];
      expect(q.prompt.trim()).not.toBe("");
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      for (const o of q.options) expect(o.label.trim()).not.toBe("");
    }
  });

  test("a chave do catálogo casa com a chave declarada dentro da pergunta", () => {
    for (const chave of ORDEM_DAS_PERGUNTAS) expect(PERGUNTAS[chave].key).toBe(chave);
  });

  test("nenhuma opção repetida dentro da mesma pergunta", () => {
    // O `label` É o valor gravado, então rótulo duplicado tornaria a resposta ambígua.
    for (const chave of ORDEM_DAS_PERGUNTAS) {
      const labels = PERGUNTAS[chave].options.map((o) => o.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});

describe("barra de progresso conta telas reais", () => {
  test("o percurso inclui as telas que não são pergunta", () => {
    expect(PERCURSO).toContain("entrada");
    expect(PERCURSO).toContain("promessa");
    expect(PERCURSO).toHaveLength(ORDEM_DAS_PERGUNTAS.length + 2);
  });

  test("o progresso cresce de forma monótona e sem salto", () => {
    // O protótipo dividia por 8 perguntas com 4 telas intercaladas fora da contagem, o que
    // fazia o progresso pular. Aqui cada tela vale exatamente um passo.
    const passos = PERCURSO.map(progressoDa);
    for (let i = 1; i < passos.length; i += 1) {
      expect(passos[i]!).toBeGreaterThan(passos[i - 1]!);
    }
    const incrementos = passos.map((p, i) => (i === 0 ? p : p - passos[i - 1]!));
    const primeiro = incrementos[0]!;
    for (const inc of incrementos) expect(inc).toBeCloseTo(primeiro, 10);
  });

  test("a última tela fecha em 100%", () => {
    expect(progressoDa(PERCURSO[PERCURSO.length - 1]!)).toBeCloseTo(1, 10);
  });

  test("a última tela não tem seguinte", () => {
    expect(telaSeguinte(PERCURSO[PERCURSO.length - 1]!)).toBeUndefined();
    expect(telaSeguinte("entrada")).toBe("promessa");
  });
});

describe("montarPerfil", () => {
  test("grava os quatro campos do LearnerProfile que têm consumidor", () => {
    const { profile } = montarPerfil(
      respostasValidas({
        nivel: PERGUNTAS.nivel.options[2]!.label,
        motivo: "Trabalho e carreira",
        bloqueio: "Vergonha de errar",
        minutos: "20 minutos",
      }),
    );
    expect(profile.selfAssessedLevel).toBe(3);
    expect(profile.reason).toBe("Trabalho e carreira");
    expect(profile.blocker).toBe("Vergonha de errar");
    expect(profile.minutesPerDay).toBe(20);
  });

  test("NÃO grava preferredTime — campo sem consumidor na Fase 1 é dívida", () => {
    const { profile } = montarPerfil(respostasValidas());
    expect(profile.preferredTime).toBeUndefined();
    expect(Object.keys(profile)).not.toContain("preferredTime");
  });

  test("as cinco opções de nível mapeiam 1..5 na ordem", () => {
    const niveis = PERGUNTAS.nivel.options.map(
      (o) => montarPerfil(respostasValidas({ nivel: o.label })).profile.selfAssessedLevel,
    );
    expect(niveis).toEqual([1, 2, 3, 4, 5]);
  });

  test("as quatro opções de minutos mapeiam 5/10/20/30", () => {
    const minutos = PERGUNTAS.minutos.options.map(
      (o) => montarPerfil(respostasValidas({ minutos: o.label })).profile.minutesPerDay,
    );
    expect(minutos).toEqual([5, 10, 20, 30]);
  });

  test("personalidade escolhe o style", () => {
    expect(montarPerfil(respostasValidas({ personalidade: "Tranquila" })).preferences.style).toBe(
      "tranquila",
    );
    expect(montarPerfil(respostasValidas({ personalidade: "Direta" })).preferences.style).toBe(
      "direta",
    );
  });

  test("preferência de áudio move o supportLevel", () => {
    const [normal, soExercicios] = PERGUNTAS.audio.options;
    const a = montarPerfil(respostasValidas({ audio: normal!.label })).preferences.supportLevel;
    const b = montarPerfil(respostasValidas({ audio: soExercicios!.label })).preferences
      .supportLevel;
    expect(a).toBe("medio");
    expect(b).toBe("alto");
    expect(a).not.toBe(b);
  });

  test("intensity e speechRate vêm do único lugar centralizado", () => {
    const { preferences } = montarPerfil(respostasValidas());
    expect(preferences.intensity).toBe(PREFERENCIAS_NAO_PERGUNTADAS.intensity);
    expect(preferences.speechRate).toBe(PREFERENCIAS_NAO_PERGUNTADAS.speechRate);
  });

  test("TeacherPreferences sai COMPLETO — preferenciasEfetivas do núcleo exige os quatro", () => {
    const { preferences } = montarPerfil(respostasValidas());
    expect(Object.keys(preferences).sort()).toEqual([
      "intensity",
      "speechRate",
      "style",
      "supportLevel",
    ]);
  });

  test("nenhum campo além dos que o núcleo define", () => {
    const { profile } = montarPerfil(respostasValidas());
    for (const chave of Object.keys(profile)) {
      expect(["selfAssessedLevel", "reason", "blocker", "minutesPerDay"]).toContain(chave);
    }
  });

  test("recusa perfil parcial em vez de gravar meio dado", () => {
    const parcial = respostasValidas();
    delete parcial.bloqueio;
    expect(respostasCompletas(parcial)).toBe(false);
    expect(() => montarPerfil(parcial)).toThrow(/incompleto.*bloqueio/);
  });

  test("recusa resposta que não está no catálogo", () => {
    expect(() => montarPerfil(respostasValidas({ nivel: "Sou fluente desde bebê" }))).toThrow(
      /não está no catálogo/,
    );
  });

  test("respostasCompletas só é true com as seis", () => {
    expect(respostasCompletas({})).toBe(false);
    expect(respostasCompletas(respostasValidas())).toBe(true);
  });
});

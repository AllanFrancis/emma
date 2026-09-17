import { describe, expect, test } from "bun:test";

import type { PedagogicalInput, TurnOutput } from "../domain";
import type { AdapterDeProvedor, ResultadoDoProvedor } from "./adapter";
import { estimarTokens, recortarJanela } from "./janela";
import { missaoPorId } from "./missoes";
import { produzirTurno, type ValidadorDeTurno } from "./motor";

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

const turnoValido: TurnOutput = {
  reply_en: "Nice choice! Small or large?",
  reply_pt: "Boa escolha! Pequeno ou grande?",
  instruction_pt: "Agora diga o tamanho que você quer.",
  corrections: [
    {
      original: "I want a coffee",
      suggested: "I'd like a coffee",
      explanation_pt: "Num pedido, 'I'd like' soa mais natural do que 'I want'.",
      category: "register",
    },
  ],
  suggestion_en: "A small one, please.",
  suggestion_pt: "Um pequeno, por favor.",
  words: ["I'd like"],
  focus: "pedidos com I'd like",
  next_action: "retry",
};

/** Validador que aceita tudo. Os testes de validação usam variantes que recusam. */
const validadorPermissivo: ValidadorDeTurno = {
  validarSchema: () => [],
  validarEvidencia: () => [],
};

function adapterQue(...respostas: ResultadoDoProvedor[]): AdapterDeProvedor & { chamadas: number } {
  let i = 0;
  const a = {
    nome: "falso",
    chamadas: 0,
    async gerarTurno() {
      a.chamadas += 1;
      return respostas[Math.min(i++, respostas.length - 1)]!;
    },
  };
  return a;
}

const sucesso = (turno: TurnOutput = turnoValido): ResultadoDoProvedor => ({
  ok: true,
  conteudo: JSON.stringify(turno),
  tokensUsados: 1065,
});

const deps = (adapter: AdapterDeProvedor | undefined, validador = validadorPermissivo) => ({
  adapter,
  schema: { name: "emma_turn" },
  validador,
});

describe("caminho felizes", () => {
  test("entrega o turno do modelo em uma tentativa", async () => {
    const a = adapterQue(sucesso());
    const r = await produzirTurno(entrada(), deps(a));
    expect(r.origem).toBe("modelo");
    expect(a.chamadas).toBe(1);
    expect(r.turno.reply_en).toBe(turnoValido.reply_en);
    expect(r.diagnostico.tentativas).toBe(1);
    expect(r.diagnostico.falhas).toHaveLength(0);
  });

  test("registra latência e o token MEDIDO do provedor", async () => {
    let t = 1000;
    const r = await produzirTurno(entrada(), {
      ...deps(adapterQue(sucesso())),
      agora: () => (t += 37),
    });
    expect(r.diagnostico.latenciaMs).toBeGreaterThan(0);
    // O número medido é o que decide mover o teto — a estimativa só serve para o corte.
    expect(r.diagnostico.tokensMedidos).toBe(1065);
  });

  test("a decisão final de correções e next_action é do NÚCLEO, não do modelo", async () => {
    // O modelo propõe `reply` mantendo a correção. O núcleo tem de sobrescrever para `retry`,
    // porque correção emitida exige aplicação fora do fechamento de missão.
    const propostaIncoerente: TurnOutput = { ...turnoValido, next_action: "reply" };
    const r = await produzirTurno(entrada(), deps(adapterQue(sucesso(propostaIncoerente))));
    expect(r.turno.corrections).toHaveLength(1);
    expect(r.nextAction).toBe("retry");
    expect(r.turno.next_action).toBe("retry");
  });

  test("correção sem evidência é recusada pelo núcleo antes de chegar ao aluno", async () => {
    const inventada: TurnOutput = {
      ...turnoValido,
      corrections: [
        {
          original: "isto nao esta na fala do aluno",
          suggested: "qualquer coisa",
          explanation_pt: "explicação em português.",
          category: "grammar",
        },
      ],
    };
    const r = await produzirTurno(entrada(), deps(adapterQue(sucesso(inventada))));
    expect(r.corrections).toHaveLength(0);
  });
});

describe("o turno NUNCA morre na tela", () => {
  test("json_validate_failed recebe retry e depois cai no roteiro", async () => {
    const a = adapterQue({
      ok: false,
      falha: { tipo: "json_validate_failed", detalhe: "strict recusou" },
    });
    const r = await produzirTurno(entrada(), { ...deps(a), maxTentativas: 3 });
    expect(a.chamadas).toBe(3);
    expect(r.origem).toBe("roteiro");
    expect(r.diagnostico.falhas).toEqual([
      "json_validate_failed",
      "json_validate_failed",
      "json_validate_failed",
    ]);
    // Roteiro entra no ponto CERTO do percurso: openingEn da etapa atual.
    expect(r.turno.reply_en).toBe(missaoPorId("cafe")!.steps[0]!.openingEn);
    expect(r.turno.instruction_pt.trim()).not.toBe("");
  });

  test("retry recupera: falha na primeira, sucesso na segunda", async () => {
    const a = adapterQue(
      { ok: false, falha: { tipo: "json_validate_failed", detalhe: "x" } },
      sucesso(),
    );
    const r = await produzirTurno(entrada(), deps(a));
    expect(r.origem).toBe("modelo");
    expect(a.chamadas).toBe(2);
    expect(r.diagnostico.falhas).toEqual(["json_validate_failed"]);
  });

  test("rate limit NÃO insiste, cai no roteiro e vira mensagem compreensível", async () => {
    const a = adapterQue({ ok: false, falha: { tipo: "rate_limit", retryAfterSegundos: 502 } });
    const r = await produzirTurno(entrada(), deps(a));
    expect(a.chamadas).toBe(1);
    expect(r.origem).toBe("roteiro");
    expect(r.avisoParaOAluno).toBe("Me dá um segundo, já volto.");
    // Nunca erro cru.
    expect(r.avisoParaOAluno).not.toMatch(/429|HTTP|rate/i);
  });

  test("falha irrecuperável não insiste e cai no roteiro", async () => {
    const a = adapterQue({ ok: false, falha: { tipo: "irrecuperavel", detalhe: "rede caiu" } });
    const r = await produzirTurno(entrada(), deps(a));
    expect(a.chamadas).toBe(1);
    expect(r.origem).toBe("roteiro");
    expect(r.avisoParaOAluno).not.toContain("rede caiu");
  });

  test("sem credencial nenhuma, o turno ainda chega", async () => {
    const r = await produzirTurno(entrada(), deps(undefined));
    expect(r.origem).toBe("roteiro");
    expect(r.diagnostico.falhas).toEqual(["sem_credencial"]);
    expect(r.turno.reply_en.trim()).not.toBe("");
  });

  test("JSON ilegível conta como falha de contrato e vai para retry", async () => {
    const a = adapterQue({ ok: true, conteudo: "{isto não é json" }, sucesso());
    const r = await produzirTurno(entrada(), deps(a));
    expect(r.origem).toBe("modelo");
    expect(r.diagnostico.falhas).toEqual(["json_validate_failed"]);
  });

  test("um turno chega em 100% das combinações de falha", async () => {
    const falhas: ResultadoDoProvedor[] = [
      { ok: false, falha: { tipo: "json_validate_failed", detalhe: "a" } },
      { ok: false, falha: { tipo: "rate_limit" } },
      { ok: false, falha: { tipo: "irrecuperavel", detalhe: "b" } },
      { ok: false, falha: { tipo: "sem_credencial" } },
      { ok: true, conteudo: "nao json" },
    ];
    for (const f of falhas) {
      const r = await produzirTurno(entrada(), { ...deps(adapterQue(f)), maxTentativas: 2 });
      expect(r.turno.reply_en.trim()).not.toBe("");
      expect(["modelo", "roteiro"]).toContain(r.origem);
    }
  });
});

describe("validação acontece no SERVIDOR, antes de chegar ao cliente", () => {
  test("schema inválido não passa, mesmo com HTTP 200", async () => {
    const recusaSchema: ValidadorDeTurno = {
      validarSchema: () => ["falta reply_en"],
      validarEvidencia: () => [],
    };
    const r = await produzirTurno(entrada(), {
      ...deps(adapterQue(sucesso()), recusaSchema),
      maxTentativas: 2,
    });
    expect(r.origem).toBe("roteiro");
  });

  test("evidência não citada não passa", async () => {
    const recusaEvidencia: ValidadorDeTurno = {
      validarSchema: () => [],
      validarEvidencia: () => ["original não ocorre na fala"],
    };
    const r = await produzirTurno(entrada(), {
      ...deps(adapterQue(sucesso()), recusaEvidencia),
      maxTentativas: 2,
    });
    expect(r.origem).toBe("roteiro");
  });
});

describe("janela de histórico é ORÇAMENTO, não política de retenção", () => {
  const turnos = Array.from({ length: 20 }, (_, i) => ({
    learnerUtterance: `fala do aluno numero ${i} `.repeat(6),
    emmaReplyEn: `Emma reply number ${i} `.repeat(6),
  }));

  test("mantém os mais recentes e descarta os mais antigos", () => {
    const j = recortarJanela(turnos, 200);
    expect(j.turnosIncluidos).toBeGreaterThan(0);
    expect(j.turnosDescartados).toBeGreaterThan(0);
    expect(j.tokensEstimados).toBeLessThanOrEqual(200);
    // O último turno da conversa tem de estar sempre lá.
    const ultimo = turnos[turnos.length - 1]!;
    expect(j.mensagens.at(-1)?.content).toBe(ultimo.emmaReplyEn);
  });

  test("turno entra inteiro: user e assistant sempre em par", () => {
    const j = recortarJanela(turnos, 500);
    expect(j.mensagens).toHaveLength(j.turnosIncluidos * 2);
    for (let i = 0; i < j.mensagens.length; i += 2) {
      expect(j.mensagens[i]!.role).toBe("user");
      expect(j.mensagens[i + 1]!.role).toBe("assistant");
    }
  });

  test("teto generoso inclui tudo; teto zero inclui nada", () => {
    expect(recortarJanela(turnos, 1_000_000).turnosIncluidos).toBe(turnos.length);
    expect(recortarJanela(turnos, 0).turnosIncluidos).toBe(0);
  });

  test("o corte é por CUSTO, não por conteúdo", () => {
    // Dois históricos com o mesmo tamanho em caracteres cortam no mesmo ponto, ainda que um
    // repita pergunta e o outro não. Nada aqui olha o significado — política de retenção é
    // da SPEC-20260916-2257, não desta.
    const repetitivo = Array.from({ length: 8 }, () => ({
      learnerUtterance: "aaaa".repeat(10),
      emmaReplyEn: "bbbb".repeat(10),
    }));
    const variado = Array.from({ length: 8 }, (_, i) => ({
      learnerUtterance: `${i}aaa`.repeat(10),
      emmaReplyEn: `${i}bbb`.repeat(10),
    }));
    expect(recortarJanela(repetitivo, 100).turnosIncluidos).toBe(
      recortarJanela(variado, 100).turnosIncluidos,
    );
  });

  test("o diagnóstico do turno reporta o que ficou fora por orçamento", async () => {
    const r = await produzirTurno(entrada({ recentTurns: turnos }), {
      ...deps(adapterQue(sucesso())),
      tetoDeHistorico: 200,
    });
    expect(r.diagnostico.turnosDescartadosPorOrcamento).toBeGreaterThan(0);
    expect(r.diagnostico.tokensEstimadosDeHistorico).toBeLessThanOrEqual(200);
  });

  test("estimarTokens é monótono no tamanho", () => {
    expect(estimarTokens("")).toBe(0);
    expect(estimarTokens("abcd")).toBeLessThanOrEqual(estimarTokens("abcdefgh"));
  });
});

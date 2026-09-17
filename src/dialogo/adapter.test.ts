import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import {
  configDoAmbiente,
  criarAdapterGroq,
  GROQ_PADRAO,
  mensagemParaOAluno,
  type ConfigDoGroq,
} from "./adapter";

/** O schema REAL, da fonte única — o mesmo arquivo que o strict mode consome. */
const SCHEMA = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dir, "..", "..", "scripts", "eval", "turn-schema.json"),
    "utf8",
  ),
) as { name: string; schema: unknown; strict: boolean };

const config: ConfigDoGroq = {
  apiKey: "gsk_chave_de_teste",
  modelo: "openai/gpt-oss-20b",
  endpoint: "https://exemplo.invalido/v1/chat/completions",
};

const fetchOriginal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

/** Intercepta o fetch e devolve o pedido montado, sem sair para a rede. */
function interceptar(resposta: Response): { pedido: () => { url: string; init: RequestInit } } {
  let capturado: { url: string; init: RequestInit } | undefined;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    capturado = { url, init };
    return resposta;
  }) as unknown as typeof fetch;
  return {
    pedido: () => {
      if (!capturado) throw new Error("fetch nao foi chamado");
      return capturado;
    },
  };
}

function respostaOk(conteudo: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(conteudo) } }],
      usage: { total_tokens: 1065 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("configuração vem do ambiente do servidor", () => {
  test("sem GROQ_API_KEY não há config — e isso não lança", () => {
    expect(configDoAmbiente({})).toBeUndefined();
    expect(configDoAmbiente({ GROQ_MODEL: "x" })).toBeUndefined();
  });

  test("com a chave, modelo e endpoint caem no padrão", () => {
    const c = configDoAmbiente({ GROQ_API_KEY: "gsk_x" });
    expect(c?.modelo).toBe(GROQ_PADRAO.modelo);
    expect(c?.endpoint).toBe(GROQ_PADRAO.endpoint);
  });

  test("modelo e endpoint são configuráveis, não literais fixos", () => {
    const c = configDoAmbiente({
      GROQ_API_KEY: "gsk_x",
      GROQ_MODEL: "outro/modelo",
      GROQ_ENDPOINT: "https://outro.invalido/v1",
    });
    expect(c?.modelo).toBe("outro/modelo");
    expect(c?.endpoint).toBe("https://outro.invalido/v1");
  });
});

describe("o pedido usa json_schema com strict true, do turn-schema.json", () => {
  test("response_format é json_schema e strict vem do arquivo", async () => {
    const i = interceptar(respostaOk({ reply_en: "ok?" }));
    const adapter = criarAdapterGroq(config);
    await adapter.gerarTurno({ systemPrompt: "sys", mensagens: [], schema: SCHEMA });

    const corpo = JSON.parse(i.pedido().init.body as string) as {
      model: string;
      response_format: { type: string; json_schema: { name: string; strict: boolean } };
    };
    expect(corpo.response_format.type).toBe("json_schema");
    expect(corpo.response_format.json_schema.strict).toBe(true);
    // O schema é o do arquivo, não uma segunda cópia dentro do app.
    expect(corpo.response_format.json_schema.name).toBe(SCHEMA.name);
    expect(SCHEMA.strict).toBe(true);
  });

  test("o system prompt vai como primeira mensagem, e o histórico depois", async () => {
    const i = interceptar(respostaOk({ reply_en: "ok?" }));
    await criarAdapterGroq(config).gerarTurno({
      systemPrompt: "PROMPT DE SISTEMA",
      mensagens: [
        { role: "user", content: "fala 1" },
        { role: "assistant", content: "resposta 1" },
      ],
      schema: SCHEMA,
    });
    const corpo = JSON.parse(i.pedido().init.body as string) as {
      messages: { role: string; content: string }[];
    };
    expect(corpo.messages[0]).toEqual({ role: "system", content: "PROMPT DE SISTEMA" });
    expect(corpo.messages).toHaveLength(3);
  });

  test("a chave vai no header Authorization, nunca no corpo nem na URL", async () => {
    const i = interceptar(respostaOk({ reply_en: "ok?" }));
    await criarAdapterGroq(config).gerarTurno({
      systemPrompt: "sys",
      mensagens: [],
      schema: SCHEMA,
    });
    const { url, init } = i.pedido();
    const headers = init.headers as Record<string, string>;
    expect(headers["authorization"]).toBe(`Bearer ${config.apiKey}`);
    expect(url).not.toContain(config.apiKey);
    expect(init.body as string).not.toContain(config.apiKey);
  });
});

describe("falhas viram erro TIPADO, não exceção", () => {
  test("429 vira rate_limit e lê retry-after", async () => {
    interceptar(new Response("limite", { status: 429, headers: { "retry-after": "502" } }));
    const r = await criarAdapterGroq(config).gerarTurno({
      systemPrompt: "sys",
      mensagens: [],
      schema: SCHEMA,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.falha.tipo).toBe("rate_limit");
      if (r.falha.tipo === "rate_limit") expect(r.falha.retryAfterSegundos).toBe(502);
    }
  });

  test("429 sem retry-after ainda é rate_limit", async () => {
    interceptar(new Response("limite", { status: 429 }));
    const r = await criarAdapterGroq(config).gerarTurno({
      systemPrompt: "sys",
      mensagens: [],
      schema: SCHEMA,
    });
    if (!r.ok) expect(r.falha.tipo).toBe("rate_limit");
  });

  test("400 com json_validate_failed é distinguido do resto", async () => {
    interceptar(
      new Response(JSON.stringify({ error: { code: "json_validate_failed" } }), { status: 400 }),
    );
    const r = await criarAdapterGroq(config).gerarTurno({
      systemPrompt: "sys",
      mensagens: [],
      schema: SCHEMA,
    });
    if (!r.ok) expect(r.falha.tipo).toBe("json_validate_failed");
  });

  test("outro 4xx/5xx é irrecuperável", async () => {
    interceptar(new Response("boom", { status: 500 }));
    const r = await criarAdapterGroq(config).gerarTurno({
      systemPrompt: "sys",
      mensagens: [],
      schema: SCHEMA,
    });
    if (!r.ok) expect(r.falha.tipo).toBe("irrecuperavel");
  });

  test("rede caindo não lança, vira irrecuperável", async () => {
    globalThis.fetch = (() => Promise.reject(new Error("ECONNREFUSED"))) as unknown as typeof fetch;
    const r = await criarAdapterGroq(config).gerarTurno({
      systemPrompt: "sys",
      mensagens: [],
      schema: SCHEMA,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.falha.tipo).toBe("irrecuperavel");
  });

  test("200 sem choices[0].message.content é irrecuperável", async () => {
    interceptar(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    const r = await criarAdapterGroq(config).gerarTurno({
      systemPrompt: "sys",
      mensagens: [],
      schema: SCHEMA,
    });
    if (!r.ok) expect(r.falha.tipo).toBe("irrecuperavel");
  });

  test("sucesso devolve o conteúdo e o token MEDIDO", async () => {
    interceptar(respostaOk({ reply_en: "Small or large?" }));
    const r = await criarAdapterGroq(config).gerarTurno({
      systemPrompt: "sys",
      mensagens: [],
      schema: SCHEMA,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(JSON.parse(r.conteudo)).toEqual({ reply_en: "Small or large?" });
      expect(r.tokensUsados).toBe(1065);
    }
  });
});

describe("mensagem para o aluno nunca é erro cru", () => {
  test("rate limit pede um segundo", () => {
    expect(mensagemParaOAluno({ tipo: "rate_limit" })).toBe("Me dá um segundo, já volto.");
  });

  test("nenhuma mensagem vaza detalhe técnico", () => {
    const mensagens = [
      mensagemParaOAluno({ tipo: "rate_limit" }),
      mensagemParaOAluno({ tipo: "json_validate_failed", detalhe: "HTTP 400 schema" }),
      mensagemParaOAluno({ tipo: "irrecuperavel", detalhe: "ECONNREFUSED 127.0.0.1" }),
      mensagemParaOAluno({ tipo: "sem_credencial" }),
    ];
    for (const m of mensagens) {
      expect(m).not.toMatch(/HTTP|429|500|ECONNREFUSED|json_validate|token|api/i);
      expect(m.trim()).not.toBe("");
    }
  });
});

describe("o adapter nao conhece o nucleo", () => {
  test("adapter.ts nao importa nada de src/domain", () => {
    // A fronteira existe para trocar de provedor sem tocar o nucleo. Se o adapter importasse
    // tipo do dominio, a troca deixaria de ser isolada.
    const fonte = fs.readFileSync(path.resolve(import.meta.dir, "adapter.ts"), "utf8");
    expect(fonte).not.toMatch(/from\s+["']\.\.\/domain/);
    expect(fonte).not.toMatch(/PedagogicalIntent|LearnerProfile|revisarTurno|decidirIntent/);
  });
});

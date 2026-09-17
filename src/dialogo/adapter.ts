/**
 * Adapter de provedor de LLM (task 2.0 da SPEC-20260916-1652-motor-de-dialogo).
 *
 * A fronteira existe para uma coisa só: trocar de provedor não pode tocar o núcleo nem a
 * interface. Por isso NENHUM tipo do núcleo cruza esta interface — o adapter recebe texto e
 * schema, e devolve texto ou erro tipado. Ele não sabe o que é um Intent.
 *
 * Invariante do contrato: a chave de API nunca aparece no bundle do cliente. Aqui ela é
 * lida do ambiente do SERVIDOR, e este módulo só é importado pela server function.
 */

/** Falhas que o motor precisa distinguir para decidir entre retry, fallback e mensagem. */
export type FalhaDoProvedor =
  /** Strict mode recusou a geração. É o caso que a DEC-20260916-0311 manda tentar de novo. */
  | { readonly tipo: "json_validate_failed"; readonly detalhe: string }
  /**
   * Teto por TOKENS por minuto — não por requisições. O tier gratuito estoura por token, e
   * `retryAfterSegundos` vem do header quando o provedor manda.
   */
  | { readonly tipo: "rate_limit"; readonly retryAfterSegundos?: number }
  /** Configuração ausente. Não adianta tentar de novo. */
  | { readonly tipo: "sem_credencial" }
  /** Qualquer outra: rede caiu, 5xx, timeout, resposta ilegível. */
  | { readonly tipo: "irrecuperavel"; readonly detalhe: string };

export type ResultadoDoProvedor =
  | { readonly ok: true; readonly conteudo: string; readonly tokensUsados?: number }
  | { readonly ok: false; readonly falha: FalhaDoProvedor };

/** O que o motor precisa de um provedor. Nada além disto. */
export interface AdapterDeProvedor {
  readonly nome: string;
  gerarTurno(pedido: {
    readonly systemPrompt: string;
    /** Histórico já recortado pelo orçamento. O adapter não decide o que cabe. */
    readonly mensagens: readonly {
      readonly role: "user" | "assistant";
      readonly content: string;
    }[];
    /** O schema do turno, carregado da FONTE ÚNICA por quem chama. */
    readonly schema: unknown;
  }): Promise<ResultadoDoProvedor>;
}

export interface ConfigDoGroq {
  readonly apiKey: string;
  readonly modelo: string;
  readonly endpoint: string;
}

/** Endpoint e modelo como CONFIGURAÇÃO, nunca literal espalhado pelo código. */
export const GROQ_PADRAO = {
  endpoint: "https://api.groq.com/openai/v1/chat/completions",
  modelo: "openai/gpt-oss-20b",
} as const;

/**
 * Lê a configuração do ambiente do SERVIDOR.
 *
 * Devolve `undefined` em vez de lançar quando falta a chave: quem chama transforma isso em
 * `sem_credencial` e cai no roteiro, em vez de derrubar o turno.
 */
export function configDoAmbiente(
  env: Record<string, string | undefined>,
): ConfigDoGroq | undefined {
  const apiKey = env["GROQ_API_KEY"];
  if (!apiKey) return undefined;
  return {
    apiKey,
    modelo: env["GROQ_MODEL"] ?? GROQ_PADRAO.modelo,
    endpoint: env["GROQ_ENDPOINT"] ?? GROQ_PADRAO.endpoint,
  };
}

/** `retry-after` em segundos, quando o provedor manda. */
function retryAfterDe(headers: Headers): number | undefined {
  const cru = headers.get("retry-after");
  if (!cru) return undefined;
  const n = Number(cru);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Adapter do Groq pelo endpoint compatível com OpenAI.
 *
 * `response_format: json_schema` com `strict: true`. O schema é passado por quem chama, e
 * vem de `scripts/eval/turn-schema.json` — nunca de uma segunda cópia dentro do app.
 */
export function criarAdapterGroq(config: ConfigDoGroq): AdapterDeProvedor {
  return {
    nome: `groq:${config.modelo}`,
    async gerarTurno({ systemPrompt, mensagens, schema }) {
      let resposta: Response;
      try {
        resposta = await fetch(config.endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.modelo,
            messages: [{ role: "system", content: systemPrompt }, ...mensagens],
            response_format: { type: "json_schema", json_schema: schema },
          }),
        });
      } catch (erro) {
        return { ok: false, falha: { tipo: "irrecuperavel", detalhe: String(erro) } };
      }

      if (resposta.status === 429) {
        const retryAfter = retryAfterDe(resposta.headers);
        return {
          ok: false,
          falha: {
            tipo: "rate_limit",
            // `exactOptionalPropertyTypes`: campo ausente e campo `undefined` não são a
            // mesma coisa, então o spread condicional em vez do valor explícito.
            ...(retryAfter === undefined ? {} : { retryAfterSegundos: retryAfter }),
          },
        };
      }

      const corpo = await resposta.text();

      if (!resposta.ok) {
        // O strict mode recusa a geração com 400 e `json_validate_failed` no corpo. É o
        // único 4xx que vale retry — o resto é defeito de pedido.
        if (corpo.includes("json_validate_failed")) {
          return { ok: false, falha: { tipo: "json_validate_failed", detalhe: corpo } };
        }
        return {
          ok: false,
          falha: { tipo: "irrecuperavel", detalhe: `HTTP ${resposta.status}: ${corpo}` },
        };
      }

      try {
        const json = JSON.parse(corpo) as {
          choices?: { message?: { content?: unknown } }[];
          usage?: { total_tokens?: number };
        };
        const conteudo = json.choices?.[0]?.message?.content;
        if (typeof conteudo !== "string") {
          return {
            ok: false,
            falha: { tipo: "irrecuperavel", detalhe: "resposta sem choices[0].message.content" },
          };
        }
        const total = json.usage?.total_tokens;
        return { ok: true, conteudo, ...(total === undefined ? {} : { tokensUsados: total }) };
      } catch (erro) {
        return { ok: false, falha: { tipo: "irrecuperavel", detalhe: String(erro) } };
      }
    },
  };
}

/**
 * Mensagem para o ALUNO a partir da falha.
 *
 * Rate limit por tokens vira "me dá um segundo", nunca "HTTP 429". O aluno-alvo tem como
 * maior bloqueio a vergonha de travar; erro cru no meio da conversa é desistência.
 */
export function mensagemParaOAluno(falha: FalhaDoProvedor): string {
  if (falha.tipo === "rate_limit") return "Me dá um segundo, já volto.";
  return "Tive um problema aqui, mas a gente continua.";
}

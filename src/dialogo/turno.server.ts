/**
 * A server function: FRONTEIRA DE CONFIANÇA (task 4.0 da SPEC-20260916-1652-motor-de-dialogo).
 *
 * Único ponto do código que fala com o provedor. Tudo que é segredo, cota e validação vive
 * deste lado; o cliente recebe um turno já validado, ou um turno de roteiro.
 *
 * O sufixo `.server` e o import do schema por `?raw` mantêm este módulo fora do grafo do
 * cliente. O teste de invariantes em `invariantes.test.ts` verifica isso inspecionando o
 * bundle construído — não é promessa, é checagem.
 *
 * CSRF já está coberto: `src/start.ts` instala `createCsrfMiddleware` com filtro
 * `handlerType === "serverFn"`, e o comentário lá explica que definir `src/start.ts` opta por
 * sair do padrão, então a proteção foi re-adicionada de propósito. Esta função herda isso.
 */
import { createServerFn } from "@tanstack/react-start";

import type { PedagogicalInput } from "../domain";
import { configDoAmbiente, criarAdapterGroq } from "./adapter";
import { produzirTurno, type TurnoEntregue } from "./motor";
import { criarValidador } from "./validador";

// FONTE ÚNICA do contrato: o mesmo arquivo que o strict mode do Groq consome e do qual
// `turn-contract.generated.ts` é gerado. Importado como texto para não virar dependência de
// build do cliente.
import schemaCru from "../../scripts/eval/turn-schema.json?raw";

const SCHEMA_DO_TURNO = JSON.parse(schemaCru) as {
  name: string;
  schema: Parameters<typeof criarValidador>[0]["schema"];
  strict: boolean;
};

const validador = criarValidador(SCHEMA_DO_TURNO);

/**
 * Gera um turno de conversa.
 *
 * Recebe o `PedagogicalInput` — o estado que o núcleo precisa — e devolve o turno validado.
 * Nenhuma decisão pedagógica acontece aqui: `produzirTurno` chama `decidirIntent` e
 * `revisarTurno` do núcleo, e é o núcleo que decide correções e `next_action`.
 */
export const gerarTurno = createServerFn({ method: "POST" })
  .validator((entrada: PedagogicalInput) => entrada)
  .handler(async ({ data }): Promise<TurnoEntregue> => {
    // A chave vive SÓ aqui, no ambiente do servidor. Faltando, o turno vem do roteiro em vez
    // de a conversa morrer.
    const config = configDoAmbiente(process.env);
    const adapter = config ? criarAdapterGroq(config) : undefined;

    return produzirTurno(data, {
      adapter,
      schema: SCHEMA_DO_TURNO,
      validador,
    });
  });

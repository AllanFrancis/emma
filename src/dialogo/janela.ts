/**
 * Janela de histórico como ORÇAMENTO (task 7.0 da SPEC-20260916-1652-motor-de-dialogo).
 *
 * FRONTEIRA DURA, reafirmada pelo usuário nesta rodada. O que este módulo faz é cortar por
 * orçamento de tokens. O que ele NÃO faz, e não deve passar a fazer aqui:
 *
 *  - heurística de "dado já fornecido"
 *  - deduplicação de pergunta repetida
 *  - sumarização que DECIDA o que preservar
 *
 * Isso é política de retenção de contexto, e pertence à
 * SPEC-20260916-2257-retencao-de-contexto-na-conversa. A janela aqui é orçamento; a regra de
 * o que sobrevive dentro dela é de lá.
 *
 * O corte é o mais simples que satisfaz o orçamento: mantém os turnos MAIS RECENTES e
 * descarta os mais antigos. É regra de custo, não escolha pedagógica — nada aqui julga qual
 * turno importa mais.
 */
import type { ConversationTurn } from "../domain";

/**
 * Teto de tokens do histórico enviado por turno.
 *
 * O risco está declarado no contrato: "Custo cresce com o histórico acumulado; turno 8 custa
 * mais que turno 1 — mitigação: janela de histórico com teto explícito em tokens, MEDIDA e
 * não estimada."
 *
 * Por isso o teto é configurável e o número REAL de tokens vem do provedor (`usage`), não
 * desta estimativa. A estimativa serve para decidir o corte ANTES da chamada; a medição
 * serve para saber se o teto está no lugar certo.
 */
export const TETO_DE_HISTORICO_EM_TOKENS = 1500;

/**
 * Estimativa de tokens de um texto.
 *
 * Aproximação deliberada: ~4 caracteres por token, que é a ordem de grandeza usual em
 * modelos da família GPT para texto latino. NÃO é medição — o número medido vem do campo
 * `usage` da resposta, e é ele que deve alimentar qualquer decisão sobre mover o teto.
 */
export function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / 4);
}

export interface MensagemDoHistorico {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface JanelaRecortada {
  readonly mensagens: readonly MensagemDoHistorico[];
  /** Quantos turnos couberam. */
  readonly turnosIncluidos: number;
  /** Quantos ficaram fora por orçamento. */
  readonly turnosDescartados: number;
  readonly tokensEstimados: number;
}

/**
 * Recorta o histórico para caber no orçamento, do mais recente para o mais antigo.
 *
 * Um turno entra INTEIRO ou não entra: meia troca (fala do aluno sem a resposta da Emma)
 * confundiria o modelo mais do que ajudaria.
 */
export function recortarJanela(
  turnos: readonly ConversationTurn[],
  tetoEmTokens: number = TETO_DE_HISTORICO_EM_TOKENS,
): JanelaRecortada {
  const selecionados: ConversationTurn[] = [];
  let tokens = 0;

  for (let i = turnos.length - 1; i >= 0; i -= 1) {
    const turno = turnos[i]!;
    const custo = estimarTokens(turno.learnerUtterance) + estimarTokens(turno.emmaReplyEn);
    if (tokens + custo > tetoEmTokens) break;
    tokens += custo;
    selecionados.unshift(turno);
  }

  const mensagens: MensagemDoHistorico[] = [];
  for (const t of selecionados) {
    mensagens.push({ role: "user", content: t.learnerUtterance });
    mensagens.push({ role: "assistant", content: t.emmaReplyEn });
  }

  return {
    mensagens,
    turnosIncluidos: selecionados.length,
    turnosDescartados: turnos.length - selecionados.length,
    tokensEstimados: tokens,
  };
}

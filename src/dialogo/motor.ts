/**
 * O motor de diálogo (tasks 4.0 e 5.0 da SPEC-20260916-1652-motor-de-dialogo).
 *
 * ORQUESTRA, não decide. O pipeline é:
 *
 *   decidirIntent (núcleo) → construirPrompt → adapter → parse → valida schema →
 *   valida evidência → revisarTurno (núcleo) → turno final
 *
 * As duas pontas pedagógicas são do NÚCLEO e não são reimplementadas aqui: `decidirIntent`
 * diz o que ensinar agora, `revisarTurno` diz quais correções sobrevivem e qual é o
 * `next_action` final. Se o motor precisasse escolher qualquer uma dessas coisas, o Intent
 * estaria incompleto e o defeito seria do núcleo, não daqui.
 *
 * O adapter é INJETADO. Isso é o que torna todo este arquivo testável sem rede e sem chave —
 * inclusive o caminho de falha, que é justamente o que precisa de prova.
 */
import {
  decidirIntent,
  revisarTurno,
  type Correction,
  type NextAction,
  type PedagogicalInput,
  type TurnOutput,
} from "../domain";
import { mensagemParaOAluno, type AdapterDeProvedor, type FalhaDoProvedor } from "./adapter";
import { recortarJanela, TETO_DE_HISTORICO_EM_TOKENS } from "./janela";
import { construirPrompt, PROMPT_VERSION } from "./prompt";

/** Teto de tentativas antes de cair no roteiro. Espelha MAX_TENTATIVAS do harness de eval. */
export const MAX_TENTATIVAS = 6;

export type OrigemDoTurno = "modelo" | "roteiro";

export interface TurnoEntregue {
  readonly turno: TurnOutput;
  readonly origem: OrigemDoTurno;
  /** Correções que o núcleo ACEITOU, já resolvidas. */
  readonly corrections: readonly Correction[];
  readonly nextAction: NextAction;
  /** Mensagem para o aluno quando o provedor falhou. `undefined` no caminho felizes. */
  readonly avisoParaOAluno?: string;
  readonly diagnostico: {
    readonly tentativas: number;
    readonly falhas: readonly FalhaDoProvedor["tipo"][];
    readonly promptVersion: string;
    readonly turnosNoHistorico: number;
    readonly turnosDescartadosPorOrcamento: number;
    readonly tokensEstimadosDeHistorico: number;
    /** Medido, quando o provedor informa. É este número que decide mover o teto. */
    readonly tokensMedidos?: number;
    readonly latenciaMs: number;
  };
}

/** Validação do turno contra o schema e contra a evidência citada, no SERVIDOR. */
export interface ValidadorDeTurno {
  /** Devolve lista de problemas. Vazia = válido. */
  validarSchema(turno: unknown): readonly string[];
  /** Confere que cada `original` ocorre LITERALMENTE na fala do aluno. */
  validarEvidencia(turno: unknown, falaDoAluno: string): readonly string[];
}

export interface DependenciasDoMotor {
  readonly adapter: AdapterDeProvedor | undefined;
  readonly schema: unknown;
  readonly validador: ValidadorDeTurno;
  readonly tetoDeHistorico?: number;
  readonly maxTentativas?: number;
  readonly agora?: () => number;
}

/**
 * Turno de roteiro: o fallback da DEC-20260916-0311.
 *
 * Vem do `openingEn` da etapa ATUAL da missão, então entra no ponto certo do percurso em vez
 * de recomeçar a conversa. Turno não morre na tela.
 */
function turnoDeRoteiro(entrada: PedagogicalInput): TurnOutput {
  const intent = decidirIntent(entrada);
  const etapa = intent.missionStep;
  return {
    reply_en: etapa.openingEn,
    reply_pt: "",
    instruction_pt: `Vamos seguir: ${etapa.goalPt}.`,
    corrections: [],
    suggestion_en: "",
    suggestion_pt: "",
    words: [...etapa.expectedWords].slice(0, 3),
    focus: etapa.focusPt,
    // Roteiro NÃO corrige, então não há aplicação a pedir. A decisão final continua sendo do
    // núcleo, via revisarTurno, logo abaixo.
    next_action: "reply",
  };
}

/**
 * Produz o turno que chega ao aluno.
 *
 * Nunca lança e nunca devolve turno vazio: esgotadas as tentativas, cai no roteiro. A
 * invariante do contrato é literal — "SEMPRE um turno chega ao aluno".
 */
export async function produzirTurno(
  entrada: PedagogicalInput,
  deps: DependenciasDoMotor,
): Promise<TurnoEntregue> {
  const agora = deps.agora ?? (() => Date.now());
  const comecou = agora();
  const maxTentativas = deps.maxTentativas ?? MAX_TENTATIVAS;
  const teto = deps.tetoDeHistorico ?? TETO_DE_HISTORICO_EM_TOKENS;

  const intent = decidirIntent(entrada);
  const systemPrompt = construirPrompt(intent);
  const janela = recortarJanela(entrada.recentTurns, teto);

  const mensagens = [
    ...janela.mensagens,
    { role: "user" as const, content: entrada.learnerUtterance },
  ];

  const falhas: FalhaDoProvedor["tipo"][] = [];
  let tentativas = 0;
  let tokensMedidos: number | undefined;

  const entregar = (
    turno: TurnOutput,
    origem: OrigemDoTurno,
    avisoParaOAluno?: string,
  ): TurnoEntregue => {
    // A palavra final sobre correções e next_action é do NÚCLEO, sempre — inclusive no
    // roteiro. O motor não escolhe nem no caminho de falha.
    const revisado = revisarTurno(entrada, {
      corrections: turno.corrections,
      nextAction: turno.next_action,
    });
    return {
      turno: { ...turno, corrections: [...revisado.corrections], next_action: revisado.nextAction },
      origem,
      corrections: revisado.corrections,
      nextAction: revisado.nextAction,
      ...(avisoParaOAluno === undefined ? {} : { avisoParaOAluno }),
      diagnostico: {
        tentativas,
        falhas: [...falhas],
        promptVersion: PROMPT_VERSION,
        turnosNoHistorico: janela.turnosIncluidos,
        turnosDescartadosPorOrcamento: janela.turnosDescartados,
        tokensEstimadosDeHistorico: janela.tokensEstimados,
        ...(tokensMedidos === undefined ? {} : { tokensMedidos }),
        latenciaMs: agora() - comecou,
      },
    };
  };

  if (!deps.adapter) {
    falhas.push("sem_credencial");
    return entregar(
      turnoDeRoteiro(entrada),
      "roteiro",
      mensagemParaOAluno({ tipo: "sem_credencial" }),
    );
  }

  let ultimaFalha: FalhaDoProvedor | undefined;

  while (tentativas < maxTentativas) {
    tentativas += 1;
    const resultado = await deps.adapter.gerarTurno({
      systemPrompt,
      mensagens,
      schema: deps.schema,
    });

    if (!resultado.ok) {
      falhas.push(resultado.falha.tipo);
      ultimaFalha = resultado.falha;
      // Só `json_validate_failed` merece nova tentativa: é falha de GERAÇÃO, e a evidência
      // da SPEC-20260916-1652 mostra que ela é recuperável. Rate limit e irrecuperável não
      // melhoram com insistência dentro do mesmo turno.
      if (resultado.falha.tipo === "json_validate_failed") continue;
      break;
    }

    if (resultado.tokensUsados !== undefined) tokensMedidos = resultado.tokensUsados;

    let candidato: unknown;
    try {
      // Parse de JSON sobre resposta de strict mode. NUNCA fatiamento de texto nem regex —
      // era assim que o protótipo montava o turno, e é o que o contrato proíbe.
      candidato = JSON.parse(resultado.conteudo);
    } catch (erro) {
      falhas.push("json_validate_failed");
      ultimaFalha = { tipo: "json_validate_failed", detalhe: String(erro) };
      continue;
    }

    const problemasDeSchema = deps.validador.validarSchema(candidato);
    if (problemasDeSchema.length > 0) {
      falhas.push("json_validate_failed");
      ultimaFalha = { tipo: "json_validate_failed", detalhe: problemasDeSchema.join("; ") };
      continue;
    }

    const problemasDeEvidencia = deps.validador.validarEvidencia(
      candidato,
      entrada.learnerUtterance,
    );
    if (problemasDeEvidencia.length > 0) {
      falhas.push("json_validate_failed");
      ultimaFalha = { tipo: "json_validate_failed", detalhe: problemasDeEvidencia.join("; ") };
      continue;
    }

    return entregar(candidato as TurnOutput, "modelo");
  }

  return entregar(
    turnoDeRoteiro(entrada),
    "roteiro",
    ultimaFalha ? mensagemParaOAluno(ultimaFalha) : undefined,
  );
}

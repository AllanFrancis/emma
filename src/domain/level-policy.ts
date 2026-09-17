/**
 * Política de nível (SPEC-20260916-1652-nucleo-pedagogico).
 *
 * Implementa a `scripts/eval/rubric.md` na letra, mais as DEC-20260916-0313 (mediana +
 * teto), 0314 (evidência obrigatória) e 0315 (histerese assimétrica).
 *
 * Por que mediana e não média: média premia quem é forte em vocabulário e mudo em
 * conversa, que é exatamente o perfil que o produto existe para consertar.
 */
import type {
  Confidence,
  CriterionScore,
  LearnerProfile,
  Level,
  LevelAssessment,
  RubricCriterion,
} from "./types";

const NIVEL_MINIMO = 1;
const NIVEL_MAXIMO = 5;

/**
 * O teto é dado, não `if`: "se `sustentação de conversa` for 2 ou mais níveis abaixo da
 * mediana, o nível final cai 1" (rubric.md, "Como fechar o nível", passo 3).
 */
const TETO_POR_SUSTENTACAO = {
  distanciaMinima: 2,
  degradacao: 1,
} as const;

/** Confiança por quantidade de critérios pontuados (rubric.md, passo 4). */
const CONFIANCA_POR_CRITERIOS: readonly { minimo: number; confianca: Confidence }[] = [
  { minimo: 4, confianca: "alta" },
  { minimo: 3, confianca: "media" },
  { minimo: 0, confianca: "baixa" },
];

/** Histerese assimétrica (DEC-20260916-0315 e rubric.md, "Como o nível evolui"). */
export const HISTERESE = {
  /** Um turno bom não promove. */
  paraPromover: 2,
  /**
   * Assimetria proposital: dia ruim, cansaço e assunto difícil não podem rebaixar o
   * aluno — isso destrói a confiança, que é o ativo mais frágil deste produto.
   */
  paraRebaixar: 3,
  /** O nível muda no máximo 1 degrau por vez, em qualquer direção. */
  degrauMaximo: 1,
} as const;

function limitar(nivel: number): Level {
  return Math.min(NIVEL_MAXIMO, Math.max(NIVEL_MINIMO, Math.round(nivel))) as Level;
}

/** Só é chamada com lista não vazia; o `?? 0` existe para o compilador, não para a regra. */
function mediana(valores: readonly number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const central = ordenados[meio] ?? 0;
  if (ordenados.length % 2 === 1) return central;
  // Par de critérios pontuados: a média dos dois centrais, arredondada por `limitar`.
  const anterior = ordenados[meio - 1] ?? central;
  return (anterior + central) / 2;
}

/**
 * Uma nota só conta se carrega evidência. Nota sem citação é chute, e a DEC-20260916-0314
 * diz que chute é saída inválida — então ela é DESCARTADA como se fosse `null`, em vez de
 * contaminar a mediana.
 */
export function pontuacaoValida(score: CriterionScore | undefined): boolean {
  if (!score) return false;
  if (score.nota === null) return false;
  return typeof score.evidencia === "string" && score.evidencia.trim() !== "";
}

export function confiancaDe(criteriosPontuados: number): Confidence {
  for (const faixa of CONFIANCA_POR_CRITERIOS) {
    if (criteriosPontuados >= faixa.minimo) return faixa.confianca;
  }
  return "baixa";
}

export interface NivelFechado {
  readonly nivel: Level | null;
  readonly confianca: Confidence;
  readonly medianaBruta: Level | null;
  readonly tetoAplicado: boolean;
}

/**
 * Fecha o nível de UMA avaliação: descarta nulos e notas sem evidência, tira a mediana e
 * aplica o teto por sustentação de conversa.
 */
export function fecharNivel(
  criterios: Readonly<Record<RubricCriterion, CriterionScore>>,
): NivelFechado {
  const pontuados = (Object.keys(criterios) as RubricCriterion[]).filter((chave) =>
    pontuacaoValida(criterios[chave]),
  );
  const confianca = confiancaDe(pontuados.length);

  if (pontuados.length === 0) {
    // Sem amostra não há nível. Quem resolve isso é `nivelVigente`, caindo na
    // autoavaliação — nunca uma estimativa inventada aqui.
    return { nivel: null, confianca, medianaBruta: null, tetoAplicado: false };
  }

  const notas = pontuados.map((chave) => criterios[chave].nota as number);
  const medianaBruta = limitar(mediana(notas));

  const sustentacao = criterios.sustentacao;
  const sustentacaoConta = pontuacaoValida(sustentacao);
  const distancia = sustentacaoConta ? medianaBruta - (sustentacao.nota ?? 0) : 0;
  const tetoAplicado = sustentacaoConta && distancia >= TETO_POR_SUSTENTACAO.distanciaMinima;

  const nivel = tetoAplicado
    ? limitar(medianaBruta - TETO_POR_SUSTENTACAO.degradacao)
    : medianaBruta;
  return { nivel, confianca, medianaBruta, tetoAplicado };
}

/**
 * O nível VIGENTE, aplicando histerese sobre o histórico de avaliações.
 *
 * A regra não é "a última avaliação manda": subir exige 2 avaliações consecutivas
 * apontando mais alto, descer exige 3. E a mudança é de no máximo 1 degrau por vez.
 *
 * Com confiança `baixa` a rubrica manda usar o nível autoavaliado e reavaliar no turno
 * seguinte — então uma avaliação de confiança baixa NÃO participa da contagem de
 * consecutivas. Contá-la seria deixar amostra insuficiente mover o nível.
 */
export function nivelVigente(
  profile: LearnerProfile,
  assessments: readonly LevelAssessment[],
): { readonly nivel: Level; readonly confianca: Confidence } {
  const confiaveis = assessments.filter(
    (a): a is LevelAssessment & { readonly nivelFinal: Level } =>
      a.nivelFinal !== null && a.confianca !== "baixa",
  );

  const primeira = confiaveis[0];
  const ultima = confiaveis[confiaveis.length - 1];
  if (!primeira || !ultima) {
    return { nivel: profile.selfAssessedLevel, confianca: "baixa" };
  }

  // A base é a primeira avaliação confiável; daí em diante a histerese caminha.
  let vigente: Level = primeira.nivelFinal;
  let consecutivasAcima = 0;
  let consecutivasAbaixo = 0;

  for (const avaliacao of confiaveis.slice(1)) {
    const proposto: Level = avaliacao.nivelFinal;
    if (proposto > vigente) {
      consecutivasAcima += 1;
      consecutivasAbaixo = 0;
      if (consecutivasAcima >= HISTERESE.paraPromover) {
        vigente = limitar(vigente + HISTERESE.degrauMaximo);
        consecutivasAcima = 0;
      }
    } else if (proposto < vigente) {
      consecutivasAbaixo += 1;
      consecutivasAcima = 0;
      if (consecutivasAbaixo >= HISTERESE.paraRebaixar) {
        vigente = limitar(vigente - HISTERESE.degrauMaximo);
        consecutivasAbaixo = 0;
      }
    } else {
      // Confirmar o nível vigente zera as duas contagens: a sequência foi interrompida.
      consecutivasAcima = 0;
      consecutivasAbaixo = 0;
    }
  }

  return { nivel: vigente, confianca: ultima.confianca };
}

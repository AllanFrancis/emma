// GERADO por scripts/gen-turn-types.mjs a partir de scripts/eval/turn-schema.json.
// NAO EDITAR A MAO: edite o schema e rode `bun run gen:turn-types`.
// O schema e a fonte porque e ele que o strict mode do Groq consome.
// Contrato: emma_turn (strict)
/**
 * Tipo da correcao. Permite priorizar o que quebra a comunicacao sobre o que e so questao de
 * registro.
 */
export type Category = "grammar" | "vocabulary" | "word_order" | "preposition" | "false_friend" | "register";

export interface Correction {
  /**
   * Trecho LITERAL da fala do aluno que esta sendo corrigido. Copie as palavras exatas, sem
   * parafrasear e sem reescrever. E a evidencia da correcao: sem ela a correcao e invalida.
   */
  readonly original: string;
  /**
   * A forma natural em ingles que substitui o trecho acima.
   */
  readonly suggested: string;
  /**
   * Explicacao curta em portugues, uma frase, dizendo por que a forma sugerida e melhor.
   */
  readonly explanation_pt: string;
  /**
   * Tipo da correcao. Permite priorizar o que quebra a comunicacao sobre o que e so questao de
   * registro.
   */
  readonly category: Category;
}

/**
 * O que deveria acontecer em seguida. 'reply': o aluno responde a sua pergunta. 'retry': o
 * aluno repete a propria fala com a correcao aplicada. 'continue_mission': a etapa atual
 * fechou e a missao segue. 'complete_mission': o objetivo da missao foi cumprido. Voce PROPOE;
 * quem decide e o motor pedagogico.
 */
export type NextAction = "reply" | "retry" | "continue_mission" | "complete_mission";

export interface TurnOutput {
  /**
   * A fala da Emma em ingles: 1 a 3 frases, terminando obrigatoriamente com uma pergunta.
   * Responde primeiro ao SIGNIFICADO do que o aluno disse.
   */
  readonly reply_en: string;
  /**
   * Traducao curta em portugues da fala acima. Serve de apoio sob demanda, nao substitui o
   * ingles.
   */
  readonly reply_pt: string;
  /**
   * Uma frase em portugues dizendo ao aluno exatamente o que fazer agora. Nunca vazia.
   */
  readonly instruction_pt: string;
  /**
   * No maximo 3 correcoes de alto valor, e so quando melhorarem a comunicacao. Array vazio
   * quando nao ha o que corrigir — o caso mais comum.
   */
  readonly corrections: readonly Correction[];
  /**
   * Resposta modelo curta em ingles que o aluno poderia dizer agora, no nivel dele.
   */
  readonly suggestion_en: string;
  /**
   * Traducao em portugues da sugestao acima.
   */
  readonly suggestion_pt: string;
  /**
   * Ate 3 expressoes em ingles praticadas neste turno. Array vazio se nao houver.
   */
  readonly words: readonly string[];
  /**
   * Um ponto de melhoria curto em portugues, que alimenta os pontos recentes do aluno. String
   * vazia se nao houver.
   */
  readonly focus: string;
  /**
   * O que deveria acontecer em seguida. 'reply': o aluno responde a sua pergunta. 'retry': o
   * aluno repete a propria fala com a correcao aplicada. 'continue_mission': a etapa atual
   * fechou e a missao segue. 'complete_mission': o objetivo da missao foi cumprido. Voce PROPOE;
   * quem decide e o motor pedagogico.
   */
  readonly next_action: NextAction;
}

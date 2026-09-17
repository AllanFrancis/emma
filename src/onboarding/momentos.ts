/**
 * Telas do percurso que NÃO são pergunta (SPEC-20260916-1652-onboarding-e-perfil).
 *
 * `entrada` é o contrato de expectativa e `promessa` é a proposta de valor. Texto é CÓPIA
 * LITERAL do protótipo, pela mesma razão do catálogo de perguntas: fidelidade de conteúdo é
 * obrigatória, forma é livre.
 *
 * Dado, não componente — para o diff mostrar qualquer desvio de texto.
 */
export interface Momento {
  readonly kicker: string;
  readonly title: string;
  readonly body: string;
  readonly cta: string;
}

export const MOMENTOS = {
  entrada: {
    kicker: "PT-BR / EN",
    title: "Aprenda inglês conversando três minutos por dia comigo.",
    body: "Eu sou a Emma, uma parceira de conversa feita de software. Falo com você em inglês e explico em português.",
    cta: "Continuar",
  },
  promessa: {
    kicker: "Como funciona",
    title: "Uma tutora de IA à sua disposição, a qualquer hora.",
    body: "Conversas curtas todos os dias. Eu falo em inglês e explico em português quando isso ajudar.",
    cta: "Continuar",
  },
} as const satisfies Record<string, Momento>;

/**
 * Nota que acompanha a pergunta de nível.
 *
 * Existe por invariante do contrato: "SEMPRE o nível autoavaliado é ponto de partida
 * declarado, nunca classificação definitiva — nenhuma tela pode sugerir o contrário."
 */
export const NOTA_DE_NIVEL = "É só um ponto de partida. Eu ajusto conforme a gente conversa.";

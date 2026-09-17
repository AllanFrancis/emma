/**
 * Catálogo de missões como DADO DE PRODUTO (task 3.0 da SPEC-20260916-1652-motor-de-dialogo).
 *
 * As etapas roteirizadas são o fallback da DEC-20260916-0311: quando o modelo falha o
 * contrato depois do retry, o turno vem daqui. Isso existia no protótipo v1 como
 * `MISSIONS[].script[]` e na v2 virou shim de preview; o contrato desta SPEC manda trazer de
 * volta ao domínio.
 *
 * É CÓPIA do protótipo, não escrita nova — `openingEn` de cada etapa é a fala que o roteiro
 * usa. O tipo `Mission`/`MissionStep` vem do núcleo pedagógico e não é redefinido aqui.
 *
 * Por que o fallback é roteiro e não mensagem de erro: o aluno-alvo tem como maior bloqueio
 * declarado a vergonha de errar ou travar. Um erro técnico no meio da primeira conversa em
 * inglês não é inconveniência, é desistência.
 */
import type { Mission } from "../domain";

export const MISSOES: readonly Mission[] = [
  {
    id: "cafe",
    goalPt: "Pedir um café",
    scenarioPt: "Você está no balcão de um café em Londres.",
    targetLevel: 2,
    steps: [
      {
        index: 0,
        goalPt: "dizer o que você quer pedir",
        openingEn: "Hi there! What can I get for you today?",
        expectedWords: ["I'd like"],
        focusPt: "usar I'd like em pedidos",
      },
      {
        index: 1,
        goalPt: "escolher o tamanho",
        openingEn: "Nice choice! Small, medium or large?",
        expectedWords: ["small", "medium", "large"],
        focusPt: "usar I'd like em pedidos",
      },
      {
        index: 2,
        goalPt: "dizer se quer mais alguma coisa",
        openingEn: "Got it. Anything else with that? A pastry, maybe?",
        expectedWords: ["anything else", "that's all"],
        focusPt: "",
      },
      {
        index: 3,
        goalPt: "dizer como vai pagar",
        openingEn: "Perfect. That'll be four pounds fifty. Card or cash?",
        expectedWords: ["card", "cash"],
        focusPt: "preposições com meios de pagamento",
      },
    ],
  },
  {
    id: "hotel",
    goalPt: "Check-in no hotel",
    scenarioPt: "Você chegou atrasado ao hotel.",
    targetLevel: 2,
    steps: [
      {
        index: 0,
        goalPt: "dizer que tem uma reserva e em que nome",
        openingEn: "Good evening. Do you have a reservation with us?",
        expectedWords: ["reservation"],
        focusPt: "",
      },
      {
        index: 1,
        goalPt: "soletrar o sobrenome",
        openingEn: "Let me check. Could you spell your last name for me?",
        expectedWords: ["spell", "last name"],
        focusPt: "",
      },
      {
        index: 2,
        goalPt: "confirmar as noites e quantos hóspedes",
        openingEn: "Found it. Two nights, is that right? And how many guests?",
        expectedWords: ["two nights", "guests"],
        focusPt: "nights x days",
      },
      {
        index: 3,
        goalPt: "perguntar algo útil, como o horário do café",
        openingEn: "Great. Here's your key card — room 402, fourth floor. Anything else you need?",
        expectedWords: ["key card", "fourth floor"],
        focusPt: "",
      },
    ],
  },
  {
    id: "talk",
    goalPt: "Puxar conversa",
    scenarioPt: "Conversa informal com um colega novo.",
    targetLevel: 3,
    steps: [
      {
        index: 0,
        goalPt: "contar como foi o fim de semana e devolver a pergunta",
        openingEn: "Hey! I don't think we've met — how was your weekend?",
        expectedWords: ["weekend"],
        focusPt: "",
      },
      {
        index: 1,
        goalPt: "contar uma coisa que você fez, no passado",
        openingEn: "Mine was pretty quiet. Did you do anything fun?",
        expectedWords: ["went", "pretty quiet"],
        focusPt: "passado simples",
      },
      {
        index: 2,
        goalPt: "dizer o que assistiu e o que achou",
        openingEn: "Oh nice — what did you watch?",
        expectedWords: ["what did you watch"],
        focusPt: "",
      },
      {
        index: 3,
        goalPt: "aceitar o convite e sugerir um dia",
        openingEn: "Sounds fun. We should grab coffee sometime — are you around this week?",
        expectedWords: ["grab coffee", "are you around"],
        focusPt: "",
      },
    ],
  },
];

/** A missão de `id`, ou `undefined`. */
export function missaoPorId(id: string): Mission | undefined {
  return MISSOES.find((m) => m.id === id);
}

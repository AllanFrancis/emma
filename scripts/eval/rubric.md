# Rubrica de nível — Emma

> SPEC-20260916-0109 · Fase 1
> Substitui a heurística `hasPolite()` do protótipo, que media polidez, não proficiência.

## Para que serve

Estimar o nível de proficiência do aluno **com critérios auditáveis e evidência citada**, em dois
momentos:

1. **Diagnóstico inicial** — a primeira fala livre do aluno, logo após o onboarding.
2. **Reavaliação contínua** — ao longo do uso, porque o nível autoavaliado é ponto de partida
   declarado, nunca classificação definitiva.

A rubrica é aplicada por um modelo de linguagem, mas o modelo **não decide sozinho**: ele preenche
a rubrica e cita a evidência. Uma classificação sem evidência é inválida por definição — não é uma
classificação fraca, é uma saída rejeitada.

## Os cinco níveis

Alinhados às 5 opções de autoavaliação do onboarding (`QUESTIONS.nivel`).

| Nível | Autoavaliação correspondente | Faixa exibida ao aluno (`LADDER`) |
|---|---|---|
| **N1** | "Não sei nada de inglês" | Começando agora |
| **N2** | "Conheço algumas palavras comuns" | Básico |
| **N3** | "Consigo ter conversas simples" | Intermediário |
| **N4** | "Consigo falar de assuntos variados" | Conversa solta |
| **N5** | "Falo sobre a maioria dos assuntos em detalhes" | Conversa solta |

> **N4 e N5 compartilham a faixa exibida de propósito.** O protótipo calcula
> `LADDER[min(3, max(0, levelNum() - 1))]`, o que colapsa os dois níveis mais altos na mesma
> etiqueta. Isso é comportamento normativo, não bug: internamente a Emma distingue N4 de N5 para
> calibrar a conversa, mas não expõe essa diferença ao aluno.

## Os cinco critérios

Cada critério é avaliado de 1 a 5 **independentemente**. O nível final não é a média — ver
"Como fechar o nível".

### 1. Vocabulário
| | Descritor observável |
|---|---|
| 1 | Palavras isoladas e cognatos. Recorre ao português no meio da frase. |
| 2 | Vocabulário de sobrevivência: saudações, números, comida, objetos do dia a dia. |
| 3 | Cobre temas cotidianos concretos (trabalho, rotina, viagem) com repetição e rodeios. |
| 4 | Vocabulário variado; encontra sinônimos quando falta a palavra exata. |
| 5 | Vocabulário preciso, incluindo expressões idiomáticas e registro adequado ao contexto. |

### 2. Gramática
| | Descritor observável |
|---|---|
| 1 | Sem estrutura verbal reconhecível. Justaposição de palavras. |
| 2 | Presente simples com erros frequentes de concordância e auxiliares (`he don't`, `people is`). |
| 3 | Presente e passado com razoável controle; erros em tempos compostos e preposições. |
| 4 | Domina os tempos comuns; erros esporádicos em estruturas complexas (condicionais, reported speech). |
| 5 | Erros raros e não sistemáticos, do tipo que falante nativo também comete. |

### 3. Construção de frases
| | Descritor observável |
|---|---|
| 1 | Não forma frase completa. |
| 2 | Frases curtas de padrão fixo (`I am…`, `I like…`), sem conectivos. |
| 3 | Frases completas com conectivos simples (`and`, `but`, `because`). |
| 4 | Encadeia orações; usa subordinação e ordena ideias dentro de um parágrafo falado. |
| 5 | Estrutura o discurso: introduz, desenvolve, exemplifica e conclui. |

### 4. Compreensão
| | Descritor observável |
|---|---|
| 1 | Não responde ao que foi perguntado; responde outra coisa ou em português. |
| 2 | Entende perguntas diretas e previsíveis se ditas devagar. |
| 3 | Acompanha a conversa sobre temas familiares; pede repetição às vezes. |
| 4 | Entende fala em ritmo normal, inclusive perguntas indiretas. |
| 5 | Capta nuance, ironia e implícito; não precisa de simplificação. |

### 5. Sustentação de conversa
| | Descritor observável |
|---|---|
| 1 | Não sustenta turno. A conversa para sem intervenção. |
| 2 | Responde, mas não devolve — cada turno precisa ser puxado pela Emma. |
| 3 | Mantém a conversa por alguns turnos; trava quando o assunto sai do roteiro. |
| 4 | Toma iniciativa: faz perguntas, muda de assunto, retoma um ponto anterior. |
| 5 | Conduz a conversa com naturalidade, incluindo discordar e negociar sentido. |

## Evidência é obrigatória

Cada critério pontuado carrega **uma citação literal da fala do aluno** que justifica a nota.

- A citação é **verbatim**. Parafrasear a fala do aluno invalida a evidência.
- Se não houver fala suficiente para pontuar um critério, o valor é `null` com
  `"evidencia": "amostra insuficiente"` — **nunca** um chute.
- Regra herdada do contrato da Emma: *nunca invente uma nota precisa sem evidência suficiente.*

## Como fechar o nível

O nível final **não é a média aritmética** dos cinco critérios — média premia quem é forte em
vocabulário e mudo em conversa, que é exatamente o perfil que este produto existe para consertar.

1. Descarte critérios com `null`.
2. O nível final é a **mediana** dos critérios pontuados.
3. **Teto de produção:** se `sustentação de conversa` for 2 ou mais níveis abaixo da mediana, o
   nível final cai 1. Quem não produz linguagem não está no nível que o vocabulário sugere.
4. Confiança: `alta` (≥4 critérios pontuados), `média` (3), `baixa` (≤2). Com confiança `baixa`,
   a Emma usa o nível autoavaliado e reavalia no turno seguinte.

## Como o nível evolui

O diagnóstico inicial é um ponto de partida, não uma sentença.

- Reavaliação sobre uma **janela deslizante das últimas 10 falas** do aluno, não sobre a última.
- O nível muda **no máximo 1 degrau por vez**, para cima ou para baixo.
- Subir exige **2 reavaliações consecutivas** apontando o nível mais alto. Um turno bom não
  promove.
- Descer exige **3 consecutivas**. Assimetria proposital: dia ruim, cansaço e assunto difícil não
  podem rebaixar o aluno — isso destrói a confiança, que é o ativo mais frágil deste produto.
- Toda mudança de nível é registrada com as evidências que a motivaram.

## Contrato de saída da avaliação

```json
{
  "nivel_final": 3,
  "confianca": "alta",
  "criterios": {
    "vocabulario":  { "nota": 3, "evidencia": "I work in a office with many people" },
    "gramatica":    { "nota": 2, "evidencia": "yesterday I go to the market" },
    "construcao":   { "nota": 3, "evidencia": "I like it because is close to my house" },
    "compreensao":  { "nota": 4, "evidencia": "resposta pertinente a pergunta indireta sobre rotina" },
    "sustentacao":  { "nota": null, "evidencia": "amostra insuficiente" }
  },
  "justificativa_pt": "Uma frase explicando o nivel final e o que puxou para baixo ou para cima."
}
```

## Como validar esta rubrica

Ela só serve se for **reprodutível**: duas pessoas diferentes, sem contexto uma da outra, aplicando
a rubrica à mesma fala, chegam ao mesmo nível (±0) na maioria dos casos. Isso é verificado contra o
`dataset.jsonl`, onde cada fala tem um nível esperado — que é uma aplicação desta rubrica, não um
palpite.

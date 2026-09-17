# Tabela de coerência — `corrections` × `next_action`

**Status:** rascunho aguardando revisão humana
**Fundamento empírico:** `evidence/levantamento-taxa.md` — 117 turnos mensuráveis
**Critério que isto atende:** 1 — "Tabela de coerência escrita e revisada, com justificativa por combinação"

O risco registrado no `main.md` manda revisar esta tabela por humano ANTES de ela virar checagem, porque "a regra pode ter exceção legítima: numa etapa final de missão talvez faça sentido corrigir e seguir". As duas linhas marcadas ⚠ são exatamente esse ponto.

## Base normativa

Duas fontes decidem, e elas não se contradizem:

- **Invariante desta SPEC:** "SEMPRE que houver correção emitida, o turno deve convidar o aluno a aplicá-la; correção sem aplicação é informação, não ensino."
- **Métrica central (§20):** "o aluno produziu linguagem e tentou novamente após receber feedback." O que conta é a tentativa APÓS o feedback.

Do enum de `next_action`, só `retry` significa "o aluno repete a própria fala com a correção aplicada". Os outros três movem a conversa adiante.

## A tabela

### `corrections` vazio (53 turnos medidos)

| `next_action` | Coerente | n medido | Por quê |
|---|---|---|---|
| `reply` | ✅ sim | 52 | Caso canônico. Não houve o que corrigir, o aluno responde à pergunta. É o modo mais comum do produto e deve ser. |
| `retry` | ❌ não | 0 | Cobra repetição de quem não errou. Já garantido por **C12**, que continua valendo sem alteração. |
| `continue_mission` | ✅ sim | 0 | A etapa fechou e não havia o que corrigir. Nada a aplicar, nada a pedir. |
| `complete_mission` | ✅ sim | 1 | Missão cumprida sem erro pendente. É o desfecho limpo. |

### `corrections` não vazio (64 turnos medidos)

| `next_action` | Coerente | n medido | Por quê |
|---|---|---|---|
| `retry` | ✅ sim | 23 | Caso canônico coerente. A correção foi emitida E o aluno é convidado a aplicá-la. É o único valor do enum que satisfaz a métrica central de forma direta. |
| `reply` | ❌ não | **41** | **A lacuna.** É o caso `hotel-10`. A correção chega ao aluno e a conversa segue sem que ele a use; o feedback vira informação. 64,1% das correções do produto hoje caem aqui. |
| `continue_mission` | ⚠ não — sem base empírica | 0 | A etapa fechou, então pedir repetição contradiz o fechamento. Mas a correção também não é aplicada em nenhum momento. Classificado incoerente por DERIVAÇÃO do invariante, não por medida: zero ocorrências em 117 turnos. **Ponto de revisão.** |
| `complete_mission` | ⚠ não — sem base empírica | 0 | Pior caso na leitura estrita: a missão terminou, então não existe turno futuro onde aplicar. O `main.md` já chamava esta combinação de "suspeita". Também zero ocorrências. **Ponto de revisão.** |

## Os dois pontos de revisão, com a tensão explícita

**`continue_mission` + correção.** Argumento para incoerente: o invariante é absoluto, e uma correção que a conversa nunca cobra é informação. Argumento para coerente: a etapa seguinte pode ser onde o aluno naturalmente reusa a forma corrigida, e forçar `retry` no fechamento de etapa pode travar o ritmo da missão. O turno, isolado, não consegue provar que a aplicação aconteceu depois — e uma checagem de turno único não vê a etapa seguinte. Quem veria isso é uma checagem longitudinal, que é território da SPEC-20260916-2257-retencao-de-contexto-na-conversa e está fora desta rodada.

**`complete_mission` + correção.** Argumento para incoerente: não há futuro na missão para aplicar. Argumento para coerente: o fecho de lição (SPEC-20260916-1652-fecho-de-licao, bloqueada) é o lugar desenhado para "expressões praticadas" e pontos de melhoria — uma correção emitida no último turno poderia legitimamente ser endereçada lá, e não no turno. Além disso, há uma leitura de produto a considerar: o aluno-alvo tem como maior bloqueio declarado a vergonha de errar, e encerrar a missão com uma correção que ele não pode aplicar é uma crítica de despedida.

Nas duas linhas a classificação proposta é **incoerente**, porque é o que o invariante contratado diz e porque errar para o lado estrito faz a checagem ACUSAR casos que hoje não existem — custo zero no presente e alarme se o comportamento aparecer. A alternativa (classificar como coerente) silenciaria a checagem para sempre nesses dois valores.

## Consequência para a decisão do critério 4

A taxa de 64,1% é alta, e o contrato já disse o que fazer com número alto: a correção é do núcleo, sobrescrevendo a proposta do modelo, não instrução de prompt. O achado do `hotel-10` reforça — a combinação já esteve correta (`retry` no contrato-do-turno-v2) e o prompt v5 a regrediu para `reply`. Instrução de prompt é justamente o que falhou, e falhou sem ninguém notar porque nada media.

Isso é consistente com DEC-20260916-1612: o modelo propõe `next_action`, quem decide é o núcleo pedagógico. A decisão formal fica para o critério 4, com `| evidence: manual @allan`.

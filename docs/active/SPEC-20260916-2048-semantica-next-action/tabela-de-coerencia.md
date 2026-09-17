# Tabela de coerência — `corrections` × `next_action`

**Status:** revisada e aprovada pelo usuário em 2026-09-17
**Fundamento empírico:** `evidence/levantamento-taxa.md` — 117 turnos mensuráveis
**Critério que isto atende:** 1 — "Tabela de coerência escrita e revisada, com justificativa por combinação"

O risco registrado no `main.md` exigia revisão humana ANTES de a tabela virar checagem, porque "a regra pode ter exceção legítima: numa etapa final de missão talvez faça sentido corrigir e seguir". A revisão aconteceu e a exceção foi **recusada explicitamente** — ver "A regra aprovada" abaixo.

## Base normativa

Duas fontes decidem, e elas não se contradizem:

- **Invariante desta SPEC:** "SEMPRE que houver correção emitida, o turno deve convidar o aluno a aplicá-la; correção sem aplicação é informação, não ensino."
- **Métrica central (§20):** "o aluno produziu linguagem e tentou novamente após receber feedback." O que conta é a tentativa APÓS o feedback.

Do enum de `next_action`, só `retry` significa "o aluno repete a própria fala com a correção aplicada". Os outros três movem a conversa adiante.

## A regra aprovada

Formulação do usuário, 2026-09-17:

> "se existe uma correção que o aluno precisa aplicar, o fluxo pedagógico deve dar oportunidade de aplicação antes de avançar ou concluir a missão."

E o limite dessa regra, também do usuário:

> "enquanto o contrato atual não distinguir explicitamente uma 'correção informativa/não bloqueante', uma correção emitida deve impedir `continue_mission` e `complete_mission`. Se futuramente quisermos permitir observações no fechamento da missão sem exigir nova tentativa, isso deve entrar como uma semântica nova e explícita no contrato. Não quero abrir essa exceção implicitamente dentro da C15."

Consequência de desenho: **a C15 não tem exceção**. Correção emitida ⇒ só `retry` é coerente. A porta para "observação no fecho sem nova tentativa" existe, mas ela se abre mudando o CONTRATO do turno — criando a distinção entre correção bloqueante e informativa — e não relaxando a checagem por dentro.

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
| `continue_mission` | ❌ não | 0 | Avançar de etapa com correção pendente ignora a correção: a etapa fecha sem que o aluno tenha tido oportunidade de aplicar. Sem base empírica (0 de 117) — a classificação vem da regra aprovada, não de medida, e isso está declarado de propósito. |
| `complete_mission` | ❌ não | 0 | Pior caso: a missão termina e não existe turno futuro onde aplicar. O `main.md` já chamava esta combinação de "suspeita". Sem base empírica (0 de 117); classificação pela regra aprovada. |

Resumo operável, que é o que a C15 implementa: **`corrections.length > 0` ⇒ `next_action` deve ser `retry`.** Qualquer outro valor é incoerente.

## Por que classificar sem base empírica é a escolha certa aqui

`continue_mission` nunca ocorreu e `complete_mission` só ocorreu sem correção. Poderia parecer prudente deixar as duas linhas fora da checagem por falta de dado. É o contrário: errar para o lado estrito custa **zero** hoje — a checagem não vai acusar nada que exista — e dispara alarme no dia em que o comportamento aparecer. Classificar como coerente silenciaria a C15 nesses dois valores para sempre, e o modo de falha só apareceria em produção.

A honestidade metodológica é manter a distinção visível: 41 casos de `reply` são MEDIDA; as duas linhas de missão são REGRA. As duas coisas viram a mesma checagem, mas não têm o mesmo lastro, e o relatório não deve fingir que têm.

## Fonte de verdade de `next_action` — decisão do critério 4

**Escolhido: o núcleo pedagógico sobrescreve a proposta do modelo.** Decisão do usuário em 2026-09-17, sustentada pela taxa medida.

O que os dados sustentam:

- 41 de 64 turnos com correção emitida não pediram aplicação (64,1%);
- `hotel-10` está gravado com `retry` no contrato-do-turno-v2 e com `reply` no prompt-v5 — o mesmo caso, a mesma correção, e o prompt regrediu;
- logo, instrução de prompt não é garantia suficiente para esta invariante pedagógica. A instrução é precisamente o que falhou, e falhou sem ninguém notar porque nada media.

Isso é consistente com DEC-20260916-1612: o modelo PROPÕE `next_action`, quem decide é o núcleo. A regra determinística que o núcleo aplica, na formulação do usuário:

- há correção que requer aplicação → o núcleo força a ação de repetição/aplicação;
- não há correção → respeita-se a semântica correspondente do fluxo/missão;
- avanço ou conclusão nunca podem ignorar uma correção pendente.

O núcleo pedagógico já está arquivado (SPEC-20260916-1652-nucleo-pedagogico); esta SPEC define a regra, não a implementa lá — o escopo do `main.md` é explícito: "Implementar o núcleo pedagógico (SPEC própria) — aqui se define a regra que ele vai aplicar". A C15 é o instrumento que prova a regra sobre evidência.

## Divergência conhecida e NÃO resolvida — o núcleo no fechamento de missão

Registrada por decisão do usuário em 2026-09-17, depois de a tabela já estar aprovada. **Não é defeito de nenhum dos dois lados, e o comportamento atual do núcleo permanece válido.**

`src/domain/next-action.ts`, na `decidirNextAction`, condiciona a cobrança de aplicação:

```js
if (temCorrecao && transition !== "complete") {
```

com justificativa escrita no próprio código — "cobrar repetição depois de o objetivo ter sido cumprido transformaria a vitória do aluno em mais uma tarefa" — e teste nomeado em `next-action.test.ts`: `"mas fechar a missao vence a cobranca de repeticao"`.

Isso é uma política pedagógica **anterior, explícita, implementada e testada**, vinda da SPEC-20260916-1652-nucleo-pedagogico (arquivada). A regra estrita desta tabela e essa política discordam em uma única combinação: `complete_mission` + correção. Para `continue_mission` não há divergência — o núcleo já força `retry` em toda transição que não seja `complete`.

### As duas leituras coexistem de propósito

| Camada | O que responde |
|---|---|
| C15 (esta SPEC) | "Sob a regra estrita, quantos turnos com correção não pedem aplicação?" |
| Núcleo (arquivado) | "Uma missão concluída pode vencer a necessidade de repetição." |

**Estatuto da C15 até a reconciliação: checagem de observação e medição, não regra normativa.** Ela não reprova o núcleo e não bloqueia CI. Está escrito no comentário da própria checagem em `grade.mjs`, para quem ler o código não concluir que o núcleo está errado.

Nada foi alterado para acomodar a divergência: a C15 continua estrita e `decidirNextAction` continua com a linha e o teste intactos. Decisão do usuário: "A reconciliação acontecerá na SPEC do contrato de correções."

### A evolução que resolve — correção bloqueante × informativa

Ideia conceitual registrada, **sem definir nome de campo e sem tocar `turn-schema.json` nesta SPEC**:

- correção **bloqueante** → o aluno precisa aplicar antes de avançar ou concluir → `retry`;
- correção **informativa** → pode acompanhar o fechamento da missão sem exigir nova tentativa → `complete_mission` segue possível.

Duas ressalvas que o usuário fez questão de fixar:

1. **Não assumir que qualquer correção em `complete_mission` é automaticamente informativa.** A classificação precisa de regra objetiva, não de conveniência.
2. A SPEC futura tem de resolver **em conjunto**: correção bloqueante × informativa, comportamento de `next_action`, a exceção de `complete_mission`, o schema do turno, o núcleo, a C15 e a compatibilidade com as evidências históricas. Resolver em pedaços recria a divergência em outro lugar.

**Dependência explícita: a C15 não vira gate antes dessa SPEC.** Ver `SPEC-20260917-1259-contrato-de-correcoes`, registrada em `docs/future/` e no DAG do programa `emma` como dependente desta SPEC.

## Alternativa recusada nesta revisão

**Permitir correção não bloqueante em `continue_mission` / `complete_mission` por dentro da C15.** Recusada pelo usuário: a exceção pode ser desejável no futuro, mas tem de entrar como semântica NOVA e explícita no contrato do turno — distinguindo correção bloqueante de informativa — e não como afrouxamento implícito da checagem. Registrar aqui para que a recusa não se perca e a ideia não volte disfarçada.

Taxa real de correção de grafia nas evidências JÁ GRAVADAS, sem uma única chamada nova
ao modelo. Comando: `node scripts/eval/grade.mjs --levantamento-superficie`.

Fonte `execucao atual (docs/active/)`: nenhuma evidência — esta SPEC não roda o modelo.
Fonte `historico (docs/archive/)`: 5 alvos, 190 turnos lidos.

- turnos com correção .....: 61
- correções emitidas ......: 83
- correções de grafia .....: 4 (4,8% das correções)
- turnos violando .........: 4 (6,6% dos turnos com correção)
- destes, com `retry` .....: 3  <- o pior caso da invariante

Os 4 casos, todos no `openai/gpt-oss-20b`:

1. SPEC-20260916-1450 · openai_gpt-oss-20b · hotel-03.json
   "wifi" -> "Wi-Fi" (vocabulary, retry) — "A palavra deve ser escrita com letras
   maiúsculas e hífen." Caixa + hífen: grafia pura.
2. SPEC-20260916-1450 · openai_gpt-oss-20b · livre-04.json
   "english" -> "English" (register, retry)
3. SPEC-20260916-1450 · openai_gpt-oss-20b · talk-08.json
   "english" -> "English" (register, reply)
4. SPEC-20260916-1652-eval-personalidade · openai_gpt-oss-20b/matriz ·
   livre-02-n1-tranquila.json
   "english" -> "English" (vocabulary, retry) — o caso literal que originou a SPEC.

Leitura: a taxa é BAIXA (4,8%) mas a violação é RECORRENTE e concentrada num padrão
único — `english` -> `English` em 3 dos 4 casos, sempre com a mesma justificativa de
maiúscula. Não é ruído de geração: é um reflexo estável do modelo que a instrução do
prompt v5 não suprime. Três dos quatro somam `retry`, ou seja pedem que o aluno repita
por causa de grafia — exatamente o pior caso da invariante.

Nenhum falso positivo apareceu nas 83 correções: as outras 79 diferem por estrutura,
palavra ou registro, e C14 silenciou em todas. O par de self-test que protege contra o
falso positivo (`i'm agree` -> `I agree`) cobre a família que mais se aproximaria do
limite.

Categoria não é sinal: a mesma violação apareceu como `vocabulary` (2x) e `register`
(1x, 2x contando talk-08) — confirma a alternativa rejeitada no main.md de que proibir
uma categoria não resolveria.

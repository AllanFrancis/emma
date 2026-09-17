# Journal — SPEC-20260916-2048

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-16 23:37
**Onde tô:** início — nada feito ainda
**Próximo passo:** <primeiro passo concreto>
**Última decisão:** —
**Bloqueio atual:** nenhum
**Se retomar, ler:** main.md desta SPEC

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | <fase> | pendente | 2026-09-16 23:23 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
<!-- anti-alucinação por estrutura: separe o que é SABIDO (verificado no código/teste) do que é CHUTE (inferido) do que está EM ABERTO. Nunca trate inferência como fato. -->
- fato:
- inferência:
- dúvida:

### Respostas-chave do usuário

### Tentativas que falharam

### Arquivos tocados

### Onde parei

### Sessões (máx 5 linhas + 1 agregada)

## LOG (append-only — NUNCA editar entradas antigas)
<!-- tipos: ativação descoberta decisão tentativa blocker unblock refactor nota conclusão | entrada nova: specctl log -->

## 2026-09-16 23:23 — [ativação] SPEC ativada (branch feature/regra-fala-transcrita, base main)

## 2026-09-16 23:32 — [decisão] Porte mantido em P — gatilho normativo é suíte nova, não contagem de critérios

Porte MANTIDO em P. O `audit --deps` emitiu aviso não-bloqueante ("porte P com 4
critérios — sinais de porte M"), e a decisão é não escalar.

Regra normativa aplicada — `docs/rules/verification.md`, seção "Porte P — leve por
design": "NÃO crie suíte nem script novo só para dar `verify:` num P — é ajuste
pontual. Se de fato precisa de teste dedicado, o porte virou M". O gatilho normativo
de P→M é a necessidade de suíte/script NOVO, não a contagem de critérios.

Escopo real medido contra esse gatilho:
- A checagem nova entra no array `CHECKS` que já existe em `scripts/eval/grade.mjs`.
- Os casos de teste entram no harness de self-test que já existe (`buildSelfTestCases`
  / `runSelfTest`), acionado por `grade.mjs --self-test`. Nenhuma suíte nova, nenhum
  script novo, nenhuma dependência nova.
- O levantamento roda offline sobre evidência já gravada, sem chamada ao modelo.
- Sem mudança de contrato do turno (`turn-schema.json` intocado) e sem entidade nova
  no modelo de dados — o próprio main.md declara "Nenhuma".

Os 4 critérios fecham por `specctl check` com carimbo de timestamp+commit, que é
exatamente a rota de porte P; nenhum critério carrega `| verify:` (o lint recusaria).

Citação do usuário em 2026-09-16: "Se o único motivo para escalar é o aviso automático
por ter 4 critérios, avalie o escopo real. Se continua sendo uma alteração pequena,
localizada em `grade.mjs`, sem mudança arquitetural ou aumento relevante de risco, pode
permanecer P. Não quero aumentar porte apenas para silenciar um warning não bloqueante.
Se houver regra normativa que obrigue M nesse caso, aí faça o `escalate`."

Ressalva registrada: o critério 4 pede "ponto de aplicação decidido e registrado como
decisão arquitetural". Isso é uma DECISÃO documentada, não uma refatoração — se a
decisão escolher aplicar a rejeição dentro de `turn-validator.mjs` (mudando o
comportamento do validador de contrato), o porte é reavaliado ali e o `escalate` volta
à mesa antes de tocar o arquivo.
⎿ commit acb8deb+dirty · 1 file changed, 82 deletions(-)

## 2026-09-16 23:37 — [descoberta] Taxa de correcao de grafia: 4/83 correcoes (4,8%), 3 com retry — padrao estavel, nao ruido

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
⎿ commit acb8deb+dirty · 4 files changed, 236 insertions(+), 88 deletions(-)

## 2026-09-16 23:37 — [decisão] Ponto de aplicacao: filtrar no nucleo, nao rejeitar no validateTurn (DEC-20260916-2332)

Ponto de aplicação: FILTRAR NO NÚCLEO PEDAGÓGICO. Registrada como
DEC-20260916-2332-grafia-filtrada-no-nucleo em `docs/features/dialogo.md`.

As duas opções que o main.md colocou na mesa:

(a) Rejeitar em `validateTurn` — mais forte: a correção deixa de existir porque o turno
    inteiro fica inválido.
(b) Filtrar no núcleo — mais tolerante: o modelo propõe, o núcleo descarta.

Escolhida (b). Três razões, na ordem em que pesaram:

1. O levantamento mostra que o resto do turno estava BOM nos 4 casos. Rejeitar no
   validador transforma "uma correção ruim entre várias" em `json_validate_failed`, o
   que aciona retry e depois `scriptedTurn()` pela DEC-20260916-0311. Trocar um turno
   inteiro, com fala e instrução aproveitáveis, por um turno roteirizado é perda líquida
   — e a taxa de 4,8% viraria 4,8% de turnos degradados sem necessidade.
2. `validateTurn` valida CONTRATO. Correção de grafia é saída bem-formada: os 9 campos
   estão lá, o tipo está certo, a evidência é literal (C11 passa em todos os 4). O que
   está errado é PEDAGÓGICO. Misturar as duas coisas no validador apaga a fronteira que
   a ARCHITECTURE.md declara — "regra pedagógica em texto de prompt ou em componente é
   violação da §11", e o validador de contrato é da mesma família.
3. A DEC-20260916-1612 já dá ao núcleo a autoridade sobre `next_action`. Isso importa
   porque o descarte não basta: em 3 dos 4 casos o `next_action` era `retry`. Se o
   núcleo só remove a correção, sobra um turno pedindo que o aluno repita sem lhe mostrar
   nada para corrigir. O núcleo tem de descartar E rebaixar o `next_action` quando a
   lista esvazia — e ele é o único lugar que já pode fazer as duas.

Alternativa (a) NÃO foi descartada por preguiça: se a taxa fosse alta ou se o padrão
aparecesse acompanhado de turno inaproveitável, invalidar seria defensável. Os dados
dizem o contrário.

FORA DESTA SPEC, por decisão do usuário de manter cada SPEC no próprio escopo: a
implementação do filtro. Ela pertence à SPEC-20260916-1652-nucleo-pedagogico, que roda
em paralelo em outro worktree e precisará PORTAR o predicado para TypeScript — o
`isSurfaceOnlyCorrection` desta SPEC vive em `scripts/eval/turn-validator.mjs`, que é
harness de eval em .mjs, não código de produto.

O que esta SPEC entrega para aquela consumir:
- a definição verificável de "diferença exclusivamente de superfície" (caixa, pontuação,
  acento), com os pares de teste que separam violação de correção legítima;
- a taxa base de 4,8% para comparar depois da aplicação;
- C14, que passa a acusar regressão em qualquer rodada futura.
⎿ commit acb8deb+dirty · 4 files changed, 236 insertions(+), 88 deletions(-)

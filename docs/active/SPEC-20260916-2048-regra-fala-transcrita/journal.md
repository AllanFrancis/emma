# Journal — SPEC-20260916-2048

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-16 23:39
**Onde tô:** concluída — os 4 critérios evidenciados no commit `52d33b8`
**Próximo passo:** fechar (`close`); a aplicação do filtro é da SPEC-20260916-1652-nucleo-pedagogico
**Última decisão:** DEC-20260916-2332 — filtrar no núcleo, não rejeitar no `validateTurn`
**Bloqueio atual:** nenhum
**Se retomar, ler:** main.md desta SPEC + DEC-20260916-2332 em docs/features/dialogo.md

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | Predicado `isSurfaceOnlyCorrection` + checagem C14 + pares de self-test | concluída | 2026-09-16 23:38 |
| 2 | Levantamento da taxa sobre evidência histórica, sem chamada nova | concluída | 2026-09-16 23:38 |
| 3 | Decisão do ponto de aplicação registrada como DEC | concluída | 2026-09-16 23:38 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
<!-- anti-alucinação por estrutura: separe o que é SABIDO (verificado no código/teste) do que é CHUTE (inferido) do que está EM ABERTO. Nunca trate inferência como fato. -->
- fato: C14 está no array `CHECKS` de `scripts/eval/grade.mjs` e o self-test passa com 26 casos de turno / 14 checagens / 0 falhas.
- fato: taxa medida sem chamada nova ao modelo — 190 turnos lidos em `docs/archive/`, 61 com correção, 83 correções, 4 de grafia (4,8%), 3 delas com `next_action: retry`.
- fato: nenhum falso positivo nas 83 correções; as outras 79 diferem por estrutura, palavra ou registro e C14 silenciou em todas.
- fato: `bun run lint` 0 erros (6 avisos pré-existentes em `src/components/ui/`) e `bun x tsc --noEmit` exit 0.
- fato: descoberta de evidência separada em `findEvidenceTargets` (docs/active, execução atual) e `findHistoricalEvidenceTargets` (docs/archive, só levantamento); `printTable` e os gates continuam lendo só a atual.
- inferência: `english` -> `English` em 3 dos 4 casos indica reflexo estável do `gpt-oss-20b`, não variância — mas isso não foi testado com repetição controlada (é a SPEC-20260916-2048-metodologia-de-eval que dá esse instrumento).
- dúvida: se o filtro no núcleo derruba a taxa a zero ou se o modelo passa a embutir a mesma correção de grafia dentro de uma correção estrutural, escapando de C14. Só medível depois da aplicação.

### Respostas-chave do usuário
- 2026-09-16: "Se o único motivo para escalar é o aviso automático por ter 4 critérios, avalie o escopo real. (...) Não quero aumentar porte apenas para silenciar um warning não bloqueante." → porte mantido em P.
- 2026-09-16: "não quero uma mudança silenciosa que faça todo `grade.mjs` começar a misturar SPEC ativa com histórico. (...) preserve a distinção" → duas funções de descoberta nomeadas, gates lendo só a atual.
- 2026-09-16: "Não antecipe alterações dessas duas dentro das SPECs atuais" → nada de `semantica-next-action` nem de retenção de contexto entrou aqui.

### Tentativas que falharam
- nenhuma: a normalização de superfície funcionou na primeira execução do self-test, porque `normalizeForEvidence` já resolvia apóstrofo e caixa e só faltou remover pontuação e diacrítico.

### Arquivos tocados
- `scripts/eval/turn-validator.mjs` — `normalizeSurface` (privada) + `isSurfaceOnlyCorrection` (exportada); `validateTurn` e `validateEvidence` INALTERADOS.
- `scripts/eval/grade.mjs` — C14 em `CHECKS`; 7 casos de self-test; `collectEvidenceTargets` + as duas funções de descoberta; modo `--levantamento-superficie`.
- `docs/features/dialogo.md` — DEC-20260916-2332.

### Onde parei
Critérios 1-4 carimbados. Falta só o `close`.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-16 23:23→23:39 — ativação, decisão de porte, implementação, levantamento, DEC e carimbo dos 4 critérios.

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

## 2026-09-16 23:39 — [conclusão] C14 torna a DEC-20260916-0312 verificavel; taxa 4,8% medida offline; filtro decidido para o nucleo

A DEC-20260916-0312 deixou de depender de obediência do modelo. O que existia era uma
frase no prompt v5; o que existe agora é uma checagem que reprova.

Entregue:
- `isSurfaceOnlyCorrection` exportado de `scripts/eval/turn-validator.mjs`, sobre uma
  normalização de superfície que remove caixa, pontuação e diacrítico. `validateTurn` e
  `validateEvidence` ficaram intocados — a regra é pedagógica, não de contrato.
- C14 no array `CHECKS` de `grade.mjs`, com `every`: uma correção de superfície contamina
  o turno mesmo acompanhada de correção legítima.
- 7 pares de self-test. Positivos: caixa (`english`->`English`), pontuação
  (`lets go`->`let's go`), acento (`cafe`->`café`), mista na mesma lista. Negativos:
  `i'm agree`->`I agree` e `I want`->`I'd like`. Suíte: 26 casos de turno, 14 checagens,
  0 falhas.
- Descoberta de evidência dividida em duas funções nomeadas —
  `findEvidenceTargets` (docs/active, execução atual, única fonte de `printTable` e dos
  gates) e `findHistoricalEvidenceTargets` (docs/archive, só levantamento) — sobre um
  `collectEvidenceTargets` comum. Modo `--levantamento-superficie` reporta as duas
  separadas e nunca somadas.

Medido, sem uma chamada nova ao modelo: 190 turnos, 61 com correção, 83 correções, 4 de
grafia (4,8%), 3 delas pedindo `retry`. O caso `livre-02 n1 tranquila` que originou a
SPEC apareceu, e com ele três irmãos — incluindo um `wifi`->`Wi-Fi` que a leitura humana
não tinha pego. Zero falso positivo nas outras 79.

Decidido e registrado como DEC-20260916-2332: o núcleo pedagógico FILTRA, o validador não
rejeita. Rejeitar invalidaria turno bom inteiro por causa de uma correção entre várias, e
o levantamento mostra que o resto do turno estava aproveitável nos 4 casos. O núcleo
também precisa rebaixar `next_action` quando a lista de correções esvazia, senão sobra um
turno pedindo repetição sem mostrar o que corrigir — a DEC-20260916-1612 já lhe dá essa
autoridade.

O que NÃO entrou, de propósito: a aplicação do filtro. Ela é da
SPEC-20260916-1652-nucleo-pedagogico, que precisa portar o predicado para TypeScript —
`turn-validator.mjs` é harness de eval, não código de produto. Também não entrou nada de
`semantica-next-action` nem de retenção de contexto, por instrução do usuário de manter
cada SPEC no próprio escopo.

Porte P mantido, com a regra citada: o gatilho normativo de escalada é precisar de suíte
ou script novo, e o harness de self-test já existia.
⎿ commit 52d33b8+dirty · 3 files changed, 30 insertions(+), 14 deletions(-)

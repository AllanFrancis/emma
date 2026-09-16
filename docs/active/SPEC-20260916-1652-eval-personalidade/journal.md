# Journal — SPEC-20260916-1652

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-16 17:16
**Onde tô:** fases 1 a 4 concluídas (matriz declarada, prompt v5, runner e comparador). Rodada da matriz em andamento; 2 de 8 critérios com `verify:` estampados.
**Próximo passo:** aguardar as 48 células + 7 da comparação, depois `verify` e apresentar a leitura humana.
**Última decisão:** asserção de matriz exige matriz COMPLETA — passe sobre dado parcial transforma "não medi" em "está certo".
**Bloqueio atual:** nenhum. Rodada em andamento sob teto de TOKENS/min.
**Se retomar, ler:** `main.md` desta SPEC e a entrada `[unblock]` de 16:30 no journal arquivado da SPEC-20260916-1450, que traz os números do v4.

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | `matriz.json` — subconjunto declarado + `validate.mjs --matriz` | concluído | 2026-09-16 17:12 |
| 2 | Prompt v5 — precedência da via (b) e `explanation_pt` amarrada ao português | concluído | 2026-09-16 17:13 |
| 3 | `run.mjs --matriz` e `--comparar-prompt` | concluído | 2026-09-16 17:14 |
| 4 | `grade.mjs --matriz` — asserções de completude, invariância, diferença e teto | concluído | 2026-09-16 17:16 |
| 5 | Rodada da matriz (48 chamadas) | em progresso | 2026-09-16 17:16 |
| 6 | `--comparar-prompt` — as 7 falas do v4 contra o v5 (7 chamadas) | pendente | 2026-09-16 17:05 |
| 7 | Leitura humana: troca C5×C4 e diferença percebida entre os tons | pendente | 2026-09-16 17:05 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
- fato: o contrato do turno v2 está fechado e medido (45/45, zero falha) — esta SPEC NÃO o altera.
- fato: as 4 omissões do v4 são `cafe-02` ("I want a coffee"), `cafe-08` ("Do you have some vegetarian option?"), `talk-06` ("It's very hot today, no?") e `talk-10` ("I have a doubt about what you said"); em todas o modelo pôs a forma correta em `suggestion_en` em vez de `corrections[]`.
- fato: as 3 explicações em inglês do v4 são `hotel-05`, `hotel-07` e `hotel-10`; a de `hotel-10` usa metalinguagem gramatical em inglês para aluno de nível baixo.
- fato: duas dessas omissões são casos que o prompt v4 NOMEIA LITERALMENTE na via (b) — "I want a coffee" num balcão e o falso cognato "doubt". Instrução nomeando o exemplo não bastou.
- fato: baseline do v4 nas 13 checagens (45 falas, tom tranquila, nível do dataset): C4 94% · C5 86% · C7 93% · C8 82% · C11 100% · C12 100% · C13 88%, resto 100%.
- fato: o teto do tier gratuito é de TOKENS/min (~1065 por turno); o `run.mjs` já tem backoff de 20s e pausa pelo header de tokens.
- inferência: dar PRECEDÊNCIA explícita à via (b) sobre a (c) deve mover C5, porque a evolução v1→v3 provou que esse número responde a instrução. Mas pode custar C4 — corrigir mais também é corrigir o que não devia.
- dúvida: os dois tons vão sair mensuravelmente diferentes? Se o modelo ignorar o tom, a personalidade é decorativa e a asserção de DIFERENÇA reprova — e isso é achado, não bug do teste.
- dúvida: a invariância vai se sustentar quando o tom estiver no prompt? Esta SPEC mede com o tom AINDA dentro do prompt; se falhar, é o argumento empírico para a camada pós-LLM da SPEC de camada-de-personalidade.

### Respostas-chave do usuário
- "Siga para a abertura da sua recomendação eval-personalidade" (2026-09-16 17:05) — autoriza abrir esta SPEC.
- Contrato do draft foi escrito por mim e commitado em `c5643d7` sem revisão linha a linha; os critérios ganharam `verify:` na ativação.

### Tentativas que falharam
—

### Arquivos tocados
—

### Onde parei
SPEC aberta na branch `feature/eval-personalidade`, contrato com 9 critérios. Implementação não começou.

### Sessões (máx 5 linhas + 1 agregada)

## LOG (append-only — NUNCA editar entradas antigas)
<!-- tipos: ativação descoberta decisão tentativa blocker unblock refactor nota conclusão | entrada nova: specctl log -->

## 2026-09-16 17:05 — [ativação] SPEC ativada (branch feature/eval-personalidade, base main)

## 2026-09-16 17:15 — [nota] verify: 3/8 critérios passaram (commit `c3ecccf`)

- PASS: O comparador de matriz se comporta como especificado: recon…
- PASS: O subconjunto da matriz é declarado como dado versionado, c…
- FAIL: Matriz executada: cada fala do subconjunto tem as 4 células…
- FAIL: Invariância pedagógica: `corrections[].suggested`, `categor…
- PASS: Diferença de estilo: `reply_en` e `explanation_pt` mensurav…
- FAIL: Nenhum tom corrige mais itens que o outro para a mesma fala…
- FAIL: As 13 checagens do contrato v2 seguem verdes sobre as saída…
- FAIL: Comparação v4→v5 nas 7 falas que falharam, com as duas evid…

## 2026-09-16 17:15 — [nota] verify: 2/8 critérios passaram (commit `c3ecccf`)

- PASS: O comparador de matriz se comporta como especificado: recon…
- PASS: O subconjunto da matriz é declarado como dado versionado, c…
- FAIL: Matriz executada: cada fala do subconjunto tem as 4 células…
- FAIL: Invariância pedagógica: `corrections[].suggested`, `categor…
- FAIL: Diferença de estilo: `reply_en` e `explanation_pt` mensurav…
- FAIL: Nenhum tom corrige mais itens que o outro para a mesma fala…
- FAIL: As 13 checagens do contrato v2 seguem verdes sobre as saída…
- FAIL: Comparação v4→v5 nas 7 falas que falharam, com as duas evid…

## 2026-09-16 17:16 — [blocker] Passe espurio no criterio 5: assercoes de matriz concluiam sobre 12 de 48 celulas; gate corrigido e selo falso desfeito a mao porque o verify marca mas nao desmarca

Erro meu, pego pelo próprio gate ao ser executado no meio da rodada.

O `verify` das 17:15 marcou o critério 5 (`--assert-diferenca`) como `[x]` com exit 0. **Era passe
espúrio.** Só 12 das 48 células estavam gravadas naquele momento, e minhas três asserções de matriz
só recusavam quando NÃO havia célula nenhuma (`porFala.size === 0`). Com matriz pela metade elas
prosseguiam e passavam por falta de dados: nenhuma violação encontrada porque as falas que
poderiam violar ainda não tinham sido chamadas.

Um gate que passa antes de a medição terminar é pior do que gate nenhum: ele transforma "não medi"
em "está certo". E o modo de falha era silencioso — o exit 0 não distinguia "comparei e não achei
problema" de "não tinha o que comparar".

CORREÇÃO NO GATE: `exigirCelulas` agora carrega a matriz declarada e exige que TODA fala tenha
todas as suas células antes de qualquer asserção concluir. Com 12/48 ele reprova nomeando as 8
falas incompletas. Vale para invariância, diferença e teto — as três concluem sobre a matriz, então
as três exigem a matriz inteira.

BURACO NO HARNESS, que vale registrar porque não é meu: rodei `specctl verify --all` esperando que
a reavaliação corrigisse o selo. O comando RE-EXECUTOU o critério e reportou `FAIL`, mas **não
removeu o `[x]`** — a ferramenta marca e nunca desmarca. Consequência: um gate que fica mais
rigoroso depois de um passe deixa um selo falso no contrato, e o `close` aceitaria esse critério
como cumprido. Não existe `uncheck` no `specctl` (o `reopen` é para SPEC arquivada, não para
critério).

Desfiz o `[x]` à mão e registro aqui em vez de silenciar. O `formats.md` diz que `[x]` é gravado
pela FERRAMENTA e que escrever "verify: exit 0" à mão é spoofing — retirar uma afirmação falsa é o
oposto disso, mas a edição manual de um campo que deveria ser da ferramenta merece rastro. Depois
que a rodada terminar, o critério será reavaliado pelo gate corrigido e, se passar, o selo será da
ferramenta e verdadeiro.

Lição que passa para as próximas SPECs: não rodar `verify` no meio de uma rodada longa. O gate tem
de recusar dado parcial por construção, mas o hábito de verificar cedo transforma qualquer gate
frouxo em selo falso.
⎿ commit c3ecccf+dirty · 3 files changed, 44 insertions(+), 3 deletions(-)

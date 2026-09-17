# Journal — SPEC-20260916-1652

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-16 20:33
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

## 2026-09-16 17:52 — [nota] verify: 2/6 critérios passaram (commit `0e870ef`)

- PASS: Matriz executada: cada fala do subconjunto tem as 4 células…
- FAIL: Invariância pedagógica: `corrections[].suggested`, `categor…
- PASS: Diferença de estilo: `reply_en` e `explanation_pt` mensurav…
- FAIL: Nenhum tom corrige mais itens que o outro para a mesma fala…
- FAIL: As 13 checagens do contrato v2 seguem verdes sobre as saída…
- FAIL: Comparação v4→v5 nas 7 falas que falharam, com as duas evid…

## 2026-09-16 17:53 — [descoberta] Matriz 48/48: o tom TRANQUILA suprime correcao (C5 75% vs 94% da direta); C4 69% e composicao de amostra e nao regressao do v5; falha grave em livre-02 corrigindo maiuscula contra a DEC-0312

Matriz completa: 48/48 células, 12 falas × {nível 1, 4} × {tranquila, direta}. Gates:
`--assert-completo` PASSA · `--assert-diferenca` PASSA · `--assert-invariancia` REPROVA (19 de 24
pares) · `--assert-teto` REPROVA (6 de 24).

DECOMPOSIÇÃO DAS 19 VIOLAÇÕES DE INVARIÂNCIA. O número bruto é enganoso e o erro é meu: incluí
`focus` — texto livre — numa comparação por igualdade exata, e duas gerações independentes quase
nunca redigem igual. Decompondo os 24 pares (fala × nível):

- 5 idênticos em tudo, inclusive `focus`
- 5 divergem SÓ na redação de `focus` (correção idêntica) — não é violação pedagógica
- 8 divergem em `suggested` ou `category`, com a mesma quantidade
- 6 divergem na QUANTIDADE de correção

E dentro dos 8: quatro têm `suggested` IDÊNTICO e só a `category` difere (`cafe-04 n4`
preposition×grammar, `hotel-05 n4` false_friend×grammar, `livre-05 n4`, `talk-06 n1`
false_friend×grammar). Isso é inconsistência de rótulo, não pedagogia diferente.

Divergência real no QUE se ensina: 4 (texto da correção) + 6 (quantidade) = 10 de 24 pares (42%).

C4 E C5 POR TOM — o achado principal:

| tom | células | correções emitidas | C4 (não corrige controle) | C5 (corrige quando há) |
|---|---|---|---|---|
| direta | 24 | 24 | 6/8 = 75% | 15/16 = 94% |
| tranquila | 24 | 22 | 5/8 = 63% | 12/16 = 75% |

O total de correções é praticamente igual (24 vs 22), então a diferença NÃO é "direta corrige
mais". A `direta` é mais ACERTADA nas duas pontas: corrige mais o que deve (94% vs 75%) e
sobre-corrige menos o que não deve (75% vs 63%). Ou seja, o tom "tranquila" está SUPRIMINDO
correção — exatamente o modo de falha que a §6 proíbe ("nenhuma personalidade pode prejudicar a
didática"). 4 das 5 falhas de C5 são `tranquila`.

C4 = 69% NÃO É REGRESSÃO DO V5. É composição de amostra, e a aritmética fecha: dos 5 falhas de C4,
QUATRO são `hotel-07` ("What time is the breakfast?") nas suas 4 células — e o v4 falhava
exatamente essa mesma fala. No dataset de 45, `hotel-07` é 1 de 17 controles (6% de peso); na
matriz é 1 de 4 controles (25% de peso), e cada fala aparece 4 vezes. Mesmo comportamento, peso 4×
maior. A 5ª falha é `livre-02 n1 tranquila`.

`hotel-07` tem um ganho REAL do v5, apesar de continuar sobre-corrigindo: no v4 a explicação saía em
inglês ("Use 'breakfast' without the article, it's an uncountable noun."); nas 4 células do v5 sai
em português ("Não se usa artigo antes de 'breakfast'."). C13 subiu de 88% para 97%.

FALHA GRAVE, e ela viola uma decisão ativa: `livre-02 n1 tranquila` corrigiu "english" → "English"
na fala "Sorry, my english is very bad", categoria `vocabulary`, explicação "Use maiúscula em nomes
de línguas", e `next_action: retry`. Pedir repetição a quem acabou de declarar vergonha do próprio
inglês, por causa de MAIÚSCULA. A DEC-20260916-0312 está EXPLÍCITA no prompt v5 ("não corrija
maiúscula, pontuação nem grafia, porque nada disso existe na fala") e o modelo violou. É a mesma
falha que reprovou o `gpt-oss-120b` na SPEC-20260916-0109. Ocorreu em 1 de 4 células; o v4 (nível 2,
tranquila) não cometeu.

LIMITE METODOLÓGICO QUE ATRAVESSA TUDO: nenhuma rodada, v4 ou v5, fixa `temperature` ou `seed`. O
payload arquivado do v4 tem só `model`. Com amostragem estocástica e n=1 por célula, diferença
isolada entre células NÃO é atribuível ao tom nem ao prompt. Só padrão consistente sustenta
atribuição. Falta uma condição de controle — a mesma célula repetida — para quantificar a variância
de base. Isso não invalida os achados consistentes; invalida a leitura de casos isolados.

Aplicando esse critério aos 6 casos de quantidade diferente: a DIREÇÃO É MISTA (4 com `direta`
corrigindo mais, 2 com `tranquila` corrigindo mais), o que é assinatura de ruído. MAS `cafe-02` é
consistente: `direta` corrigiu em n1 e n4, `tranquila` omitiu em n1 e n4.

CRUZAMENTO COM A COMPARAÇÃO CONTROLADA (1 de 7 concluída, `cafe-02`): em condição idêntica ao v4
(nível 2, tom tranquila), o v5 também OMITIU — 0 correções, `next_action: reply`, a forma certa em
`suggestion_en`. Somando as observações de `cafe-02`: 4 em `tranquila` (v4 n2, v5 controlado n2, v5
matriz n1, v5 matriz n4) todas OMITINDO, e 2 em `direta` (v5 matriz n1 e n4) ambas CORRIGINDO.
6 observações, padrão limpo: quem determina a correção de `cafe-02` é o TOM, não a versão do prompt.
A regra de precedência do v5 não consertou a omissão no tom tranquila.

ESTADO DA COMPARAÇÃO: 1 de 7. Bloqueada em 429 com `retry-after` de 677s, e o revelador é que
`remainingRequests: 950` e `remainingTokens: 5952` parecem SAUDÁVEIS — o 429 vem de um limite que
esses headers por minuto não expõem, provavelmente a janela mais longa do tier gratuito. Gastamos
45 turnos na SPEC anterior + 48 células hoje. O job segue retentando com backoff.

BUG NO MEU GATE do critério 7: `--assert-contract` exige ≥40 turnos POR GRUPO, e o grupo da
comparação tem 7 por desenho. Esse critério nunca passaria. Não corrigi agora por instrução
explícita do usuário de não alterar código antes da análise final.
⎿ commit 0e870ef+dirty · 2 files changed, 12 insertions(+), 3 deletions(-)

## 2026-09-16 18:14 — [decisão] Interacao tom-pedagogia rebaixada a HIPOTESE por determinacao do usuario; cafe-02 sao execucoes repetidas e nao independentes; livre-02 e candidata a regressao; gate do criterio 7 agora valida o desenho de cada grupo

Correções de interpretação determinadas pelo usuário em 2026-09-16 18:12, sobre a entrada
`[descoberta]` de 17:53. A entrada anterior não é editada (LOG é append-only); esta a corrige.

1. REBAIXADO DE CONCLUSÃO A HIPÓTESE. Eu escrevi que "o tom no prompt está mexendo na pedagogia" e
que "nenhuma versão de prompt resolve isso por instrução". Citação do usuário: "Não trate ainda
como conclusão que 'o problema é o tom no prompt' ou que 'nenhuma versão de prompt resolve isso'.
Os dados apontam fortemente para uma interação entre tom e comportamento pedagógico, mas por
enquanto registre isso como hipótese sustentada pelos resultados, não como conclusão definitiva."
Status correto: **HIPÓTESE sustentada pelos resultados** — há interação aparente entre tom e
comportamento pedagógico (C5 75% em tranquila contra 94% em direta, com total de correções
praticamente igual), e ela é relevante o suficiente para orientar a próxima SPEC, mas não está
estabelecida.

2. "INDEPENDENTES" ERA TERMO ERRADO. Chamei as 6 observações de `cafe-02` de independentes.
Citação: "São execuções repetidas do mesmo modelo e do mesmo desenho experimental, sem `seed` e sem
controle explícito de `temperature`. O padrão é relevante e merece destaque, mas não prova sozinho
causalidade." Correto: são **execuções repetidas do mesmo modelo sob o mesmo desenho**, sem `seed` e
sem `temperature` fixada. O padrão (4 em tranquila omitindo, 2 em direta corrigindo) merece
destaque e não estabelece causalidade.

3. C4 ESCLARECIDO E ACEITO pelo usuário: a queda de 94% para 69% NÃO é regressão do v5. A
composição da matriz explica — `hotel-07` pesa 25% dos controles ali contra 6% no dataset de 45, e
o v4 falhava a mesma fala.

4. `livre-02 n1 tranquila` fica registrado como VIOLAÇÃO IMPORTANTE da decisão ativa
DEC-20260916-0312 (não corrigir maiúscula, pontuação nem grafia, porque é fala transcrita), e
APENAS COMO CANDIDATA A REGRESSÃO até haver comparação equivalente. A comparação disponível não é
equivalente: o v5 rodou em nível 1 e o v4 em nível 2, e ocorreu em 1 de 4 células do v5.

AÇÕES EXECUTADAS junto com esta correção:

- Retry do 429 INTERROMPIDO (diretriz 7), para não consumir tentativas nem acumular registros de
  falha transitória. Já havia 5 registros em `prompt-v5/_failures`; ficam preservados como
  evidência do que aconteceu, e o gate os classifica como transitórios.
- `cafe-08` entrou antes da interrupção, então a comparação está em 2 de 7: faltam `talk-06`,
  `talk-10`, `hotel-05`, `hotel-07` e `hotel-10`. A retomada roda SOMENTE essas 5 — o runner resume
  por existência de arquivo, então `cafe-02` e `cafe-08` não serão repetidas (diretriz 6).
- GATE DO CRITÉRIO 7 CORRIGIDO (diretriz 5), sem afrouxar. `--assert-contract` passou a validar o
  DESENHO de cada grupo: `matriz` exige EXATAMENTE falas×níveis×tons lido do `matriz.json` (48 hoje);
  grupo de comparação exige EXATAMENTE `comparacao.falas.length` (7); rodada do dataset inteiro
  segue com MÍNIMO de 40, porque o dataset pode crescer sem invalidar nada. A exigência "exata"
  reprova nos DOIS sentidos — faltando célula e com célula a mais que o previsto — e 8 casos de
  self-test guardam isso. Resultado: matriz 48/48 passa, comparação com 2 de 7 reprova nomeando
  "desenho incompleto".
⎿ commit 66a12df+dirty · 1 file changed, 68 insertions(+), 8 deletions(-)

## 2026-09-16 20:33 — [descoberta] Comparacao controlada 7/7: 5 melhora, 0 regressao, 2 equivalencia; C4 melhorou (v5 nao sobre-corrigiu o controle); primeira json_validate_failed do 20b, recuperada por retry

Comparação controlada 7/7 fechada. Condição idêntica ao v4 em todas: nível do dataset, tom
tranquila, mesmo modelo, mesmo dataset. Só o prompt muda.

RESULTADO: 5 melhora · 0 regressão · 0 troca · 2 equivalência.

| fala | corr. v4→v5 | next_action v4→v5 | C4 | C5 | C13 | veredito | confiança |
|---|---|---|---|---|---|---|---|
| cafe-02 | 0→0 | reply→reply | n/a | FALHA→FALHA | n/a | equivalência | BAIXA |
| cafe-08 | 0→1 | reply→reply | n/a | FALHA→passa | n/a→passa | MELHORA +C5 | BAIXA |
| talk-06 | 0→1 | reply→**retry** | n/a | FALHA→passa | n/a→passa | MELHORA +C5 | BAIXA |
| talk-10 | 0→0 | reply→reply | n/a | FALHA→FALHA | n/a | equivalência | BAIXA |
| hotel-05 | 1→1 | retry→retry | n/a | passa→passa | FALHA→passa | MELHORA +C13 | MÉDIA |
| hotel-07 | 1→**0** | reply→reply | **FALHA→passa** | n/a | FALHA→n/a | MELHORA +C4 | MÉDIA (frágil) |
| hotel-10 | 1→1 | **retry→reply** | n/a | passa→passa | FALHA→passa | MELHORA +C13 | BAIXA |

C4 — RESPOSTA DIRETA À PERGUNTA DO USUÁRIO: o v5 NÃO aumentou correção indevida em caso de
controle. Só 1 das 7 falas é controle (`hotel-07`), o v4 sobre-corrigia e o v5 NÃO corrigiu. Na
comparação controlada, C4 melhorou.

RESSALVA HONESTA sobre `hotel-07`: a matriz contradiz esse resultado. Nas 4 células da matriz
(níveis 1 e 4, ambos os tons) o modelo sobre-corrigiu em 4/4; na comparação controlada (nível 3,
tranquila) não corrigiu. A discordância entre os dois desenhos é ela mesma evidência de variância
de amostragem, e torna o veredito "MELHORA +C4" de `hotel-07` FRÁGIL, apesar do rótulo MÉDIA que a
função de confiança atribui por consistência da matriz.

C5: das 4 omissões do v4, o v5 consertou 2 (`cafe-08` "some"→"any", `talk-06` "no?"→"isn't it?") e
manteve 2 (`cafe-02`, `talk-10`). Nas duas que persistem, a forma correta continua indo para
`suggestion_en` — exatamente o padrão que a regra de precedência do v5 pretendia eliminar. Ou seja:
a regra funcionou em metade dos casos.

C13: das 3 explicações em inglês do v4, o v5 corrigiu 2 de forma verificável (`hotel-05`:
"Use 'am' instead of 'have' for age." → "Você esqueceu de usar 'am' e 'old' para indicar sua
idade."; `hotel-10`: "Use present perfect continuous..." → "Para indicar que algo começou no
passado e continua no presente, usamos 'have been living'..."). A terceira (`hotel-07`) virou n/a
porque o v5 não emitiu correção nenhuma.

PIORA NÃO CAPTURADA POR NENHUMA CHECAGEM: `hotel-10` mudou `next_action` de `retry` para `reply`
mantendo a correção emitida. Pedir ao aluno que aplique a correção é pedagogicamente melhor que
seguir adiante, e nenhuma das 13 checagens mede isso — C12 só olha casos de controle. Fica
registrado como lacuna de medição, não como regressão confirmada.

PRIMEIRA `json_validate_failed` DO 20b. Aconteceu em `talk-06`, na primeira tentativa, com DUAS
causas na mesma resposta: (1) JSON malformado — o modelo não fechou a string de `focus` e escreveu
`...em vez de 'no?','next_action":"reply"`, com aspa simples onde devia ser dupla; (2) `words` com
4 itens, violando `maxItems: 3`. A SPEC-20260916-1450 registrou 2 dessas no 120b e ZERO no 20b em
45 chamadas. Agora: 1 em ~57 chamadas do v5 (48 matriz + 7 comparação + 2 anteriores). Não é
distinguível estatisticamente de 0 em 45, mas confirma o gotcha "strict: true não garante resposta
utilizável" e reforça a DEC-20260916-0311. Retentar resolveu.

CONSEQUÊNCIA NO GATE, e é decisão do usuário: `--assert-contract` classifica essa falha como falha
de CONTRATO (corretamente — não é rate limit) e por isso o critério 7 REPROVA, mesmo com os 7
turnos gravados todos válidos. A questão em aberto: uma `json_validate_failed` que foi RECUPERADA
por retry, e cuja fala tem evidência bem-sucedida, deve reprovar o desenho? Pela DEC-20260916-0311
isso é a decisão FUNCIONANDO, não o contrato quebrado. Não alterei o gate por conta própria —
mudar classificação depois de ver o gate reprovar é exatamente o padrão que produz confiança falsa.

LIMITE METODOLÓGICO que vale para toda a tabela: nenhuma rodada fixa `seed` nem `temperature`. Cada
célula da tabela é n=1 por versão. A coluna de confiança reflete apenas CORROBORAÇÃO pela matriz,
não tamanho de efeito. Nenhuma linha isolada sustenta causalidade; o conjunto (5 melhoras, 0
regressões) sustenta a direção.
⎿ commit 7a6e05a+dirty · 1 file changed, 71 insertions(+), 8 deletions(-)

# Journal — SPEC-20260916-2048

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-17 00:23
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

## 2026-09-16 23:23 — [ativação] SPEC ativada (branch feature/metodologia-de-eval, base main)

## 2026-09-17 00:02 — [descoberta] Groq confirma temperature e seed na doc viva; x_groq.seed ja vinha nas evidencias antigas

Confirmação contra a documentação VIVA do Groq, não por analogia com a API da OpenAI.
Fonte: https://console.groq.com/docs/api-reference, seção do endpoint
`POST /openai/v1/chat/completions`, consultada em 2026-09-16.

`temperature` — number|null, opcional, default 1, faixa 0-2. SUPORTADO.

`seed` — integer|null, opcional. SUPORTADO, com ressalva explícita da própria doc: o
sistema faz um "best effort to sample deterministically, such that repeated requests with
the same seed and parameters should return the same result"; determinismo NÃO é garantido,
e a doc instrui a observar o campo de resposta `system_fingerprint` para saber quando o
backend mudou de configuração.

`system_fingerprint` — campo de RESPOSTA que representa a configuração de backend e,
segundo a doc, serve junto com `seed` para entender quando houve mudança que afeta o
determinismo. Por isso passou a ser gravado na evidência.

Pegadinha adicional, da página de compatibilidade OpenAI do próprio Groq
(https://console.groq.com/docs/openai): "If you set a temperature value of 0, it will be
converted to 1e-8." Ou seja, temperature 0 não é 0 nessa API. Também dessa página, campos
que retornam 400: `logprobs`, `logit_bias`, `top_logprobs`, `messages[].name`; e `n`, se
enviado, precisa ser 1.

Achado que não estava previsto: a evidência JÁ ARQUIVADA carrega `x_groq.seed` — o Groq
devolve o seed que usou mesmo quando nenhum é enviado (ex.: 2085244968 em
`cafe-01.json` da SPEC-20260916-1450). Isso significa que as rodadas antigas eram
reproduzíveis a posteriori e ninguém sabia. A gravação agora registra pedido e efetivo
lado a lado, então a diferença fica visível em vez de inferida.

Conteúdo reformulado a partir da fonte para atender às restrições de licenciamento.
⎿ commit acb8deb+dirty · 2 files changed, 448 insertions(+), 122 deletions(-)

## 2026-09-17 00:02 — [decisão] Timeout 30s derivado de 215 turnos gravados; AbortSignal.timeout usa timer unref

O timeout não foi arbitrado: saiu das 215 evidências arquivadas que gravaram `usage`.
Medição feita por script descartável em `tmp/latencia.mjs`, lendo `docs/archive/`.

Parede por turno (`queue_time` + `total_time`), em segundos:
  p50 1,28 · p90 1,95 · p99 2,39 · MÁXIMO 2,91
  (o máximo é `SPEC-20260916-0109/.../openai_gpt-oss-120b/cafe-11.json`)

Custo e throughput:
  tokens/turno médio 1.898 · completion médio 770 · turno mais caro 3.433 tokens
  throughput de completion: p1 403 tok/s · p50 793 tok/s

Derivação: o pior caso ESTIMADO de geração é o turno mais caro no throughput mais lento
observado — 3.433 tokens a 403 tok/s ≈ 8,5s. `TIMEOUT_MS = 30_000` é ~10x o pior caso
OBSERVADO (2,91s) e ~3,5x o pior caso estimado (8,5s). Folga suficiente para não cortar
rodada legitimamente lenta, e curto o bastante para matar conexão pendurada — a falha que
travou a rodada da matriz por ~15 minutos em `livre-09-n4-direta`.

Descoberta na marra, e vale para quem mexer nisso depois: `AbortSignal.timeout` usa timer
UNREF. Sozinho ele não segura o event loop. Em produção quem segura é o socket aberto do
`fetch`, então o timeout dispara e aborta normalmente. Mas num teste cujo dublê apenas
espera o abort não existe handle nenhum: o Node esvazia a fila e SAI COM CÓDIGO 0, em
silêncio, antes de o timer disparar. O self-test perdeu meia dúzia de execuções mudas por
causa disso até a causa aparecer. O teste agora mantém um `setTimeout` ref'd só para poder
observar o timeout acontecer, e o comentário no código explica o porquê.

Efeito colateral do mesmo diagnóstico: `process.exit()` com stdout em PIPE no Windows
trunca o que ainda não drenou, e um self-test que não imprime nada não serve para nada. O
self-test do runner usa `process.exitCode`.
⎿ commit acb8deb+dirty · 2 files changed, 448 insertions(+), 122 deletions(-)

## 2026-09-17 00:02 — [decisão] temperature fixada em 1 (default da API, comparavel com as 215 evidencias) e seed em 20260916

`temperature` FIXADA EM 1 e `seed` FIXADO EM 20260916, ambos explícitos no payload e
gravados na evidência. Overrides por `--temperature` e `--seed`.

Por que 1 e não 0, que seria o reflexo automático de "quero medir sem variância":

1. É o default da API, e portanto o regime sob o qual as 215 evidências já arquivadas
   foram geradas. Fixar em 1 torna rodada nova comparável com todo o histórico. Fixar em 0
   criaria uma quebra e jogaria fora a comparabilidade com o que já foi medido — o oposto
   do objetivo desta SPEC.
2. O próprio main.md registra o risco: temperatura baixa degrada a naturalidade da
   conversa, que é qualidade de produto. O parâmetro controlado vale para MEDIÇÃO, e o
   valor de PRODUÇÃO segue sendo decisão separada e ainda não tomada.
3. Na API do Groq, temperature 0 nem é 0: é convertida para 1e-8 (doc de compatibilidade
   OpenAI). Escolher 0 seria escolher um número que a API troca por outro.

Quem quiser decodificação quase gulosa passa `--temperature 0`. A flag existe e o valor
usado vai para a evidência, então a escolha nunca fica implícita.

Por que o seed é fixo E variável por flag: fixo, duas rodadas da mesma condição são
comparáveis (é o critério 6). Variável de propósito, N repetições com N seeds conhecidos
medem a variância residual sem perder reprodutibilidade de nenhuma delas. É o instrumento
que a SPEC-20260916-2048-tom-versus-pedagogia vai usar; esta SPEC entrega a flag e não
implementa nada daquela.

`configurarAmostragem` roda UMA vez no início e vale para a rodada inteira — dataset,
matriz, comparação e conversa. Deixar cada caminho escolher a sua daria evidência com
parâmetros diferentes dentro da mesma rodada, que é o defeito original.

Gravação: `amostragem.temperature`, `amostragem.seed` (pedidos),
`amostragem.seed_efetivo` (o `x_groq.seed` devolvido) e `amostragem.system_fingerprint`.
Os quatro juntos, porque a doc do Groq diz que o determinismo do seed morre quando o
fingerprint muda — sem ele, uma divergência entre rodadas fica sem explicação possível.
No caminho de conversa a amostragem é gravada POR TURNO, já que uma conversa pode
atravessar uma troca de backend no meio.
⎿ commit acb8deb+dirty · 2 files changed, 448 insertions(+), 122 deletions(-)

## 2026-09-17 00:03 — [blocker] Criterio 6 aberto: cota de tokens do Groq drenada, retry-after em 502s — repeticao 2 nao completou

Critério 6 NÃO evidenciado: "Duas execuções da mesma condição, com parâmetros fixados,
produzem resultado comparável — e a dispersão residual é reportada | evidence: manual
@allan". Fica ABERTO, e o usuário decide o que fazer com ele.

O que foi feito e o que travou:

- Repetição 1 executada com sucesso: 3 falas (`cafe-01`, `cafe-02`, `cafe-03`) com
  `temperature=1 seed=20260916`, gravadas em
  `evidence/openai_gpt-oss-20b/repeticao-1/`. A rodada exercitou o caminho de rate limit
  de verdade (`cafe-03`, 1 tentativa, 20s) e recuperou.
- Repetição 2 NÃO completou. O orçamento de tokens por minuto da ORGANIZAÇÃO está
  drenado: a primeira tentativa já voltou 429 e o `retry-after` do Groq subiu de 20s para
  502s. Duas execuções foram abortadas por tempo antes de qualquer turno gravar.
  Registros em `_failures/cafe-01-*.json` (3 arquivos), preservados de propósito.

Isto é limite de cota, não defeito do que a SPEC entrega. Os critérios 1-5 estão
carimbados e o instrumento está pronto: a amostragem é fixada e gravada, o retry de
geração funciona (provado no self-test, sem rede), o timeout dispara e o nome da falha
carrega a célula.

O que ainda falta, e é barato quando a cota voltar:

    bun scripts/eval/run.mjs --limit 3
    # mover os 3 .json para evidence/openai_gpt-oss-20b/repeticao-2/
    # comparar repeticao-1 com repeticao-2 campo a campo e reportar a dispersão

O `skip` por arquivo existente é o que obriga a mover a rodada anterior para uma
subpasta antes de repetir; as duas subpastas viram alvos separados no grader, que é
exatamente o desenho que `findEvidenceTargets` já suporta.

Uma observação metodológica que a leitura humana deve levar em conta: as evidências
antigas mostram que o Groq devolve `x_groq.seed` mesmo sem seed enviado, e agora
gravamos pedido e efetivo. Se a repetição 2 divergir da 1 com o mesmo seed, a primeira
coisa a olhar é o `system_fingerprint` — a doc do Groq diz que o determinismo do seed
morre quando ele muda, e nesse caso a divergência é do backend, não da amostragem.

R.6.2: nenhuma redução de escopo foi feita por conta própria. O critério continua `[ ]`.
⎿ commit 70233a0+dirty · 1 file changed, 5 insertions(+), 5 deletions(-)

## 2026-09-17 00:23 — [descoberta] seed NAO da reprodutibilidade no Groq: 7 de 9 campos divergiram com seed e fingerprint identicos

Duas execuções da MESMA condição, com os parâmetros fixados, e o resultado contraria a
leitura otimista do critério 6: a saída NÃO é reproduzível.

Condição idêntica nas duas repetições, verificada na própria evidência:
  temperature .......... 1 e 1
  seed pedido .......... 20260916 e 20260916
  seed EFETIVO ......... 20260916 e 20260916   (o Groq confirmou que usou o que pedimos)
  system_fingerprint ... fp_84bb35977d nas duas (mesmo backend)
  prompt ............... v5, mesma fala (`cafe-01`)

Dispersão residual: **7 dos 9 campos do turno divergiram.**

  reply_en        "Sure thing! Are you looking for a black coffee or something like a
                   latte?"  vs  "Sure! Would you like milk or sugar with your coffee?"
  reply_pt        idem, traduzido
  instruction_pt  "Escolha o tipo de café que deseja." vs "Como você gostaria de preparar
                   o café?"
  suggestion_en   "Black coffee, please." vs "I would like a coffee, please."
  suggestion_pt   idem
  words           ["black coffee","latte","espresso"] vs ["would you like","a coffee",
                   "please"]
  focus           "" vs "Use 'please' to make a polite request."

Só `corrections` e `next_action` bateram — e `corrections` bateu porque estava vazio nas
duas, o que é coincidência de caso de controle, não estabilidade demonstrada.

Custo também variou: 1.993 vs 2.161 tokens (completion 461 vs 629), ou seja +8,4% de
token na mesma condição.

O QUE ISSO SIGNIFICA, e é o achado que muda desenho:

A doc do Groq diz que `seed` é "best effort" e manda observar o `system_fingerprint` para
saber quando o determinismo deixou de valer. Aqui o fingerprint é IDÊNTICO e a saída
divergiu de todo modo. Então, para `openai/gpt-oss-20b` no Groq, seed não entrega
reprodutibilidade — nem com backend estável. A ressalva da doc não é teórica.

Consequência prática, e ela não é pequena: comparabilidade entre rodadas NÃO pode se
apoiar em seed. Ela tem de vir de REPETIÇÃO e medida agregada. Uma célula medida uma vez
não sustenta conclusão sobre diferença entre condições — foi exatamente a limitação que a
SPEC-20260916-1652 registrou como "diferença isolada não atribuível", e o instrumento novo
mostra que fixar o seed não a remove.

Isso afeta o desenho da SPEC-20260916-2048-tom-versus-pedagogia: a condição de controle por
repetição deixa de ser refinamento e passa a ser o único caminho. Não implementei nada
daquela SPEC aqui — só registro que a premissa mudou.

O que o instrumento DE FATO entregou, e vale:
- os parâmetros agora são conhecidos, fixados e gravados; "não sabíamos os parâmetros"
  deixou de ser ressalva possível;
- `seed_efetivo` e `system_fingerprint` na evidência permitem separar três causas que antes
  se confundiam numa só: parâmetro diferente, backend diferente, ou variância de
  amostragem. Nesta medição as duas primeiras foram ELIMINADAS por evidência, e é por isso
  que a terceira pôde ser afirmada.

R.6.2: NÃO marquei o critério 6. Ele pede "duas execuções da mesma condição, com
parâmetros fixados, produzem resultado comparável — e a dispersão residual é reportada". A
segunda metade está cumprida e documentada. A primeira depende de como o usuário lê
"comparável": comparável no sentido de que a comparação passou a ser possível e as causas
espúrias foram eliminadas, SIM; comparável no sentido de saída parecida, NÃO. A leitura é
dele, não minha.
⎿ commit 70233a0+dirty · 2 files changed, 47 insertions(+), 6 deletions(-)

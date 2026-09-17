# Journal — SPEC-20260916-2048

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-17 11:04
**Onde tô:** concluída — 6/6 critérios, depois de o critério 6 ser partido por decisão do usuário
**Próximo passo:** fechar (`close`); a comparabilidade segue na SPEC-20260917-1059-metodologia-de-repeticao
**Última decisão:** critério 6 migra para a SPEC nova (R.6.2, resposta "3" do usuário) — antes → depois no LOG
**Bloqueio atual:** nenhum
**Se retomar, ler:** main.md + as entradas `[descoberta]` (seed não reproduz) e `[nota]` (fingerprint muda por requisição)

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | Confirmar `temperature`/`seed` na doc viva do Groq | concluída | 2026-09-17 00:02 |
| 2 | Fixar amostragem no payload e gravar na evidência | concluída | 2026-09-17 00:03 |
| 3 | Retry in-process de `json_validate_failed` | concluída | 2026-09-17 00:03 |
| 4 | Timeout derivado do custo medido | concluída | 2026-09-17 00:03 |
| 5 | Registro de falha por CÉLULA | concluída | 2026-09-17 00:03 |
| 6 | Dispersão residual medida e reportada (comparabilidade migrou) | concluída | 2026-09-17 11:04 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
<!-- anti-alucinação por estrutura: separe o que é SABIDO (verificado no código/teste) do que é CHUTE (inferido) do que está EM ABERTO. Nunca trate inferência como fato. -->
- fato: `temperature` e `seed` são suportados pelo Groq — confirmado na referência viva da API, não por analogia com a OpenAI. `temperature` default 1, faixa 0-2; `seed` é "best effort" e a doc manda observar `system_fingerprint`.
- fato: `temperature: 0` é convertida para 1e-8 pelo Groq (página de compatibilidade OpenAI).
- fato: a evidência ARQUIVADA já trazia `x_groq.seed` — o Groq devolve o seed que usou mesmo sem receber um. As rodadas antigas eram reproduzíveis a posteriori e ninguém sabia.
- fato: `seed` fixo NÃO reproduz. Duas execuções de `cafe-01` com temperature, seed, `seed_efetivo` e `system_fingerprint` idênticos divergiram em 7 dos 9 campos, com +8,4% de token.
- fato: timeout de 30s derivado de 215 turnos gravados — parede máxima 2,91s, p99 2,39s, pior caso estimado de geração ~8,5s (3.433 tokens a 403 tok/s).
- fato: `--self-test` do runner passa com 0 falhas, sem rede, cobrindo classificação de falha, retry que recupera na 3ª geração, timeout que dispara, nome de célula e gravação de amostragem.
- fato: o retry de rate limit funcionou em produção nas duas rodadas reais (uma esperou 20s, outra 502s) e recuperou nas duas.
- inferência: o padrão de divergência sugere variância de amostragem pura, já que parâmetro e backend foram eliminados por evidência. Não testei com N>2 nem com `temperature` baixa.
- dúvida: com `temperature: 0` (1e-8 no Groq) a dispersão cairia? Não medido — e medir custa cota.

### Respostas-chave do usuário
- 2026-09-16: "A chave do Groq fica somente em `metodologia-de-eval`; as outras SPECs devem continuar executáveis offline." → `.env.local` copiado só para este worktree.
- 2026-09-16: "siga de forma autonoma!" → rodadas reais executadas sem confirmação a cada passo.
- 2026-09-17: "3" → das três saídas do R.6.2 para o critério 6, o usuário escolheu SPEC nova. Criada a SPEC-20260917-1059-metodologia-de-repeticao; `tom-versus-pedagogia` passou a depender dela.

### Tentativas que falharam
- `process.exit()` no fim do self-test: com stdout em PIPE no Windows, trunca tudo e o teste rodava mudo, com código 0. Trocado por `process.exitCode`.
- Dublê de timeout que só espera o `abort`: `AbortSignal.timeout` usa timer UNREF, então o node esvaziava a fila e SAÍA com código 0 antes de o timeout disparar. Resolvido com um `setTimeout` ref'd só para o teste poder observar.
- Dublê sem headers de rate limit: `Number(null)` é 0, então `throttleByTokenBudget` dormia 20s dentro do self-test. Resolvido pondo headers realistas no dublê — o comportamento do runner NÃO foi alterado (fora de escopo, registrado como gotcha).
- Repetição 2 abortada duas vezes por cota da organização drenada, com `retry-after` de 502s. Concluída depois, em background, com `--limit 1`.

### Arquivos tocados
- `scripts/eval/run.mjs` — amostragem, timeout, classificação e retry de `json_validate_failed`, falha por célula, `--self-test`, flags `--temperature`/`--seed`.
- `docs/features/avaliacao.md` — DEC-20260917-0002, DEC-20260917-0003 e 3 gotchas.
- `docs/features/dialogo.md` — DEC-20260917-0004.
- Evidência: `evidence/openai_gpt-oss-20b/repeticao-1/` (3 falas) e `repeticao-2/` (1 fala), mais 4 registros em `_failures/`.

### Onde parei
6/6 carimbados. O critério 6 foi partido ao meio por decisão do usuário no fluxo R.6.2
(resposta "3"): a dispersão medida e reportada ficou aqui, a comparabilidade virou a
SPEC-20260917-1059-metodologia-de-repeticao. Falta só o `close`.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-16 23:23→2026-09-17 00:24 — ativação, doc viva do Groq, as 5 fases de instrumento, duas rodadas reais e a medição da dispersão.

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

## 2026-09-17 11:01 — [decisão] Criterio 6 migra para a SPEC-20260917-1059-metodologia-de-repeticao (antes -> depois, citacao do usuario)

Mudança de CONTRATO no critério 6, com validação humana explícita. O usuário escolheu, no
fluxo R.6.2, a opção "3. SPEC nova para a metodologia de repetição, e este critério migra
para ela" — resposta literal: "3", às três opções que eu apresentei em 2026-09-17:

  1. Aceitar o gap (marcador [aceito-incompleto: ...])
  2. Medir mais antes (--temperature 0 e N>2)
  3. SPEC nova para a metodologia de repetição, e este critério migra para ela

ANTES:
  - [ ] Duas execuções da mesma condição, com parâmetros fixados, produzem resultado
        comparável — e a dispersão residual é reportada | evidence: manual @allan

DEPOIS:
  - [ ] Duas execuções da mesma condição, com parâmetros fixados, têm a dispersão residual
        MEDIDA e reportada — a comparabilidade em si migrou para a
        SPEC-20260917-1059-metodologia-de-repeticao | evidence: manual @allan

O que mudou, exatamente: o critério tinha DUAS metades e só uma foi entregue.

  (a) "a dispersão residual é reportada" — ENTREGUE. Duas execuções de `cafe-01` com
      temperature 1, seed 20260916, seed_efetivo confirmado e system_fingerprint idêntico
      (fp_84bb35977d): 7 dos 9 campos divergiram, +8,4% de token. Está medido, documentado
      na entrada [descoberta] deste journal e registrado como gotcha em
      docs/features/avaliacao.md.
  (b) "produzem resultado comparável" — NÃO entregue, e agora se sabe POR QUE: `seed` não
      reproduz no Groq. Isso não é lacuna de execução desta SPEC, é achado dela. Construir
      comparabilidade sobre repetição e medida agregada é trabalho próprio, com N,
      critério de suficiência e orçamento de tokens — e virou a
      SPEC-20260917-1059-metodologia-de-repeticao, criada em future/ e no DAG do programa
      emma.

O que esta SPEC continua devendo, e é o que o critério pede agora: nada além do que já
está no disco. A dispersão está medida e reportada. Por isso o critério pode ser
evidenciado sem redução silenciosa de escopo — a parte não entregue saiu do contrato POR
DECISÃO DO USUÁRIO e tem endereço, não sumiu.

Efeito colateral no DAG, registrado no commit 9e8bd72 em main:
`SPEC-20260916-2048-tom-versus-pedagogia` passou a depender da SPEC nova em vez desta,
porque a condição de controle por repetição deixou de ser refinamento e passou a ser o
único caminho para o desenho dela. É uma aresta reversível em uma linha.

R.6.2 respeitado: nenhum critério foi aceito incompleto, e nenhuma redução de escopo
partiu de mim.
⎿ commit 49fa776+dirty · 1 file changed, 1 insertion(+), 1 deletion(-)

## 2026-09-17 11:04 — [nota] repeticao-3 preservada; system_fingerprint muda por REQUISICAO (6 distintos em 7 chamadas)

Material extra, preservado como `repeticao-3/`, e um detalhe que reforça o achado.

Origem: a rodada `--limit 3` que eu havia abortado por tempo continuou viva como processo
órfão e terminou de gravar antes de eu matá-la. São 3 turnos válidos e completos, com o
mesmo `seed: 20260916` e `seed_efetivo` confirmado. Não apaguei: é amostra legítima da
mesma condição, e a invariante desta SPEC proíbe descartar ocorrência gravada. Mas também
NÃO refiz a análise de dispersão em cima dela — o critério já estava medido e reportado, e
refazer no fechamento seria mudar o número de referência na última hora. Fica como
material para a SPEC-20260917-1059-metodologia-de-repeticao.

O detalhe novo: o `system_fingerprint` NÃO é estável entre chamadas.

  repeticao-1/cafe-01 -> fp_84bb35977d
  repeticao-1/cafe-02 -> fp_1074f9ce08
  repeticao-1/cafe-03 -> fp_e23fc997ca
  repeticao-2/cafe-01 -> fp_84bb35977d
  repeticao-3/cafe-01 -> fp_a4315eb300
  repeticao-3/cafe-02 -> fp_24bfb4a850
  repeticao-3/cafe-03 -> fp_4f7e7dc26e

Sete chamadas, seis fingerprints distintos. O backend roda por requisição, não por rodada.

Isso não enfraquece a medição da dispersão — fortalece. O par que sustentou o achado
(`repeticao-1/cafe-01` e `repeticao-2/cafe-01`) caiu, por sorte, no MESMO fingerprint
`fp_84bb35977d`. Ou seja: mesmo seed, mesmo backend, e a saída divergiu em 7 dos 9 campos.
A causa "o backend mudou" foi eliminada por evidência naquele par específico, e é
justamente por isso que a variância de amostragem pôde ser afirmada.

E acrescenta uma consequência prática para a SPEC nova: a estratégia que a doc do Groq
sugere — acompanhar `system_fingerprint` para saber quando o determinismo deixou de valer —
não é utilizável como controle aqui, porque o fingerprint muda quase sempre. Esperar por
"mesmo fingerprint" para comparar duas rodadas significaria descartar a maior parte das
amostras.
⎿ commit 94882f7+dirty · 2 files changed, 49 insertions(+), 2 deletions(-)

## 2026-09-17 11:04 — [conclusão] Instrumento de medicao fechado: amostragem controlada, retry de geracao, timeout derivado, falha por celula

O instrumento de medição deixou de ter três buracos, e o quarto virou achado com endereço
próprio.

Entregue em `scripts/eval/run.mjs`, sem tocar o produto:

- AMOSTRAGEM CONTROLADA. `temperature: 1` e `seed: 20260916` explícitos no payload,
  resolvidos UMA vez por rodada (`configurarAmostragem`) para não haver evidência com
  parâmetros diferentes dentro da mesma rodada. Gravados na evidência junto de
  `seed_efetivo` (o `x_groq.seed` que o Groq devolve) e `system_fingerprint`. Suporte
  confirmado na referência viva da API, não por analogia com a OpenAI. Flags
  `--temperature`/`--seed` para variar de propósito, com o valor sempre na evidência.
  Temperature 1 e não 0 por três razões: é o regime das 215 evidências arquivadas, o
  main.md declarava o risco de temperatura baixa degradar naturalidade, e o Groq converte
  0 para 1e-8 de todo modo.
- RETRY DE GERAÇÃO. `json_validate_failed` (HTTP 400 com esse `code`) passou a ser
  classificado como falha de GERAÇÃO e recebe retry in-process imediato, teto 3, com
  orçamento SEPARADO do rate limit (teto 6, com backoff, porque ali há o que refilar).
  Cumpre o que a DEC-20260916-0311 previa desde sempre e nunca teve implementação no
  runner: antes, um 400 desses parava a rodada inteira.
- TIMEOUT DERIVADO. 30s via `AbortSignal.timeout`, tirado de dado, não arbitrado: nas 215
  evidências com `usage`, a parede máxima foi 2,91s (p99 2,39s) e o pior caso estimado de
  geração ~8,5s (3.433 tokens no throughput p1 de 403 tok/s). É ~10x o pior caso observado
  e curto o bastante para matar a conexão pendurada que travou a matriz por ~15 minutos.
- FALHA POR CÉLULA. O nome do arquivo em `_failures/` carrega a célula
  (`fala-nNivel-tom`), e a falha grava `celula`, `nivel` e `amostragem` em campos próprios.
  Antes, duas células da mesma fala gravavam com o mesmo prefixo e a métrica de
  confiabilidade não sabia qual geração falhou nem qual recuperou.
- SELF-TEST SEM REDE. `--self-test` com 15 asserções e `fetchImpl`/`timeoutMs` injetáveis:
  classificação de falha, retry que recupera na 3ª geração, timeout que dispara, nome de
  célula e gravação de amostragem. Prova o que a rodada real não pode provar sem queimar
  cota.

O retry de rate limit foi exercitado em PRODUÇÃO nas duas rodadas reais — uma esperou 20s,
outra 502s — e recuperou nas duas.

O achado que vale mais que o código: com temperature, seed, `seed_efetivo` e
`system_fingerprint` IDÊNTICOS, duas execuções de `cafe-01` divergiram em 7 dos 9 campos,
com +8,4% de token. `seed` não reproduz no Groq, e a ressalva da doc ("best effort") não é
teórica. Comparabilidade entre rodadas tem de vir de REPETIÇÃO e medida agregada — uma
célula medida uma vez não sustenta conclusão sobre diferença entre condições.

Isso só pôde ser AFIRMADO porque o instrumento eliminou as outras duas causas por
evidência: parâmetro diferente e backend diferente. Antes, as três se confundiam numa
ressalva única. É o resultado mais útil da SPEC, e é negativo.

O critério 6 foi partido ao meio por decisão do usuário no fluxo R.6.2 (resposta "3"): a
dispersão medida e reportada fica aqui; construir a comparabilidade virou a
SPEC-20260917-1059-metodologia-de-repeticao, já em future/ e no DAG. Como efeito,
`tom-versus-pedagogia` passou a depender dela em vez desta.

Fora de escopo e NÃO corrigido, registrado como gotcha: `throttleByTokenBudget` lê header
de cota ausente como zero (`Number(null)`) e dorme 20s por turno em silêncio. Descobri
pelo self-test; consertar não é desta SPEC.
⎿ commit 94882f7+dirty · 2 files changed, 86 insertions(+), 2 deletions(-)

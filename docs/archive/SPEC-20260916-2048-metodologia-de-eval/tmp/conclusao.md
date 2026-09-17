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

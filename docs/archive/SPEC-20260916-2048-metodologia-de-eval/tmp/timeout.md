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

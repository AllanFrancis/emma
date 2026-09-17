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

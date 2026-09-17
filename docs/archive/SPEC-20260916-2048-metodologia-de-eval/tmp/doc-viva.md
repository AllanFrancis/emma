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

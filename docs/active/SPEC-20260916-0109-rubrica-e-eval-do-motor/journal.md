# Journal — SPEC-20260916-0109

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-16 02:01
**Onde tô:** 34 turnos gravados com prompt v3 (20b n=19, 120b n=15); C7 do grader tinha bug e foi consertado. Sem vencedor limpo entre os modelos ainda.
**Próximo passo:** completar as rodadas até igualar n e cobrir `small-talk` e `livre` (TPM rende ~5–9 por vez, `run.mjs` retoma sozinho); só então o relatório do critério 6.
**Última decisão:** prompt v3 com distinção em 3 vias (atrapalha / padrão sistemático / só mais idiomático); baselines v1 e v2 preservados em `evidence/_baseline-prompt-v*`.
**Bloqueio atual:** nenhum — `GROQ_API_KEY` só é necessária a partir da rodada real (fase 5)
**Se retomar, ler:** main.md desta SPEC + `.scratch/prototipo/_decoded/app-inline-1.html` (protótipo decodificado)

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | Rubrica de nível 1–5 (5 critérios, descritores observáveis, evidência obrigatória) | concluído | 2026-09-16 01:21 |
| 2 | Contrato do turno (8 campos) como JSON Schema | concluído | 2026-09-16 01:21 |
| 3 | Dataset ≥40 falas com erros típicos de interferência do português | concluído | 2026-09-16 01:30 |
| 4 | `validate.mjs` — validação estrutural sem gastar API | concluído | 2026-09-16 01:30 |
| 5 | `run.mjs` + rodada real contra ≥2 modelos | em progresso | 2026-09-16 02:01 |
| 6 | `grade.mjs` + relatório comparativo + recomendação | em progresso | 2026-09-16 02:01 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
- fato: protótipo = 74KB de JS vanilla, `FLOW` com as 21 telas, contrato de 8 campos, `QUOTA = 8`, chave no browser e JSON por fatiamento de chaves — detalhe completo em `docs/features/dialogo.md`.
- fato: Groq suporta `response_format: {type:"json_schema", strict:true}` — adesão garantida ao schema (docs console.groq.com/docs/structured-outputs).
- fato: limites de token do Groq são aplicados no nível da ORGANIZAÇÃO, não por chave — rodízio de chaves na mesma conta não rende cota.
- fato: Groq — TTS só `orpheus-v1-english`/`orpheus-arabic-saudi` (SEM português); STT `whisper-large-v3`/`-turbo` aceita `language` e timestamps por palavra.
- fato: custo MEDIDO no `gpt-oss-20b` — 1.065 tokens/turno (667 prompt + 398 completion, 249 deles de raciocínio), coerente com a estimativa anterior de ~1.750.
- dúvida: qual modelo aberto do Groq sustenta os 9 critérios — é exatamente o que esta SPEC responde.
- RESOLVIDA: o dataset cobre 4 contextos (cafe=12, hotel=12, small-talk=12, livre=9), antecipando as 2 missões não escritas. Os cenários vieram do prompt original do usuário ("pedir um café, check-in de hotel, puxar conversa"), não foram inventados.
- fato: 17 das 45 falas (38%) são casos de controle sem nada a corrigir — é o que permite medir sobre-correção, o principal modo de falha que o usuário nomeou.
- fato: catálogo vivo tem 13 modelos e só 3 conversacionais — `gpt-oss-20b`, `gpt-oss-120b`, `qwen3.8-27b`; `kimi-k2-instruct` da doc dá 404. `qwen` esgota rate limit na 2ª chamada.

### Respostas-chave do usuário
- Protótipo é normativo para FLOW, QUESTIONS, NARRATION, MISSIONS, contrato dos turnos, estados e cota; **não** normativo para layout, tipografia, cor, componentes e ilustrações.
- Stack mantida: TanStack Start + React + Tailwind/shadcn, web com PWA em vista; Postgres (Neon) só quando houver persistência de verdade — sem banco na Fase 1.
- "Emma" é nome provisório: marca, domínio e disponibilidade ainda não validados.
- Nível NÃO pode ser heurística nem pergunta solta ao modelo: rubrica com critérios e evidências, e que evolua com o uso.
- Cota = 8 turnos de IA por usuário por dia, renovação diária, fuso resolvido no backend, valor nunca hardcoded na arquitetura.
- Sobre voz: não afirmar que o áudio nunca sai do dispositivo; informar que o reconhecimento pode processar áudio em serviço externo do navegador.
- Provedor: Groq, tier gratuito, conta única (opção b). Rodízio de 6 chaves foi descartado.

### Tentativas que falharam
- `specctl new ... --owner @allan` no PowerShell: `@allan` sem aspas é operador de array/splatting e foi consumido pelo shell, gravando `Owner: --features` no main.md e no claim. Corrigido à mão; usar aspas em argumentos com `@`.

### Arquivos tocados
- `docs/TAXONOMY.md` (áreas `dialogo` e `avaliacao`), `docs/features/dialogo.md`, `docs/features/avaliacao.md` — coordenação, em main
- `docs/active/SPEC-20260916-0109-rubrica-e-eval-do-motor/{main.md,journal.md}`, `docs/claims/SPEC-20260916-0109-rubrica-e-eval-do-motor.md`, `docs/programs/emma.md`
- `scripts/eval/rubric.md`, `scripts/eval/turn-schema.json` — fases 1 e 2
- `scripts/eval/dataset.jsonl` (45 falas), `scripts/eval/validate.mjs` — fases 3 e 4
- `scripts/eval/run.mjs`, `scripts/eval/grade.mjs` — fases 5 e 6 (código pronto; rodada real pendente)

### Onde parei
20b: C4 88% · C5 91% · C7 89% (2 instruções saíram em inglês). 120b: C4 67% · C5 100% · C7 100%, mas 1 chamada morreu com `json_validate_failed`. Falta igualar n, cobrir `small-talk`/`livre` e a leitura humana.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-16 01:09 — init do sistema v4, dissecação do protótipo, 8 decisões de produto, abertura desta SPEC.
- 2026-09-16 01:34 — fases 1–4 concluídas, 5–6 com código verde; 6 artefatos em `scripts/eval/`; commits `43aee0f` e `7ff2961`.

## LOG (append-only — NUNCA editar entradas antigas)
<!-- tipos: ativação descoberta decisão tentativa blocker unblock refactor nota conclusão | entrada nova: specctl log -->

## 2026-09-16 01:09 — [ativação] SPEC criada e ativada (--features, branch feature/rubrica-e-eval-do-motor, base main)

## 2026-09-16 01:11 — [nota] Correcao de registro: a entrada de ativacao gravou '--features' no lugar do owner. Causa: no PowerShell, @allan sem aspas e operador de array e foi consumido pelo shell, entao o specctl leu --features como valor de --owner. Owner correto: @allan. Features corretas: dialogo, avaliacao. main.md e claim corrigidos a mao; a entrada de ativacao fica como esta (append-only).

⎿ commit 3a47ed2+dirty · 1 file changed, 2 insertions(+), 5 deletions(-)

## 2026-09-16 01:18 — [decisão] Manifesto docs/programs/emma.md criado dentro da branch da SPEC, nao em PR dedicado. Desvio consciente de rules/programs.md (single-writer via PR dedicado), justificado por team: solo no manifesto - nao ha outro dev com quem coordenar, e separar exigiria commit na main so para uma linha. Decisao do usuario: 'Tudo na branch, uma PR so'. Se o repo virar multi-dev, o manifesto volta a ser editado por PR proprio.

⎿ commit 3a47ed2+dirty · 2 files changed, 6 insertions(+), 6 deletions(-)

## 2026-09-16 01:21 — [decisão] Rubrica fechada com 4 decisoes de projeto: (1) nivel final e MEDIANA dos criterios, nao media - media premia quem tem vocabulario e nao fala, que e o perfil que o produto existe para consertar; (2) teto de producao: se sustentacao de conversa ficar 2+ niveis abaixo da mediana, o nivel cai 1; (3) promocao exige 2 reavaliacoes consecutivas e rebaixamento exige 3 - assimetria proposital, dia ruim nao pode rebaixar aluno porque confianca e o ativo mais fragil aqui; (4) N4 e N5 compartilham a faixa exibida 'Conversa solta', preservando LADDER[min(3, levelNum()-1)] do prototipo, que e normativo para comportamento. Criterio sem amostra recebe null + 'amostra insuficiente', nunca chute. RISCO ABERTO: maxItems no words pode nao ser suportado pelo strict mode do Groq - confirmar na fase 5 e, se recusar, mover o limite de 3 para o validate.mjs.

⎿ commit 43aee0f

## 2026-09-16 01:28 — [nota] verify: 2/4 critérios passaram (commit `43aee0f`)

- PASS: Dataset com ≥40 falas versionado e estruturalmente válido |…
- PASS: Contrato do turno em JSON Schema, com additionalProperties …
- FAIL: Runner executa o dataset contra ≥2 modelos e persiste as sa…
- FAIL: Checagens mecânicas dos 9 critérios implementadas e verdes …

## 2026-09-16 01:31 — [nota] verify: 2/2 critérios passaram (commit `43aee0f`)

- PASS: Runner executa o dataset contra ≥2 modelos e persiste as sa…
- PASS: Checagens mecânicas dos 9 critérios implementadas e verdes …

## 2026-09-16 01:35 — [nota] Fases 3 a 6: dataset.jsonl (45 falas em 4 contextos, 17 casos de controle), validate.mjs, run.mjs e grade.mjs escritos e exercitados sem gastar cota - validate 0/0, run --dry monta 45 payloads, grade --self-test 5 casos e 10 checagens sem falha. specctl verify carimbou 4 dos 6 criterios. DECISAO: evidence/ vive na pasta da SPEC (formats.md secao 9), nao em scripts/; o run.mjs descobre o caminho varrendo docs/active em vez de hardcodear o id. Commitado em 7ff2961. close --dry: NAO pronto, faltam criterios 1 e 6 (ambos evidence: manual) - nao registrei conclusao no LOG nem marquei R.7 nas features porque seria declarar entregue uma SPEC em voo. RISCOS ABERTOS: (a) os model ids moonshotai/kimi-k2-instruct e openai/gpt-oss-20b vieram dos exemplos da doc do Groq e nao foram confirmados contra o catalogo vivo; (b) maxItems no campo words pode ser recusado pelo strict mode.

⎿ commit 7ff2961+dirty · 1 file changed, 2 insertions(+), 1 deletion(-)

## 2026-09-16 01:44 — [descoberta] Primeira rodada real. (1) Criterio 1 aprovado pelo usuario, citacao literal: 'scripts/eval/rubric.md: tudo certo'. (2) RISCO (a) RESOLVIDO e materializado: moonshotai/kimi-k2-instruct da 404 model_not_found; o catalogo vivo (GET /openai/v1/models) tem 13 entradas e so 3 sao conversacionais - openai/gpt-oss-20b, openai/gpt-oss-120b, qwen/qwen3.8-27b. CANDIDATOS do run.mjs corrigido. (3) RISCO (b) RESOLVIDO: o strict mode do Groq aceitou maxItems; contrato de 8 campos respeitado, JSON valido. Limite de 3 NAO precisa migrar para o validate.mjs. (4) qwen/qwen3.8-27b bate rate limit na 2a chamada (3s, 30s, esgota) enquanto gpt-oss-20b passa com 999 req restantes - qwen e inviavel no tier gratuito para rodadas de 45 falas. (5) ACHADO PRINCIPAL: C4 (nao corrigir caso de controle) ficou em 50% no gpt-oss-20b e 0% no qwen. Ambos corrigiram 'Coffee.' (N1, comunica e resolve a situacao). Mas o gpt-oss-20b DEIXOU PASSAR a frase perfeita do cafe-03 - ou seja, nao corrige as cegas. Leitura: os modelos nao estao ensinando demais, estao ROTEANDO o ensino para o campo errado - o upgrade de fraseado pertence a suggestion_en, nao a correction_pt. Isso e ajustavel por prompt, nao e veredito de qualidade do modelo. (6) Custo real medido: 1065 tokens por turno (667 prompt + 398 completion, 249 deles de raciocinio), coerente com a estimativa de ~1750 registrada antes.

⎿ commit ffe0ac0+dirty · 2 files changed, 6 insertions(+), 4 deletions(-)

## 2026-09-16 01:49 — [decisão] Ajuste de prompt aprovado pelo usuario ('Ajustar o prompt, depois rodar 45x2') e CONFIRMADO em teste de 3 falas. Acrescentei ao system prompt uma regra de ROTEAMENTO: correction_pt e so para o que atrapalha a comunicacao ou soa errado a nativo; se o aluno se comunicou bem e existe forma mais natural, isso vai em suggestion_en. Antes: cafe-01 ('Coffee.') recebia correcao 'em vez de Coffee, diga I would like a coffee'. Depois: correction_pt VAZIA e suggestion_en = 'I'd like a coffee, please.' - que e inclusive a forma do roteiro normativo do prototipo, nao o 'I would like' que saia antes. Isso NAO viola o prototipo como normativo: a regra dele ja dizia 'so quando melhorarem a comunicacao'; eu apenas explicitei em qual campo cada coisa vai. As 5 evidencias do prompt antigo foram MOVIDAS para evidence/_baseline-prompt-v1/ (nunca apagadas, R.5) porque o run.mjs pula arquivo existente e misturaria dois prompts no mesmo diretorio, corrompendo a comparacao em silencio. grade.mjs passou a ignorar pastas com prefixo _ para nao contar baseline como modelo. Decidido rodar 20b e 120b em SEQUENCIA, nao em paralelo: os limites do Groq sao por organizacao, entao rodadas simultaneas competiriam pela mesma cota.

⎿ commit ffe0ac0+dirty · 4 files changed, 22 insertions(+), 12 deletions(-)

## 2026-09-16 01:51 — [descoberta] Rodada com prompt v2 parou em cafe-11 nos DOIS modelos por limite de TOKENS por minuto (requisicoes seguiam em 990/999) - o teto do tier gratuito e TPM, nao RPD, e e por organizacao. Sobrou subconjunto identico cafe-01..10 nos dois. Tabela: C4 (nao corrigir controle) subiu para 100% no 120b e 75% no 20b, mas C5 (corrigir quando ha o que corrigir) CAIU para 50% e 67%. Diagnostico: EU exagerei no prompt v2. Os modelos obedeceram a regra nova; o problema e a regra. Casos perdidos: cafe-02 ('I want a coffee' - gramaticalmente perfeito, so menos idiomatico: os dois rotearam para suggestion_en, e o 20b sugeriu 'I'd like a coffee, please.', a forma correta), cafe-08 (some/any) e cafe-10 ('do a check-in', decalque do portugues, erro sistematico - silenciar aqui e falha real). CONFLITO IDENTIFICADO entre dois artefatos meus: o dataset rotula cafe-02 como corrigivel e o prompt v2 manda tratar como sugestao. O PROTOTIPO DESEMPATA CONTRA O PROMPT: o roteiro normativo da missao do cafe corrige exatamente esse caso ('Em vez de I want a coffee, diga I'd like a coffee'). Faltava ao prompt uma distincao em tres vias: (a) atrapalha a comunicacao -> corrigir sempre; (b) comunica mas revela padrao sistematico (decalque, falso cognato, estrutura) -> corrigir; (c) comunica e so existe forma mais idiomatica sem padrao por tras -> sugerir. RISCO METODOLOGICO REGISTRADO: esta seria a 3a iteracao de prompt sobre as mesmas 10 falas; iterar assim ate a tabela ficar verde e overfitting do prompt aos meus proprios rotulos, nao medicao de qualidade. Decisao levada ao usuario.

⎿ commit ffe0ac0+dirty · 4 files changed, 26 insertions(+), 12 deletions(-)

## 2026-09-16 01:55 — [blocker] RISCO DE PRODUCAO descoberto na rodada v3: o Groq devolveu HTTP 400 code=json_validate_failed em openai/gpt-oss-120b (fala cafe-01), mensagem 'Failed to generate JSON. Please adjust your prompt.' com o texto truncado em failed_generation. Ou seja: o strict mode NAO e garantia absoluta - quando o modelo nao consegue produzir JSON conforme o schema, a API retorna ERRO em vez de resposta reparada. Em producao isso e um turno que falha na cara do aluno, e o app precisa de fallback explicito (retry com temperatura menor, ou cair no scriptedTurn roteirizado do prototipo, que ja existe e nao gasta API). Nao e hipotese: aconteceu em 1 de 10 chamadas no 120b. O 20b nao apresentou o problema nas chamadas ate agora. Isso entra no relatorio final como requisito de arquitetura da Fase 1, nao como curiosidade do eval.

⎿ commit ffe0ac0+dirty · 4 files changed, 30 insertions(+), 12 deletions(-)

## 2026-09-16 01:58 — [tentativa] BUG NO MEU PROPRIO MEDIDOR, achado por desconfianca do numero antes de reportar. A checagem C7 (instrucao em portugues) usava uma regex de acento + 9 palavras funcionais e reprovava portugues legitimo sem acento. Dos 3 casos reprovados, 2 eram FALSO POSITIVO: 120b cafe-02 'Use a frase mais educada: I'd like a coffee, please.' e 120b cafe-10 'Responda dizendo seu nome e confirmando que deseja fazer o check-in.' - ambos portugues correto. Os percentuais de C7 (79% e 87%) estavam errados PARA BAIXO. Substitui por deteccao por contagem: acento OU >=2 marcadores de portugues OU >=1 marcador sem nenhum marcador de ingles. VIOLACAO REAL confirmada no terceiro caso: 20b cafe-06 respondeu 'Use a question word order: verb before subject. Ex: How can I pay?' - instrucao inteiramente em INGLES e em jargao gramatical, violando o requisito central de bilinguismo (toda instrucao e explicacao em portugues). Licao: numero de grader proprio so vale depois de olhar os casos que ele reprovou; eu quase reportei um requisito central medido errado.

⎿ commit ffe0ac0+dirty · 4 files changed, 49 insertions(+), 13 deletions(-)

## 2026-09-16 02:01 — [descoberta] C7 corrigido e reverificado: self-test 0 falhas, e a previsao manual bateu (120b 15/15 = 100%). O 20b deu 89%, nao os 95% que eu previa - 2 falhas em 19, nao 1, porque minha inspecao manual so cobrira os 10 primeiros arquivos. As DUAS sao reais: cafe-06 'Use a question word order: verb before subject' e hotel-05 'Use am instead of have to indicate your age and include years old' - instrucoes inteiramente em INGLES, justamente ao explicar gramatica. QUADRO ATUAL (n diferente, nao e empate direto): 20b n=19 -> C4 88%, C5 91%, C7 89%. 120b n=15 -> C4 67%, C5 100%, C7 100%. LEITURA: nao ha vencedor limpo. O 20b sobre-corrige menos; o 120b nao violou bilinguismo nenhuma vez e corrige sempre que precisa. Como o usuario classificou bilinguismo como requisito CENTRAL e nao opcional, a vantagem do 120b pesa mais do que a tabela sugere a primeira vista. Antes de recomendar qualquer modelo falta: (a) igualar o n dos dois, (b) cobrir small-talk e livre, que nenhum dos dois alcancou ainda, (c) leitura humana dos criterios subjetivos. Nao ha recomendacao ate la.

⎿ commit ffe0ac0+dirty · 4 files changed, 54 insertions(+), 14 deletions(-)

# Journal — SPEC-20260916-0109

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-16 03:48
**Onde tô:** entrega completa, critérios 6/6 evidenciados e revisão final APROVADA COM OBSERVAÇÕES.
**Próximo passo:** executar `close --dry` e, com os gates verdes, `close`.
**Última decisão:** `gpt-oss-20b` aprovado pelo usuário para a Fase 1; recomendação sustentada por 90 respostas válidas e leitura humana.
**Bloqueio atual:** nenhum.
**Se retomar, ler:** `main.md`, `relatorio.md` e `6_task_review.md` desta SPEC.

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | Rubrica de nível 1–5 (5 critérios, descritores observáveis, evidência obrigatória) | concluído | 2026-09-16 01:21 |
| 2 | Contrato do turno (8 campos) como JSON Schema | concluído | 2026-09-16 01:21 |
| 3 | Dataset ≥40 falas com erros típicos de interferência do português | concluído | 2026-09-16 01:30 |
| 4 | `validate.mjs` — validação estrutural sem gastar API | concluído | 2026-09-16 01:30 |
| 5 | `run.mjs` + rodada real contra ≥2 modelos | concluído | 2026-09-16 02:09 |
| 6 | `grade.mjs` + relatório comparativo + recomendação | concluído | 2026-09-16 03:47 |

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
- `scripts/eval/run.mjs`, `scripts/eval/grade.mjs`, `relatorio.md`, `evidence/` (90 turnos + baselines) — fases 5 e 6
- `scripts/eval/turn-validator.mjs`, `6_task_review.md` — validação integral do contrato e parecer final da fase 6

### Onde parei
45/45 nos dois. 20b: C4 88 · C5 86 · C7 89. 120b: C4 71 · C5 96 · C7 93. Usuário aprovou os quatro critérios subjetivos e a recomendação; revisão final aprovada com observações após três ciclos.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-16 01:09 — init do sistema v4, dissecação do protótipo, 8 decisões de produto, abertura desta SPEC.
- 2026-09-16 01:34 — fases 1–4 concluídas, 5–6 com código verde; 6 artefatos em `scripts/eval/`; commits `43aee0f` e `7ff2961`.
- 2026-09-16 03:47 — aceite humano registrado; medidor reforçado após 3 ciclos de review; fase 6 concluída e pronta para fechamento.

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

## 2026-09-16 02:09 — [nota] Rodadas COMPLETAS: 45/45 nas duas, mesmo dataset e mesmo prompt v3, n identico - agora a comparacao e legitima. TABELA FINAL: 20b -> C2 98, C4 88, C5 86, C7 89, C8 84. 120b -> C2 100, C4 71, C5 96, C7 93, C8 84. C1/C3/C6/C9/C10 em 100% nos dois. O trade-off visto com 10 falas se confirmou com 45: o 20b peca por OMISSAO (deixa erro passar) e o 120b por EXCESSO (corrige quem nao errou). Confiabilidade: 2 ocorrencias de json_validate_failed no 120b (cafe-01 e talk-01) contra ZERO no 20b - em producao cada uma seria um turno morto na cara do aluno. Custo: TPM do tier gratuito rendeu entre 3 e 13 chamadas por ciclo; foram necessarios ~10 ciclos para 90 chamadas. Falta so o critério 6: escrever o relatorio e o usuario ler as evidencias para julgar os 5 criterios subjetivos, que nenhuma checagem mecanica alcanca.

⎿ commit 4e7525c

## 2026-09-16 02:10 — [decisão] RECOMENDACAO: openai/gpt-oss-20b para a Fase 1. Relatorio completo em relatorio.md. A tabela mecanica favorece o 120b em C5 (96 vs 86) e C7 (93 vs 89), mas o CONTEUDO das falhas inverte a leitura: as sobre-correcoes do 120b incluem corrigir a MAIUSCULA de 'english' em 'Sorry, my english is very bad' e em 'I don't know how to say this in english', e corrigir 'can you repeat please' de um aluno que acabou de dizer que nao entendeu. Corrigir grafia num app de conversa FALADA e irrelevante por definicao, e corrigir quem expressou vergonha do proprio ingles e o oposto de 'fluencia antes de perfeicao'. As omissoes do 20b (auxiliar ausente em 'What you do?', 'work with marketing', falso cognato 'doubt') sao falhas de ENSINO, nao de tato: aluno nao corrigido aprende devagar, aluno corrigido na hora errada desiste. Somando: 20b erra para o lado certo, teve ZERO falhas de contrato contra 2 json_validate_failed do 120b, e e mais barato e mais rapido sob o teto de TPM. O deficit de C5 do 20b e o mais atacavel por prompt - a propria evolucao v1->v2->v3 provou que esse numero se move por instrucao. RECOMENDACAO NAO FECHA O ASSUNTO: vale para a Fase 1; se a leitura humana achar o 20b raso, o 120b volta com prompt que proiba correcao de grafia. DOIS REQUISITOS DE ARQUITETURA caem na Fase 1 a partir daqui: (1) fallback obrigatorio para json_validate_failed, caindo no scriptedTurn do prototipo, turno nunca morre na tela; (2) o prompt precisa declarar que a entrada e FALA TRANSCRITA, senao o modelo corrige maiuscula e pontuacao que nao existem em conversa.

⎿ commit 4e7525c+dirty · 1 file changed, 5 insertions(+), 1 deletion(-)

## 2026-09-16 02:12 — [nota] Fecho de sessao. Relatorio e as 90 evidencias commitados; lint 0/0 guardou o commit (encadeado com &&). close --dry: 4 bloqueios, e TRES deles sao consequencia do primeiro - criterio 6 (evidence: manual @allan), [conclusao] no LOG, e R.7 nas features dialogo e avaliacao. Nao executei os tres ultimos de proposito: escrever conclusao e marcar a SPEC como concluida nas features antes do aceite humano seria declarar entregue uma SPEC em voo e deixaria o close --dry verde sem que nada real tivesse avancado. O digest sera gerado pela ferramenta no close, nunca a mao. ESTADO PARA RETOMAR: tudo que dependia de codigo esta feito e verificado; o unico caminho para frente e o usuario ler relatorio.md e amostras de evidence/openai_gpt-oss-20b/ (sugeridas: talk-01, livre-01, hotel-12) e julgar os 4 criterios subjetivos. Com o aceite: check 6, log conclusao, R.7 nas duas features, close. PENDENCIA FORA DA SPEC: as 6 chaves do Groq foram coladas no chat e seguem expostas - precisam ser revogadas e regeradas, incluindo a usada nesta sessao.

⎿ commit 465701c

## 2026-09-16 03:31 — [nota] Review da fase 6 registrada em `6_task_review.md`: MUDANÇAS SOLICITADAS. Achados MAJOR para memória da feature: (1) C1 do grader só verifica presença dos 8 campos e não valida tipos, propriedades adicionais ou `maxItems` contra `turn-schema.json`; (2) `run.mjs` não persiste tentativas HTTP com erro, portanto as duas ocorrências de `json_validate_failed` usadas na recomendação não têm saída bruta versionada; (3) C3 subconta correções quando o texto não repete “em vez de”; (4) `grade.mjs` e `run.mjs` falham no lint isolado e usam identificadores/comentários fora do padrão de código em inglês. A recomendação do 20b segue plausível, mas esses gaps de auditabilidade e padrão devem ser corrigidos antes do fechamento.

## 2026-09-16 03:44 — [nota] Ciclo 2 da review da fase 6: os quatro MAJOR anteriores foram tratados e todas as validações passaram, mas surgiu um novo MAJOR de reprodutibilidade. A refatoração de `run.mjs` alterou o prompt após a coleta: as 90 evidências contêm o v3 com exemplos concretos, enquanto o runner atual remove esses exemplos e acrescenta a regra de fala transcrita. Assim, o dry-run já não representa o experimento publicado e uma retomada pode misturar versões no mesmo diretório. Veredito permanece MUDANÇAS SOLICITADAS até restaurar o prompt v3 byte a byte ou versionar o novo texto como v4 com evidências separadas.

## 2026-09-16 03:41 — [nota] verify: 4/4 critérios passaram (commit `06b391c`)

- PASS: Dataset com ≥40 falas versionado e estruturalmente válido (…
- PASS: Contrato do turno em JSON Schema, com additionalProperties …
- PASS: Runner executa o dataset contra ≥2 modelos e persiste as sa…
- PASS: Checagens mecânicas dos 9 critérios implementadas e verdes …

## 2026-09-16 03:41 — [nota] verify: 4/4 critérios passaram (commit `06b391c`)

- PASS: Dataset com ≥40 falas versionado e estruturalmente válido (…
- PASS: Contrato do turno em JSON Schema, com additionalProperties …
- PASS: Runner executa o dataset contra ≥2 modelos e persiste as sa…
- PASS: Checagens mecânicas dos 9 critérios implementadas e verdes …

## 2026-09-16 03:46 — [nota] verify: 4/4 critérios passaram (commit `06b391c`)

- PASS: Dataset com ≥40 falas versionado e estruturalmente válido (…
- PASS: Contrato do turno em JSON Schema, com additionalProperties …
- PASS: Runner executa o dataset contra ≥2 modelos e persiste as sa…
- PASS: Checagens mecânicas dos 9 critérios implementadas e verdes …

## 2026-09-16 03:48 — [conclusão] Rubrica auditável, dataset de 45 falas, contrato JSON Schema, runner com persistência de sucessos e falhas, grader validando schema e relatório comparativo entregues. Usuário aprovou os quatro critérios subjetivos e o gpt-oss-20b para a Fase 1. Revisão final da fase 6: APROVADO COM OBSERVAÇÕES, sem CRITICAL ou MAJOR pendente; validações específicas, lint isolado, typecheck, verify --all e diff-check verdes.

⎿ commit 06b391c+dirty · 8 files changed, 638 insertions(+), 451 deletions(-)

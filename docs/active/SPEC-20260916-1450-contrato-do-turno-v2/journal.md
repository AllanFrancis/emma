# Journal — SPEC-20260916-1450

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-16 16:30
**Onde tô:** rodada 45/45 feita, 6 de 7 critérios estampados; falta só a leitura humana do critério 7.
**Próximo passo:** apresentar ao @allan a sobre-correção de `hotel-07`, as 4 omissões e as 3 `explanation_pt` em inglês, para o veredito do critério 7.
**Última decisão:** rate limit não é falha de contrato — o gate classifica por `erro.error` e reporta transitórias à parte.
**Bloqueio atual:** critério 7 aguarda julgamento humano (R.6.2 — não é meu para marcar).
**Se retomar, ler:** `main.md` desta SPEC e a entrada `[decisão]` de 15:01 no LOG.

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | `turn-schema.json` v2 — corrections[], next_action, enums, teto | concluído | 2026-09-16 15:00 |
| 2 | `turn-validator.mjs` — enum + `validateEvidence` semântica | concluído | 2026-09-16 15:00 |
| 3 | `validate.mjs` — asserções do v2 + `--self-test` (13 casos) | concluído | 2026-09-16 15:00 |
| 4 | `run.mjs` — prompt v4 | concluído | 2026-09-16 15:00 |
| 5 | `grade.mjs` — C3 exato, C11, C12, `--assert-contract` | concluído | 2026-09-16 15:00 |
| 6 | Rodada real de 45 falas no `gpt-oss-20b` | concluído | 2026-09-16 16:30 |
| 7 | Leitura humana: tato e sobre-correção vs v3 | em progresso | 2026-09-16 16:30 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
- fato: passam com exit 0 — `validate.mjs --schema`, `--self-test` (13 casos), `--all` (45 falas/17 controles), `run.mjs --dry` (45 payloads), `grade.mjs --self-test` (15 casos, 12 checagens).
- fato: `grade.mjs --assert-contract` sai 1 sem evidência gravada; o gate diz a verdade em vez de passar por omissão.
- fato: strict mode do Groq segue o structured outputs da OpenAI e exige `required` completo sob `additionalProperties: false` — daí 9 campos obrigatórios e ausência de correção como ARRAY VAZIO.
- fato: `Protótipo v2.dc.html` tem as mesmas 21 telas e o mesmo contrato de 8 campos do App Standalone — delta em tecnologia, roteiro, chave, props, persistência e velocidade de fala (`[descoberta]` 15:01).
- inferência: `corrections[]` aninhado deve passar no strict mode — o payload monta e o schema é válido, mas só a rodada confirma; `maxItems` já foi suspeito antes e passou.
- dúvida: taxa de reprovação em C11 na rodada real — se o modelo parafrasear em vez de copiar o trecho, o ajuste é de prompt, não de contrato.
- dúvida: se `corrections[]` aumenta a sobre-correção por convidar a preencher itens; os 17 controles medem, mas só com a rodada.

### Respostas-chave do usuário
- "Implemente usando a sua recomendação. Verifique novamente" (2026-09-16 14:47) — aprova o planejamento de 16 seções e as 12 recomendações, e pede reverificação do protótipo.
- Protótipo é normativo para fluxo, conteúdo e comportamento; NÃO para provedor, prompt e diagnóstico.

### Tentativas que falharam
- Heredoc `<<'EOF'` para escrever o `main.md`: shell reclamou de aspas não fechadas com backticks, acentos e pipes escapados juntos. Arquivo longo vai pela ferramenta de escrita.
- Esperar que `corrections` ausente reprovasse em C5: `countCorrections` devolve `Infinity` e `Infinity > 0` é verdadeiro. A checagem estava frouxa, não o teste — C5 agora exige `Array.isArray`.

### Arquivos tocados
- `scripts/eval/turn-schema.json` (fase 1) · `scripts/eval/turn-validator.mjs` (fase 2)
- `scripts/eval/validate.mjs` (fase 3) · `scripts/eval/run.mjs` (fase 4) · `scripts/eval/grade.mjs` (fase 5)
- `.scratch/extrair-v2.mjs` — extrator do bundle v2, descartável

### Onde parei
Contrato fechado e verificável sem rede. Falta uma chamada de rede: 45 requisições ao `gpt-oss-20b`
sob o novo schema. Sem a chave, os critérios 6 e 7 não fecham — e eu não os marco nem os dispenso.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-16 14:47 — reverificação do protótipo v2.dc, abertura desta SPEC, contrato v2 implementado, 5/7 critérios verificados.

## LOG (append-only — NUNCA editar entradas antigas)
<!-- tipos: ativação descoberta decisão tentativa blocker unblock refactor nota conclusão | entrada nova: specctl log -->

## 2026-09-16 14:50 — [ativação] SPEC criada e ativada (@allan, branch feature/contrato-do-turno-v2, base main)

## 2026-09-16 15:00 — [nota] verify: 5/6 critérios passaram (commit `603d025`)

- PASS: `turn-schema.json` declara `corrections[]` com os 4 campos …
- PASS: O validador recusa cada classe de violação do contrato: 4a …
- PASS: O dataset de 45 falas segue válido e os 17 casos de control…
- PASS: O prompt v4 declara o contrato v2, preserva as três vias de…
- PASS: O grader lê o formato v2, conta correções pelo array e as 1…
- FAIL: Rodada real de 45 falas em `openai/gpt-oss-20b` sob o contr…

## 2026-09-16 15:01 — [descoberta] Protótipo v2.dc é arquivo diferente do App Standalone: 21 telas e contrato idênticos, mas missões sem script, sem chave no app, cota e nome como props, log não persistido

O usuário forneceu `Emma - Protótipo v2.dc.html` (1.398.019 bytes), que é ARQUIVO DIFERENTE do
`Emma - App Standalone.html` (455.804 bytes) analisado antes — md5 d868570a vs fbc71026. Decodificado
com `.scratch/extrair-v2.mjs` (cópia do extrator com SRC/OUT trocados) para `_decoded_v2/`.

O que NÃO mudou, e por isso o planejamento sobrevive inteiro: `FLOW` com as mesmas 21 telas na mesma
ordem; `QUESTIONS` com as mesmas 8 perguntas e mesmas opções; o contrato do turno ainda é de 8 campos
planos com `correction_pt` string; os preços do paywall (R$ 24,90 / R$ 39,90 / R$ 298,80); a copy de
consentimento de áudio; a promessa de "devolutiva de pronúncia" no paywall; a copy de retenção de 30
dias na tela de retorno.

O que mudou:
1. Tecnologia: v1 é JS vanilla com template de string; v2 é React class component (`class Component
   extends DCLogic`) com template `text/x-dc` e interpolação `{{ }}`. Irrelevante para o plano — a
   §2.2 do prompt torna o protótipo normativo para fluxo e conteúdo, não para forma.
2. MISSIONS perderam `script[]`. Na v1 cada missão trazia 4 etapas roteirizadas como dado de domínio.
   Na v2 as missões têm só o turno de abertura, e o roteiro (texto IDÊNTICO ao da v1) vive num shim
   `SCRIPTS` que só se instala quando `window.claude` não existe. Ou seja: na v2 o roteiro é andaime
   de preview, não dado de produto.
3. Chave de API: v1 usava `prompt()` + localStorage + fetch direto para `api.anthropic.com` com
   `anthropic-dangerous-direct-browser-access: true`. v2 usa `window.claude.complete()`, sem chave no
   app. O risco de segurança que eu havia apontado era da v1 e a v2 já o resolveu.
4. Parametrização: v2 declara props editáveis — `cotaDiaria` (int, min 2, max 30, default 8),
   `nomePersonagem` (text, default "Emma") e `modoDemo` (boolean, default true). Isso confirma por
   construção duas recomendações do planejamento: cota nunca hardcoded e nome da personagem isolado
   num único ponto.
5. Persistência: v1 salvava o `log` completo da conversa em localStorage. v2 persiste só
   `answers`, `estLevel`, `streak`, `words.slice(-24)`, `focus.slice(-6)` e `lastMissionIdx` — o log
   da conversa NÃO é persistido. Minimização de dados já aplicada, alinhada com a §18.
6. Velocidade de fala por nível: `const slow = this.levelNum() <= 2` e `utter(en, "en-US", slow ?
   0.85 : 1)`. Confirma `speechRate` como campo de domínio (§16), que a v1 não tinha.

CONSEQUÊNCIA PARA DEC-20260916-0311: a decisão diz que `json_validate_failed` cai em `scriptedTurn()`
e que um turno nunca morre na interface. Na v2 esse roteiro não é mais dado de domínio. Shim de
preview não é fallback de produção, então o roteiro das 3 missões precisa voltar a ser dado de
produto no catálogo de missões — o que o modelo de domínio do planejamento já previa na entidade
`Mission` ("etapas roteirizadas (fallback)"). Nada a mudar no plano; é a v2 que precisa dessa
migração na Fase 1.
⎿ commit 603d025+dirty · 5 files changed, 483 insertions(+), 48 deletions(-)

## 2026-09-16 15:01 — [decisão] Contrato v2 fechado: 9 campos required, category com 6 valores, evidência semântica fora do schema, next_action como proposta, prompt v4 com fala transcrita

Cinco decisões de projeto fechadas ao escrever o contrato v2.

1. TODOS os 9 campos ficam em `required`, inclusive `corrections` e `next_action`. O strict mode do
   Groq segue o structured outputs da OpenAI, que exige `required` completo quando
   `additionalProperties: false`. "Campo opcional" no sentido de JSON Schema não existe aqui — a
   ausência de correção se expressa como ARRAY VAZIO, não como campo ausente. Isso é melhor de medir:
   array vazio é um fato afirmado pelo modelo, campo ausente é ambíguo entre "não há" e "esqueci".

2. `category` entra com 6 valores (`grammar`, `vocabulary`, `word_order`, `preposition`,
   `false_friend`, `register`) porque sem categoria o teto de 3 é contagem cega: truncar por ordem de
   chegada descarta o erro que quebra a comunicação para manter o que é só registro. Com categoria, a
   priorização vira política do núcleo pedagógico. `register` existe por causa da evidência concreta
   do eval anterior: "I want a coffee" num balcão comunica perfeitamente e ainda assim merece
   correção — não é gramática, é registro.

3. A checagem de evidência é SEMÂNTICA e por isso mora fora do schema, em
   `validateEvidence(turn, utterance)`. O schema não conhece a fala do aluno; só o grader conhece. A
   normalização aceita diferença de caixa, apóstrofo curvo vs reto, espaço duplicado e pontuação nas
   bordas, porque a entrada é fala transcrita e nada disso existe na fala — reprovar por isso seria
   reprovar por artefato de transcrição. Mas NÃO aceita paráfrase: "I desire a coffee" contra a fala
   "I want a coffee please" é recusado, e é exatamente o caso que a checagem existe para pegar.

4. `next_action` é PROPOSTA do modelo, não decisão. O prompt v4 diz isso na letra ("Você PROPÕE; quem
   decide é o motor pedagógico"). Nesta SPEC o campo só é contratado e medido; quem o confronta com a
   etapa real da missão é a SPEC 1.1. Sem isso, "avançar de etapa" voltaria para dentro do prompt, que
   é o que a §11 do prompt de desenvolvimento proíbe.

5. O prompt v4 ganhou a declaração de FALA TRANSCRITA, que o v3 não tinha. Isso não é escopo novo:
   DEC-20260916-0312 já está registrada como decisão ativa e exigia essa declaração; ela simplesmente
   nunca havia chegado ao prompt do eval, só ao requisito de Fase 1. Agora está no v4, e as três vias
   de decisão de correção do v3 foram preservadas na letra — só as referências de campo mudaram
   (`correction_pt` -> `corrections`).

GANHO MEDIDO NA MIGRAÇÃO DO GRADER: C3 (teto de 3 correções) era heurística de string — contava
ocorrências de "em vez de" e devolvia `Infinity` quando não reconhecia o formato, ou seja, reprovava
um turno bem corrigido em prosa livre sem que houvesse erro nenhum. Agora é `corrections.length`,
exato. Duas checagens novas entram: C11 (correção cita evidência literal) e C12 (não pede `retry` em
caso de controle) — C12 é o análogo de sobre-correção no campo de ação, porque cobrar repetição de
quem não errou é o mesmo erro pedagógico de corrigir quem não errou.

Um teste meu estava errado e a checagem estava certa: eu esperava que `corrections` ausente reprovasse
em C5, mas `countCorrections` devolve `Infinity` para não-array e `Infinity > 0` é verdadeiro. Corrigi
C5 para exigir `Array.isArray(turn.corrections) && length > 0` em vez de ajustar a expectativa do
teste — turno malformado não pode contar como "corrigiu quando havia o que corrigir".
⎿ commit 603d025+dirty · 5 files changed, 483 insertions(+), 48 deletions(-)

## 2026-09-16 15:05 — [nota] verify: 0/1 critérios passaram (commit `5c1e824`)

- FAIL: Rodada real de 45 falas em `openai/gpt-oss-20b` sob o contr…

## 2026-09-16 16:28 — [nota] verify: 1/1 critérios passaram (commit `1bae4c0`)

- PASS: Rodada real de 45 falas em `openai/gpt-oss-20b` sob o contr…

## 2026-09-16 16:30 — [unblock] Rodada 45/45 no gpt-oss-20b sob o contrato v2: zero falha de contrato, C11 em 100%, C4 melhora 6 pontos sobre o v3; teto do tier e de TOKENS/min e exigiu backoff

45/45 turnos gravados no `openai/gpt-oss-20b`, zero falha de contrato, zero correção sem
evidência. `grade.mjs --assert-contract` passa e o critério 6 está estampado.

A rodada NÃO saiu de primeira. O teto do tier gratuito é de TOKENS por minuto, não de
requisições: a primeira tentativa morreu em 5/45 com `remainingRequests: 995` e
`remainingTokens: 1207`. A ~1065 tokens por turno, a janela permite 1 ou 2 turnos. O `run.mjs`
retentava uma única vez com o `retry-after` do servidor (2 a 5 segundos, curto demais para a
janela refilar) e então abortava a rodada inteira via `stop: true`. Dois ajustes resolveram:
backoff progressivo de até 6 tentativas com espera mínima de 20s, e pausa adaptativa quando
`x-ratelimit-remaining-tokens` cai abaixo de 2 turnos. Rate limit também deixou de abortar a
rodada — com retomada por arquivo, insistir no próximo registro custa menos que reiniciar.
Erro de CONTRATO, esse sim, continua parando tudo.

O gate também estava errado e foi corrigido: `--assert-contract` contava qualquer entrada em
`_failures/` como falha. Rate limit é transitório e não diz nada sobre o contrato — contá-lo
como falha de contrato travaria o critério para sempre. Agora ele classifica pelo
`erro.error` e reporta as transitórias à parte (5 nesta rodada, todas ignoradas com razão).

COMPARAÇÃO COM O V3 (contrato v1, mesmo modelo, mesmo dataset, relatorio.md da SPEC-20260916-0109):

| checagem | v3 | v2 | delta |
|---|---|---|---|
| C1 contrato válido | 100% | 100% | = |
| C3 teto de 3 correções | heurística | 100% exato | mede de verdade |
| C4 não corrige controle | 88% | 94% | +6 |
| C5 corrige quando há | 86% | 86% | = |
| C7 instrução em português | 89% | 93% | +4 |
| C8 comprimento por nível | 84% | 82% | -2 (1 turno em 45; ruído) |
| C11 evidência literal | — | 100% | novo |
| C12 next_action coerente | — | 100% | novo |

C11 em 100% derruba a dúvida que eu havia registrado: o risco de o modelo parafrasear em vez de
copiar o trecho literal NÃO se materializou em 33 correções. `corrections[]` também não aumentou
a sobre-correção — ao contrário, C4 melhorou 6 pontos e o único caso restante é `hotel-07`
("What time is the breakfast?"), onde o dataset considera o artigo aceitável no contexto de
hotel. Distribuição de `category` nas 33 correções: grammar 18, preposition 7, vocabulary 4,
register 2, word_order 1, false_friend 1.

PADRÃO NAS 4 OMISSÕES — vale mais que o número. Em TODAS as quatro, o modelo colocou a forma
correta em `suggestion_en` em vez de `corrections[]`:
- `cafe-02` "I want a coffee" -> suggestion_en "I would like a coffee, please."
- `cafe-08` "Do you have some vegetarian option?" -> suggestion_en "Do you have any vegetarian options?"
- `talk-06` "It's very hot today, no?" -> suggestion_en "You could say: 'It's very hot today, isn't it?'"
- `talk-10` "I have a doubt about what you said" -> suggestion_en "Could you tell me which part is confusing?"

Ou seja: o modelo está ensinando, mas roteando pela via (c) do prompt ("comunica bem, ofereça em
suggestion_en") em vez da via (b) ("revela padrão sistemático, corrija TAMBÉM"). E isso acontece
justamente em dois casos que o prompt nomeia LITERALMENTE na via (b): "I want a coffee" num balcão
e o falso cognato "doubt". Nomear o exemplo no prompt não bastou — o modelo prefere a rota gentil.
É calibração de prompt, não defeito de contrato, e é o alvo natural da SPEC 0.2.

DEFEITO NOVO QUE A ESTRUTURA EXPÔS: 3 das 33 `explanation_pt` estão em INGLÊS — `hotel-05` ("Use
'am' instead of 'have' for age."), `hotel-07` ("Use 'breakfast' without the article, it's an
uncountable noun.") e `hotel-10` ("Use present perfect continuous for an action that started in
the past and continues to now."). A última é pior: usa metalinguagem gramatical em inglês para
um aluno de nível baixo. Nada no grader checa isso — C7 valida só `instruction_pt`. Com o
contrato v1 o problema existia igual e era INVISÍVEL, porque a correção era uma string única sem
checagem de idioma; a estrutura do v2 é que permitiu enxergar. Fica como decisão do usuário
adicionar C13 (`explanation_pt` em português) nesta SPEC ou em seguida.

Registro de precisão: minha primeira medição de idioma acusou 11 de 33, e estava errada — a
heurística exigia 2 marcadores de português e super-marcou explicações curtas e legítimas como
"Use 'hungry' sem 'with'." ou "O verbo deve vir antes do pronome.". O número real é 3.
⎿ commit d9a948a+dirty · 4 files changed, 62 insertions(+), 14 deletions(-)

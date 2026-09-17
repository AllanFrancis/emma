# Journal — SPEC-20260916-1652

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-17 15:48
**Onde tô:** 9 critérios evidenciados; pronto para fechar
**Próximo passo:** `close` (decisão humana) e merge de `feature/motor-de-dialogo`
**Última decisão:** validador do produto lê o schema, sem reusar o do harness
**Bloqueio atual:** nenhum
**Se retomar, ler:** `tasks.md`, depois `src/dialogo/motor.ts`

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | Prompt puro do Intent e catálogo de missões (tasks 1.0, 3.0) | concluída | 2026-09-17 15:20 |
| 2 | Adapter isolado, motor com fallback, janela como orçamento (2.0, 5.0, 7.0) | concluída | 2026-09-17 15:35 |
| 3 | Server function e validador (4.0) | concluída | 2026-09-17 15:38 |
| 4 | Invariantes por teste (6.0) | concluída | 2026-09-17 15:46 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
<!-- anti-alucinação por estrutura: separe o que é SABIDO (verificado no código/teste) do que é CHUTE (inferido) do que está EM ABERTO. Nunca trate inferência como fato. -->
- fato: o núcleo pedagógico JÁ EXISTIA em `src/domain/` com 16 arquivos. `decidirIntent`, `revisarTurno` e `decidirNextAction` são insumo; nada disso foi reimplementado.
- fato: `src/start.ts` já instalava `createCsrfMiddleware` com filtro `handlerType === "serverFn"`. A server function herda; não foi preciso implementar.
- fato: `response_format.type = json_schema` e `json_schema.strict = true` verificados NO CORPO do pedido, com `fetch` interceptado. O `strict` vem do próprio `turn-schema.json`.
- fato: o bundle do cliente não menciona `GROQ_API_KEY`, `api.groq.com` nem padrão `gsk_*`. Verificado por teste de inspeção E por grep direto em `dist/client`.
- fato: `bun test` 150 pass / 0 fail; `tsc --noEmit` limpo; `bun run lint` 0 erro (6 avisos pré-existentes do scaffold).
- fato: o teste do núcleo sobrescrevendo o modelo passa — proposta `reply` com correção emitida sai como `retry`.
- fato: NENHUMA chamada real ao Groq nesta sessão; `GROQ_API_KEY` ausente no ambiente.
- inferência: os defaults de teto de histórico (1500 tokens) e de retry (6) são plausíveis por espelharem o harness, mas não foram calibrados contra tráfego real.
- dúvida em aberto: latência real por turno e comportamento real do teto de tokens por minuto seguem NÃO MEDIDOS. Os dois são risco declarado no contrato e só o smoke test com chave real resolve.

### Respostas-chave do usuário
- Porte G: "só tasks + modo autônomo". "Não deixe as tasks ampliarem o contrato existente."
- "a proteção da chave/API e demais fronteiras de confiança devem ser verificadas por testes/inspeção, não por gate humano adicional."
- "não recrie `decidirIntent`, `revisarTurno` ou `decidirNextAction`. As tasks precisam partir do que já existe e focar na integração."
- "trate a janela de histórico como orçamento" e "não antecipe nenhuma mudança da futura `contrato-de-correcoes`."
- Uso da chave: "use a chave somente para os testes estritamente necessários. Evite rodadas repetidas que não acrescentem evidência nova."

### Tentativas que falharam
- `tsconfig` tem `exactOptionalPropertyTypes` e `noPropertyAccessFromIndexSignature`, e o adapter reprovou duas vezes: `env.GROQ_API_KEY` precisa ser `env["GROQ_API_KEY"]`, e campo opcional NÃO aceita `undefined` explícito — resolvido com spread condicional `...(x === undefined ? {} : { k: x })`.

### Arquivos tocados
- `src/dialogo/` — `prompt.ts`, `missoes.ts`, `adapter.ts`, `janela.ts`, `motor.ts`, `validador.ts`, `turno.server.ts`, mais 5 arquivos de teste
- `docs/ARCHITECTURE.md` — `src/domain/` e `turn-contract.generated.ts` no mapa; seção de fronteira reescrita
- `docs/features/dialogo.md` — R.7, mapa de arquivos e a contagem 13 → 15 que a `semantica-next-action` deixou pendente

### Onde parei
Pronto para `close`. A tela de conversa é de `conversa-e-missoes`, então a server function ainda não tem consumidor de interface — por desenho, não por falta.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-17 12:07–15:48 — ativação, decisão de porte G, tasks.md a partir do núcleo existente, as 7 tasks implementadas com 68 testes novos, 9 critérios evidenciados.

## LOG (append-only — NUNCA editar entradas antigas)
<!-- tipos: ativação descoberta decisão tentativa blocker unblock refactor nota conclusão | entrada nova: specctl log -->

## 2026-09-17 12:07 — [ativação] SPEC ativada (branch feature/motor-de-dialogo, base main)

## 2026-09-17 12:14 — [nota] Fronteiras da rodada paralela: regiao, cota de Groq, colisao em dialogo e limite com retencao-de-contexto

Esta SPEC roda em worktree dedicado (`.worktrees/motor-de-dialogo`, branch `feature/motor-de-dialogo`), em paralelo com duas outras a partir de main 5b3f112:

- SPEC-20260916-1652-onboarding-e-perfil (M) — região `src/routes/` e telas
- SPEC-20260916-2048-semantica-next-action (P) — região `scripts/eval/grade.mjs`, área das `CHECKS`

Região desta SPEC: `src/` do lado servidor (server function, geração de prompt como função pura, adapter de provedor). É a ÚNICA das três autorizada a consumir Groq nesta rodada — as outras duas ficam offline de propósito, para não haver disputa pelo teto de tokens da organização.

**Colisão de claim detectada (R.11):** `semantica-next-action` também declara a feature `dialogo`. A colisão é na memória viva (`docs/features/dialogo.md`), não no código. Disciplina obrigatória, por `docs/rules/team.md`:

- Seções compartilhadas (Specs desta feature, Decisões, Alternativas rejeitadas, Gotchas): UMA linha por entrada, prefixada por SPEC-id ou DEC-id. Nunca reordenar linha existente. Conflito de merge vira inserção adjacente trivial.
- Seção "Estado atual" (prosa): PROIBIDO editar concorrentemente. No fechamento, APENDAR `### Delta de estado (SPEC-20260916-1652-motor-de-dialogo, data)` ao fim da seção. Consolidação da prosa é single-writer, em sessão dedicada.

**Fronteira com SPEC-20260916-2257-retencao-de-contexto-na-conversa (fora desta rodada, decisão do usuário):** aquela SPEC é a dona da regra de retenção — "não pedir de novo dado que o aluno já forneceu" — e o ponto de aplicação dela (prompt, janela/sumarização de histórico, ou núcleo) é decisão DELA, sustentada por levantamento nas evidências já gravadas.

Esta SPEC entrega a MECÂNICA da janela de histórico que o escopo dela já exige: teto explícito em tokens, medido e não estimado (risco de custo registrado no main.md). O que esta SPEC NÃO faz é embutir política de retenção nessa mecânica — nada de heurística de "dado já fornecido", de deduplicação de pergunta, nem de sumarização que decida O QUE preservar. A janela aqui é orçamento; a regra de o que sobrevive nela pertence à `retencao-de-contexto`. Instrução do usuário nesta rodada: "Não deixe essa SPEC absorver antecipadamente regras que pertencem à futura retencao-de-contexto."

**Pendência de porte G:** `interop: inline` no manifesto e porte G exigem pergunta explícita ao usuário sobre o caminho do pipeline (`completo | só techspec | só tasks | sem pipeline`) e, havendo pipeline, o modo de execução (`autônomo | com gates`) — por `docs/rules/interop.md`, nunca escolha implícita. `**Workspace:** —` no main.md até essa definição. Implementação não começa antes disso.
⎿ commit 50a0c49

## 2026-09-17 12:43 — [decisão] Porte G: pipeline so tasks, execucao autonoma, invariantes por teste e nao por gate humano

Decisão do usuário em 2026-09-17, no checkpoint de porte G exigido por `docs/rules/interop.md`.

### Caminho do pipeline: só tasks. Modo de execução: autônomo.

Citação: "Adote só tasks + modo autônomo. Não vejo necessidade de criar um techspec adicional agora, porque as decisões arquiteturais relevantes já estão registradas no `main.md`. O que falta é decompor a implementação e validar mecanicamente as invariantes já definidas."

- pipeline: **tasks** (uso à la carte do porte G parcial — o `main.md` vale como documento de requisitos, item 3 do preâmbulo SDD Interop)
- execução: **autônoma** — apresentações de plano/lista viram informativas, registradas no journal, e a sessão prossegue
- **R.6.2 continua valendo integralmente.** Modo autônomo NÃO afrouxa aceite: qualquer decisão que mude critério de aceite ou escopo exige aprovação explícita do usuário. Só o usuário aceita critério incompleto.
- `interop: inline` no manifesto ⇒ o workspace é a própria pasta desta SPEC. Toda referência das skills a `./tasks/prd-<slug>/` significa `docs/active/SPEC-20260916-1652-motor-de-dialogo/`.

### Verificação por teste, não por gate humano

Citação: "a proteção da chave/API e demais fronteiras de confiança devem ser verificadas por testes/inspeção, não por gate humano adicional."

Consequência de desenho: a invariante "NUNCA a chave de API aparece no bundle do cliente" tem de virar **teste automatizado de inspeção de build**, não item de checklist para alguém olhar. Mesma coisa para as outras fronteiras de confiança: se a invariante é mecanicamente verificável, ela é teste. Gate humano fica reservado ao que só pessoa julga.

### Limite duro do escopo das tasks

Citação: "Não deixe as tasks ampliarem o contrato existente. Elas devem decompor o que já foi decidido entre server function, prompt puro, adapter Groq e dados da missão."

As tasks são DECOMPOSIÇÃO, nunca extensão. As quatro superfícies nomeadas pelo usuário são o recorte:

1. server function — fronteira de confiança, único ponto que fala com o Groq
2. prompt puro — função `Intent -> string`, testável sem rede
3. adapter Groq — trocável sem tocar núcleo nem interface
4. dados da missão — o roteiro (`Mission.script[]`) volta ao domínio para servir de fallback

Task que precise de decisão nova de arquitetura é sinal de que o contrato está incompleto — nesse caso a rota é R.6.2 (perguntar), não resolver na task.

### Fronteira reafirmada com a `retencao-de-contexto`

Já registrada na nota de fronteiras desta SPEC e reafirmada pelo usuário: "No `motor-de-dialogo`, por ser porte G e envolver janela/histórico, adapter e servidor, mantenha atenção especial às fronteiras de responsabilidade. Não deixe essa SPEC absorver antecipadamente regras que pertencem à futura `retencao-de-contexto`."

Operacionalmente: a janela de histórico aqui é **orçamento em tokens**, medido e não estimado. O que sobrevive dentro dela é política de retenção, e política é da `retencao-de-contexto`. Nada de heurística de "dado já fornecido", deduplicação de pergunta ou sumarização que decida o que preservar.

Nota de contexto útil para a decomposição: a `semantica-next-action` fechou hoje, em paralelo, decidindo que **o núcleo é fonte de verdade de `next_action`** e o modelo apenas propõe. Isso confirma a invariante já contratada aqui — "NUNCA o motor toma decisão pedagógica" — e reforça que o motor não deve corrigir nem sobrescrever `next_action`: ele entrega o turno validado, e a política é de outra camada.
⎿ commit f374a9f+dirty · 1 file changed, 1 insertion(+), 1 deletion(-)

## 2026-09-17 13:10 — [nota] tasks.md escrito partindo do nucleo que JA existe em src/domain — integracao, nao recriacao

Lista de tasks escrita em `tasks.md`, no workspace inline desta SPEC. Modo autônomo: a apresentação da lista é informativa, registrada aqui, e a sessão prossegue.

### O planejamento mudou depois de ler o código

A descoberta que reorientou a decomposição: **o núcleo pedagógico já existe em `src/domain/`**, com 16 arquivos versionados e superfície pública em `index.ts`. Isso não estava óbvio — o `ARCHITECTURE.md` afirmava que "o produto não tem código: `src/` é scaffold puro", e a SPEC do núcleo, ao arquivar, não atualizou esse mapa.

Já existem e são INSUMO, não trabalho desta SPEC:

- `decidirIntent(PedagogicalInput): PedagogicalIntent` — produz o Intent que o motor consome
- `revisarTurno(entrada, propostas): TurnoRevisado` — recebe o que o modelo propôs e devolve o que sai
- `decidirNextAction(...)` — decisão final de `next_action`, já com precedência sobre a proposta
- `resolverCorrecoes` / `temEvidencia` — rejeição de correção sem evidência literal e teto por prioridade
- `Mission` / `MissionStep`, onde `openingEn` é o portador do roteiro de fallback da DEC-20260916-0311
- `turn-contract.generated.ts`, gerado de `scripts/eval/turn-schema.json`

Instrução do usuário: "não recrie `decidirIntent`, `revisarTurno` ou `decidirNextAction`. As tasks precisam partir do que já existe e focar na integração do motor com esse domínio existente." A lista foi escrita assim.

### Duas descobertas que reduzem trabalho

1. **CSRF já está resolvido.** `src/start.ts` instala `createCsrfMiddleware` com filtro `handlerType === "serverFn"`, e o comentário no arquivo explica que definir `src/start.ts` opta por sair do padrão, então a proteção foi re-adicionada de propósito. A task 4.4 só confirma a cobertura, em vez de implementar.
2. **A decisão de `next_action` está pronta no núcleo.** `revisarTurno` já devolve `nextAction` decidido. O motor não escolhe — o que, de bônus, satisfaz sem trabalho extra a invariante "NUNCA o motor toma decisão pedagógica".

### O que NÃO existe, e virou task

Catálogo de missões como DADO (só o tipo existe) → task 3.0. Nenhum adapter de provedor, e nenhum SDK do Groq nas dependências, então o adapter fala com o endpoint compatível com OpenAI por `fetch` → task 2.0. Nenhuma server function → task 4.0.

### Invariantes viraram teste, conforme decidido

Task 6.0 traduz "verificar por testes/inspeção, não por gate humano" em duas checagens mecânicas: uma que inspeciona o build e falha se a chave ou o nome da variável de ambiente aparecerem em artefato do cliente, e uma que falha se qualquer arquivo de `src/domain/` importar rede ou adapter.

### Fronteira com a retencao-de-contexto, reafirmada na task 7.0

A janela de histórico aqui é ORÇAMENTO em tokens, medido e não estimado. O que ela não faz está escrito na própria task: nada de heurística de "dado já fornecido", deduplicação de pergunta, ou sumarização que decida o que preservar. Isso é política de retenção e pertence à SPEC-20260916-2257.

### ARCHITECTURE.md corrigido no mínimo necessário

Instrução do usuário: "Atualize apenas o necessário para que ele deixe de afirmar incorretamente que `src/` é apenas scaffold." Feito em três pontos: duas linhas novas no mapa região→feature (`src/domain/` como `pedagogia`, e `turn-contract.generated.ts` como `dialogo`), e a seção "Fronteira ainda não existente" virou "Fronteira já existente, e a que falta", dizendo o que existe e o que ainda não. Nenhuma outra linha tocada — sem refatoração documental ampla.
⎿ commit df0a586+dirty · 1 file changed, 10 insertions(+), 3 deletions(-)

## 2026-09-17 15:48 — [conclusão] Caminho real do turno existe: Intent entra, turno validado sai, chave nunca sai do servidor

O caminho real do turno existe: `PedagogicalIntent` entra, turno validado sai, e a chave de API nunca sai do servidor.

### O que foi entregue, pelas sete tasks

**Prompt puro (1.0).** `construirPrompt(intent)` sem rede e sem disco, derivado do v5 do harness de eval — a versão medida em 45 falas, matriz de personalidade e comparação controlada. Não é texto novo. A diferença que importa: onde a eval escreve "no maximo 3 pontos de correcao" como literal, aqui vem `intent.maxCorrections`, que a política de nível do núcleo já resolveu. Toda afirmação de política no prompt sai de um campo do Intent.

**Adapter isolado (2.0).** Nenhum tipo do núcleo cruza a fronteira: o adapter recebe prompt, mensagens e schema, e devolve texto ou erro tipado. Ele não sabe o que é um Intent, e um teste estático garante que não importa de `../domain`. Groq pelo endpoint compatível com OpenAI via `fetch`, com `response_format: json_schema` e `strict: true` — verificado NO CORPO do pedido, não afirmado.

**Catálogo de missões (3.0).** Café, hotel e puxar conversa, quatro etapas cada, copiadas do protótipo. O `openingEn` de cada etapa é o roteiro de fallback da DEC-20260916-0311, e um teste garante que nenhuma etapa fica sem ele — etapa sem `openingEn` seria um ponto do percurso onde o turno morreria na tela.

**Server function (4.0).** Único ponto que fala com o provedor. Pipeline: `decidirIntent` → prompt → adapter → `JSON.parse` → valida schema → valida evidência → `revisarTurno`. Parse nunca por fatiamento de texto ou regex, que era como o protótipo montava o turno.

**Fallback (5.0).** Retry só em `json_validate_failed`, que a evidência mostra ser recuperável; rate limit e falha irrecuperável não melhoram com insistência dentro do mesmo turno. Esgotado, o turno vem do `openingEn` da etapa ATUAL, entrando no ponto certo do percurso.

**Invariantes por teste (6.0).** Duas checagens mecânicas que falham a suíte: nenhum arquivo de `src/domain/` importa rede, adapter ou o nome da variável de ambiente; e o bundle do cliente não menciona `GROQ_API_KEY`, não carrega `api.groq.com` e não contém nada com forma de chave da Groq. O teste CONSTRÓI o bundle quando falta, então não depende de ninguém lembrar de rodar build antes.

**Janela como orçamento (7.0).** Corte por custo em tokens, mantendo turno inteiro. O número MEDIDO vem do `usage` do provedor; a estimativa só decide o corte antes da chamada.

### Duas coisas que o repositório já resolvia, e eu não refiz

`src/start.ts` já instala `createCsrfMiddleware` com filtro `handlerType === "serverFn"` — a proteção foi re-adicionada de propósito quando o arquivo passou a existir, e esta server function herda. E `revisarTurno` já devolve `nextAction` decidido, então o motor não escolhe, o que satisfaz de graça a invariante "NUNCA o motor toma decisão pedagógica".

### O adapter injetado é o que torna o caminho de falha testável

Todos os 19 testes de motor rodam sem rede e sem chave, inclusive os de falha. Um deles percorre as cinco formas de falha e afirma que um turno chega em todas. Sem injeção, esse caminho só seria exercitado em produção — que é exatamente quando não se pode falhar.

### Fronteira preservada com a retencao-de-contexto

A janela corta por CUSTO, e há teste provando isso: histórico repetitivo e histórico variado do mesmo tamanho cortam no mesmo ponto. Nenhuma heurística de "dado já fornecido", nenhuma deduplicação de pergunta, nenhuma sumarização que decida o que preservar. Isso é política de retenção e é da SPEC-20260916-2257.

### Uma decisão de fronteira que vale registro

O validador do produto NÃO reusa `scripts/eval/turn-validator.mjs`. Aquele existe para graduar evidência offline e vive no harness; acoplar o caminho de request do produto a `scripts/` cruzaria a fronteira que o ARCHITECTURE mantém. Duas implementações lendo o MESMO schema não são dual-write do contrato — o contrato continua num só arquivo. Duas cópias do schema seriam.

### Fio solto recolhido

A `semantica-next-action` deixou a linha do mapa de arquivos de `docs/features/dialogo.md` dizendo "13 checagens", diferida para o delta de fechamento por causa da colisão de claim, e fechou antes de aplicá-la. Com aquela SPEC arquivada a colisão terminou, e esta SPEC é escritora única de `dialogo` — a contagem foi corrigida para 15 aqui.

### O que NÃO foi feito, e é honesto dizer

**Nenhuma chamada real ao Groq.** `GROQ_API_KEY` não está no ambiente desta sessão. Todos os ramos do adapter estão cobertos por teste com `fetch` interceptado, mas o smoke test contra a API real fica pendente. Isso não afeta nenhum critério de aceite — os nove são verificáveis sem rede —, mas latência real por turno e comportamento real do teto de tokens por minuto continuam não medidos, e os dois estão declarados como risco no contrato.

### Verificação

`bun test` 150 pass / 0 fail. `bun x tsc --noEmit` limpo. `bun run lint` 0 erro, com os 6 avisos pré-existentes do scaffold. Invariante da chave confirmada por dois caminhos independentes: o teste de inspeção e um grep direto em `dist/client`.
⎿ commit ad3d4a6+dirty · 2 files changed, 13 insertions(+), 10 deletions(-)

# Journal — SPEC-20260916-1652

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-17 13:10
**Onde tô:** início — nada feito ainda
**Próximo passo:** <primeiro passo concreto>
**Última decisão:** —
**Bloqueio atual:** nenhum
**Se retomar, ler:** main.md desta SPEC

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | <fase> | pendente | 2026-09-17 12:07 |

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

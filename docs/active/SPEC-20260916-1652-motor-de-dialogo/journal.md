# Journal — SPEC-20260916-1652

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-17 12:14
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

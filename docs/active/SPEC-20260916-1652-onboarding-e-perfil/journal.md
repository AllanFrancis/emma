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

## 2026-09-17 12:07 — [ativação] SPEC ativada (branch feature/onboarding-e-perfil, base main)

## 2026-09-17 12:14 — [nota] Fronteiras da rodada paralela: sem colisao, sem Groq, arquivos gerados e forma de dado vinda do nucleo

Esta SPEC roda em worktree dedicado (`.worktrees/onboarding-e-perfil`, branch `feature/onboarding-e-perfil`), em paralelo com duas outras a partir de main 5b3f112:

- SPEC-20260916-1652-motor-de-dialogo (G) — região `src/` servidor
- SPEC-20260916-2048-semantica-next-action (P) — região `scripts/eval/grade.mjs`, área das `CHECKS`

Região desta SPEC: `src/routes/` (rotas do percurso de entrada) e composição de telas sobre os 46 componentes shadcn/ui que o scaffold já traz intocados.

**Sem colisão de claim (R.11):** esta é a única das três cuja feature (`onboarding`) não é compartilhada. As outras duas colidem entre si em `dialogo`; esta não participa. `docs/features/onboarding.md` tem escritor único nesta rodada.

**Restrição de rede — decisão do usuário nesta rodada:** esta SPEC não consome Groq, porque o escopo dela não exige. O onboarding captura perfil e preferências; a primeira conversa (que precisa do modelo) é de `conversa-e-missoes` e `diagnostico-inicial`, ambas bloqueadas no DAG. Se aparecer necessidade de chamada ao modelo aqui, isso é sinal de escopo vazando, não de dependência legítima.

**Sobreposição de arquivo gerado a vigiar:** `src/routeTree.gen.ts` é GERADO pelo router-plugin e está fora do lint. Esta SPEC adiciona rotas, então vai regenerá-lo. `motor-de-dialogo` mexe no lado servidor e pode ou não tocá-lo. Instrução do usuário: arquivo gerado se REGENERA depois do merge, não se reconcilia à mão. Mesma regra vale para `docs/PROGRAMS.md`, que as três branches alteram nas mesmas duas linhas (`prontos:` / `em progresso:`) por efeito da ativação.

**Fronteira de dado:** `LearnerProfile` e `TeacherPreferences` têm a forma definida pela SPEC-20260916-1652-nucleo-pedagogico, já ARQUIVADA — a forma é insumo, não invenção desta SPEC. Ler o archive dela antes de gravar campo.

**Corte já contratado no main.md:** `quantoFala` e `quando` NÃO são capturados (alimentam decisão nenhuma na Fase 1), e `projecao` fica para a Fase 2. Isso é escopo fechado, com justificativa registrada — não reabrir por conta própria.
⎿ commit eabbb95

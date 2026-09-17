Esta SPEC roda em worktree dedicado (`.worktrees/semantica-next-action`, branch `feature/semantica-next-action`), em paralelo com duas outras a partir de main 5b3f112:

- SPEC-20260916-1652-motor-de-dialogo (G) — região `src/` servidor
- SPEC-20260916-1652-onboarding-e-perfil (M) — região `src/routes/` e telas

Região desta SPEC: `scripts/eval/grade.mjs`, área do array `CHECKS` (as 13 checagens de turno) mais os casos de self-test. Mais a tabela de coerência `corrections` × `next_action`, que é o artefato central e é trabalho de definição.

**Restrição de rede — decisão do usuário nesta rodada:** esta SPEC permanece OFFLINE. Nenhuma chamada nova ao modelo, em nenhuma circunstância. A taxa se mede sobre as evidências JÁ GRAVADAS (48 células + 7 da comparação + 45 do v4), como o próprio escopo do main.md já exige ("sem gastar chamada nova"). Isso não é só economia: `motor-de-dialogo` está consumindo Groq em paralelo, e o teto de tokens é da ORGANIZAÇÃO, não da chave. Chamada daqui estrangularia a outra SPEC.

**Colisão de claim detectada (R.11):** `motor-de-dialogo` também declara a feature `dialogo`. A colisão é na memória viva (`docs/features/dialogo.md`), não no código. Disciplina obrigatória, por `docs/rules/team.md`:

- Seções compartilhadas (Specs desta feature, Decisões, Alternativas rejeitadas, Gotchas): UMA linha por entrada, prefixada por SPEC-id ou DEC-id. Nunca reordenar linha existente. Conflito de merge vira inserção adjacente trivial.
- Seção "Estado atual" (prosa): PROIBIDO editar concorrentemente. No fechamento, APENDAR `### Delta de estado (SPEC-20260916-2048-semantica-next-action, data)` ao fim da seção.

**Fronteiras dentro de `grade.mjs` — instrução do usuário: não antecipar trabalho de outras SPECs mesmo aparecendo oportunidade no mesmo arquivo.** O arquivo tem três regiões de dono distinto:

- `CHECKS` + self-test — território DESTA SPEC. A checagem nova entra aqui, espelho de C12.
- `LONGITUDINAL_CHECKS` (L1, L2, L3) — território de SPEC-20260916-2257-retencao-de-contexto-na-conversa. NÃO tocar, nem para "melhorar" o limiar de L1 (0.7), que aquela SPEC tem risco registrado de revisar.
- `gradeModel` / `printRows` / `printTable` / `desenhoDoGrupo` — território de SPEC-20260917-1059-metodologia-de-repeticao (agregação por célula, dispersão, N amostras). NÃO introduzir agregação nem dispersão aqui. Se a checagem nova precisar aparecer no relatório, usar o caminho que já existe: `printLegend` itera `CHECKS`, então a entrada de legenda sai de graça, sem editar a camada de relatório.

Ambas as SPECs vizinhas ficaram FORA desta rodada por decisão do usuário: `metodologia-de-repeticao` porque disputaria cota de Groq com `motor-de-dialogo`, e `retencao-de-contexto` porque depende das definições de histórico do `motor-de-dialogo` estabilizarem.

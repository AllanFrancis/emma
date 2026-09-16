# Journal — SPEC-20260916-0109

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-16 01:18
**Onde tô:** contrato aprovado e gravado no main.md; nenhum artefato de eval escrito ainda
**Próximo passo:** escrever `scripts/eval/rubric.md` — a rubrica vem primeiro porque o nível esperado de cada fala do dataset é uma aplicação dela
**Última decisão:** provedor = Groq no tier gratuito (opção b); protótipo normativo para fluxo/conteúdo/regras, livre no visual
**Bloqueio atual:** nenhum — `GROQ_API_KEY` só é necessária a partir da rodada real (fase 5)
**Se retomar, ler:** main.md desta SPEC + `.scratch/prototipo/_decoded/app-inline-1.html` (protótipo decodificado)

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | Rubrica de nível 1–5 (5 critérios, descritores observáveis, evidência obrigatória) | pendente | 2026-09-16 01:09 |
| 2 | Contrato do turno (8 campos) como JSON Schema | pendente | 2026-09-16 01:09 |
| 3 | Dataset ≥40 falas com erros típicos de interferência do português | pendente | 2026-09-16 01:09 |
| 4 | `validate.mjs` — validação estrutural sem gastar API | pendente | 2026-09-16 01:09 |
| 5 | `run.mjs` + rodada real contra ≥2 modelos | pendente | 2026-09-16 01:09 |
| 6 | `grade.mjs` + relatório comparativo + recomendação | pendente | 2026-09-16 01:09 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
- fato: protótipo = 74KB de JS vanilla (não React, apesar de carregar React/Babel); `FLOW` tem exatamente as 21 telas; contrato do turno com 8 campos; `QUOTA = 8`; `STORE = "emma_standalone_v1"`.
- fato: `callModel()` chama a Anthropic direto do browser com `anthropic-dangerous-direct-browser-access` e chave colada pelo usuário; extrai JSON por fatiamento de chaves; `scriptedTurn()` é fallback roteirizado sem chave.
- fato: Groq suporta `response_format: {type:"json_schema", strict:true}` — adesão garantida ao schema (docs console.groq.com/docs/structured-outputs).
- fato: limites de token do Groq são aplicados no nível da ORGANIZAÇÃO, não por chave — rodízio de chaves na mesma conta não rende cota.
- fato: TTS do Groq só tem `canopylabs/orpheus-v1-english` e `canopylabs/orpheus-arabic-saudi` — não há português.
- fato: STT do Groq tem `whisper-large-v3` e `-turbo`, aceita `language` e timestamps por palavra.
- inferência: custo por turno em modelo aberto ~US$ 0,0003–0,001 — estimativa a partir de ~1.500 tokens de entrada e ~250 de saída; NÃO medido, confirmar com `count_tokens` na rodada real.
- dúvida: qual modelo aberto do Groq sustenta os 9 critérios — é exatamente o que esta SPEC responde.
- dúvida: o dataset deve cobrir só o cenário do café (única missão escrita) ou antecipar as outras duas.

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
- `docs/active/SPEC-20260916-0109-rubrica-e-eval-do-motor/{main.md,journal.md}`, `docs/claims/SPEC-20260916-0109-rubrica-e-eval-do-motor.md`

### Onde parei
Contrato gravado. Nada em `scripts/eval/` ainda.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-16 01:09 — init do sistema v4, dissecação do protótipo, 8 decisões de produto, abertura desta SPEC.

## LOG (append-only — NUNCA editar entradas antigas)
<!-- tipos: ativação descoberta decisão tentativa blocker unblock refactor nota conclusão | entrada nova: specctl log -->

## 2026-09-16 01:09 — [ativação] SPEC criada e ativada (--features, branch feature/rubrica-e-eval-do-motor, base main)

## 2026-09-16 01:11 — [nota] Correcao de registro: a entrada de ativacao gravou '--features' no lugar do owner. Causa: no PowerShell, @allan sem aspas e operador de array e foi consumido pelo shell, entao o specctl leu --features como valor de --owner. Owner correto: @allan. Features corretas: dialogo, avaliacao. main.md e claim corrigidos a mao; a entrada de ativacao fica como esta (append-only).

⎿ commit 3a47ed2+dirty · 1 file changed, 2 insertions(+), 5 deletions(-)

## 2026-09-16 01:18 — [decisão] Manifesto docs/programs/emma.md criado dentro da branch da SPEC, nao em PR dedicado. Desvio consciente de rules/programs.md (single-writer via PR dedicado), justificado por team: solo no manifesto - nao ha outro dev com quem coordenar, e separar exigiria commit na main so para uma linha. Decisao do usuario: 'Tudo na branch, uma PR so'. Se o repo virar multi-dev, o manifesto volta a ser editado por PR proprio.

⎿ commit 3a47ed2+dirty · 2 files changed, 6 insertions(+), 6 deletions(-)

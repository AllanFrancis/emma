# Journal — SPEC-20260916-0109

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-16 01:31
**Onde tô:** os 6 artefatos de `scripts/eval/` escritos e exercitados; 4 dos 6 critérios carimbados por `verify` (exit 0). Falta a rodada real e a revisão humana.
**Próximo passo:** rodada real — exportar `GROQ_API_KEY` e rodar `node scripts/eval/run.mjs --model <id>` para ≥2 modelos, depois `grade.mjs` e o relatório com a recomendação
**Última decisão:** `evidence/` vive na pasta da SPEC (formats.md §9), não em `scripts/` — o `run.mjs` descobre o caminho sozinho em vez de hardcodear o id da SPEC
**Bloqueio atual:** nenhum — `GROQ_API_KEY` só é necessária a partir da rodada real (fase 5)
**Se retomar, ler:** main.md desta SPEC + `.scratch/prototipo/_decoded/app-inline-1.html` (protótipo decodificado)

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | Rubrica de nível 1–5 (5 critérios, descritores observáveis, evidência obrigatória) | concluído | 2026-09-16 01:21 |
| 2 | Contrato do turno (8 campos) como JSON Schema | concluído | 2026-09-16 01:21 |
| 3 | Dataset ≥40 falas com erros típicos de interferência do português | concluído | 2026-09-16 01:30 |
| 4 | `validate.mjs` — validação estrutural sem gastar API | concluído | 2026-09-16 01:30 |
| 5 | `run.mjs` + rodada real contra ≥2 modelos | em progresso | 2026-09-16 01:30 |
| 6 | `grade.mjs` + relatório comparativo + recomendação | em progresso | 2026-09-16 01:30 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
- fato: protótipo = 74KB de JS vanilla, `FLOW` com as 21 telas, contrato de 8 campos, `QUOTA = 8`, chave no browser e JSON por fatiamento de chaves — detalhe completo em `docs/features/dialogo.md`.
- fato: Groq suporta `response_format: {type:"json_schema", strict:true}` — adesão garantida ao schema (docs console.groq.com/docs/structured-outputs).
- fato: limites de token do Groq são aplicados no nível da ORGANIZAÇÃO, não por chave — rodízio de chaves na mesma conta não rende cota.
- fato: Groq — TTS só `orpheus-v1-english`/`orpheus-arabic-saudi` (SEM português); STT `whisper-large-v3`/`-turbo` aceita `language` e timestamps por palavra.
- inferência: custo por turno em modelo aberto ~US$ 0,0003–0,001 — estimativa a partir de ~1.500 tokens de entrada e ~250 de saída; NÃO medido, confirmar com `count_tokens` na rodada real.
- dúvida: qual modelo aberto do Groq sustenta os 9 critérios — é exatamente o que esta SPEC responde.
- RESOLVIDA: o dataset cobre 4 contextos (cafe=12, hotel=12, small-talk=12, livre=9), antecipando as 2 missões não escritas. Os cenários vieram do prompt original do usuário ("pedir um café, check-in de hotel, puxar conversa"), não foram inventados.
- fato: 17 das 45 falas (38%) são casos de controle sem nada a corrigir — é o que permite medir sobre-correção, o principal modo de falha que o usuário nomeou.
- inferência: `moonshotai/kimi-k2-instruct` e `openai/gpt-oss-20b` são candidatos válidos — apareceram nos exemplos oficiais de structured outputs do Groq, mas NÃO foram confirmados contra o catálogo vivo.

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
Ferramental verde sem gastar cota (`validate` 0/0 · `run --dry` 45 payloads · `grade --self-test` 0 falhas). Os 2 critérios restantes são `evidence: manual @allan`: dependem da rodada real e da leitura humana, não de mais código.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-16 01:09 — init do sistema v4, dissecação do protótipo, 8 decisões de produto, abertura desta SPEC.

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

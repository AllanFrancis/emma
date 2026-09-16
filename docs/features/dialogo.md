# Feature: dialogo

**Keywords:** motor de diálogo, contrato do turno, system prompt, personalidade, missões, groq
**Arquivos principais:**
  - —
**Resumo:** Motor de conversa da Emma — system prompt, contrato JSON do turno e catálogo de missões.

## Specs desta feature
### Concluídas
- SPEC-20260916-0109 | 2026-09-16 | `06b391c` | Rubrica de nível e eval do motor de diálogo
### Planejadas (future/)
—

## Estado atual

Nada implementado no app. O repositório é um scaffold TanStack Start sem código de produto.

Existe uma implementação de referência no protótipo (`.scratch/prototipo/Emma - App Standalone.html`,
74 KB de JS vanilla), que é normativa para fluxo, conteúdo e comportamento — não para a forma:

- `systemPrompt()` monta as regras pedagógicas em pt-BR, injetando nível estimado, objetivo e
  cenário da missão, motivo e bloqueio do aluno, pontos recentes de melhoria e o tom escolhido
  (tranquila | direta).
- O contrato do turno tem 8 campos: `reply_en`, `reply_pt`, `instruction_pt`, `correction_pt`,
  `suggestion_en`, `suggestion_pt`, `words[]`, `focus`.
- `callModel()` chama a API direto do browser com a chave colada pelo usuário; `scriptedTurn()` é
  o fallback sem chave, devolvendo turnos pré-escritos a partir de `MISSIONS[].script[]`.
- `MISSIONS` traz a missão do café completa (3 etapas roteirizadas com correção e sugestão);
  as outras duas missões da Fase 1 ainda não existem.

### Delta de estado (SPEC-20260916-0109, 2026-09-16 03:31)

O contrato dos 8 campos agora está formalizado e validado em `scripts/eval/turn-schema.json`.
Um dataset versionado de 45 falas comparou `openai/gpt-oss-20b` e `openai/gpt-oss-120b` sob o
mesmo prompt. O `gpt-oss-20b` foi escolhido para a Fase 1: teve zero falhas de contrato em 45
chamadas e sobre-corrigiu menos, embora omita algumas correções relevantes. A avaliação também
confirmou que o tier gratuito é limitado por tokens por minuto no nível da organização.

## Decisões arquiteturais ativas
- DEC-20260916-0310-modelo-dialogo [ativa] (SPEC-20260916-0109) — usar `openai/gpt-oss-20b` na Fase 1; prioriza tato e confiabilidade sobre a maior taxa de correção do 120b.
- DEC-20260916-0311-fallback-json [ativa] (SPEC-20260916-0109) — falha `json_validate_failed` recebe retry e depois cai em `scriptedTurn()`; um turno nunca morre na interface.
- DEC-20260916-0312-fala-transcrita [ativa] (SPEC-20260916-0109) — o prompt declara que a entrada é fala transcrita, impedindo correções de maiúsculas e pontuação inexistentes na fala.

## Alternativas consideradas e rejeitadas
- SPEC-20260916-0109 | `openai/gpt-oss-120b` como modelo da Fase 1 — rejeitada em 2026-09-16 03:31. Teve duas falhas `json_validate_failed` e mais sobre-correções pedagogicamente nocivas.
- SPEC-20260916-0109 | `qwen/qwen3.8-27b` no tier gratuito — rejeitada em 2026-09-16 01:44. O limite de taxa interrompeu a rodada na segunda chamada.

## Gotchas
- SPEC-20260916-0109 | `strict: true` não garante resposta utilizável (2026-09-16 01:55) — o Groq pode devolver HTTP 400 `json_validate_failed`; mantenha fallback explícito.
- SPEC-20260916-0109 | limites do Groq são compartilhados pela organização (2026-09-16 02:09) — paralelizar chamadas ou alternar chaves da mesma conta não amplia a cota.

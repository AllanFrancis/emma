# Feature: avaliacao

**Keywords:** rubrica, nível, diagnóstico, evidências, proficiência
**Arquivos principais:**
  - —
**Resumo:** Estimativa e evolução do nível de proficiência do aluno, por rubrica auditável com evidências.

## Specs desta feature
### Concluídas
- SPEC-20260916-0109 | 2026-09-16 | `06b391c` | Rubrica de nível e eval do motor de diálogo
### Planejadas (future/)
- SPEC-20260916-1652-nucleo-pedagogico | Núcleo pedagógico — as regras que não pertencem ao LLM | Compartilhado com `pedagogia`; implementa mediana, teto e histerese como código testável
- SPEC-20260916-1652-diagnostico-inicial | Diagnóstico inicial — primeira vitória e primeira amostra | Substitui a heurística `hasPolite` pela rubrica com evidência citada

## Estado atual

Nada implementado no app.

O protótipo (`.scratch/prototipo/Emma - App Standalone.html`) estima nível por heurística em
`diagnose()`: procura marcas de polidez na fala do aluno (`hasPolite`) e classifica a partir disso.
Isso mede polidez, não proficiência, e foi explicitamente rejeitado pelo usuário como base para o
produto.

O nível autoavaliado no onboarding (`QUESTIONS.nivel`, 5 opções) é ponto de partida declarado,
nunca classificação definitiva — a avaliação deve evoluir ao longo do uso, não ficar presa ao
diagnóstico inicial. `LADDER` nomeia as faixas exibidas ao aluno: Começando agora, Básico,
Intermediário, Conversa solta.

### Delta de estado (SPEC-20260916-0109, 2026-09-16 03:31)

A avaliação agora possui uma rubrica auditável de níveis 1–5 em `scripts/eval/rubric.md`, cobrindo
vocabulário, gramática, construção de frases, compreensão e sustentação de conversa. Toda
classificação exige evidências citadas da fala; critério sem amostra suficiente permanece `null`.
O conjunto de referência contém 45 falas em quatro contextos, incluindo 17 controles sem erro para
medir sobre-correção.

## Decisões arquiteturais ativas
- DEC-20260916-0313-nivel-mediana [ativa] (SPEC-20260916-0109) — calcular o nível pela mediana dos cinco critérios, com teto quando sustentação de conversa ficar dois ou mais níveis abaixo.
- DEC-20260916-0314-evidencia-obrigatoria [ativa] (SPEC-20260916-0109) — classificação sem trecho citado da fala é inválida; ausência de amostra produz `null`, nunca estimativa inventada.
- DEC-20260916-0315-histerese-nivel [ativa] (SPEC-20260916-0109) — promoção exige duas reavaliações consecutivas e rebaixamento exige três, reduzindo impacto de variação ocasional.

## Alternativas consideradas e rejeitadas
- SPEC-20260916-0109 | inferir proficiência por polidez ou perguntar o nível diretamente ao modelo — rejeitada em 2026-09-16 01:21. Não é auditável nem mede sustentação de conversa.

## Gotchas
- SPEC-20260916-0109 | grader mecânico pode classificar idioma incorretamente (2026-09-16 01:58) — inspecione manualmente os casos reprovados antes de divulgar percentuais.
- SPEC-20260916-0109 | rodada com um turno isolado não mede coerência longitudinal (2026-09-16 03:31) — trate a recomendação desta SPEC como decisão da Fase 1, não validação definitiva de conversas completas.

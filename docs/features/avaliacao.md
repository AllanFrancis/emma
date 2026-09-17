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
- DEC-20260917-0002-amostragem-controlada [ativa] (SPEC-20260916-2048-metodologia-de-eval) — `temperature` fixada em 1 (o default da API, sob o qual as 215 evidências arquivadas foram geradas) e `seed` fixado em 20260916, ambos explícitos no payload e gravados na evidência junto com `seed_efetivo` (`x_groq.seed`) e `system_fingerprint`. Não se usa temperature 0: além de degradar naturalidade, o Groq a converte para 1e-8 e a quebra de comparabilidade com o histórico custaria mais do que a variância removida. `--temperature`/`--seed` permitem variar de propósito, com o valor usado sempre na evidência.
- DEC-20260917-0003-timeout-derivado [ativa] (SPEC-20260916-2048-metodologia-de-eval) — timeout de requisição em 30s, derivado das 215 evidências com `usage`: parede máxima observada 2,91s (p99 2,39s) e pior caso estimado de geração ~8,5s (3.433 tokens no throughput p1 de 403 tok/s). Rodada sem timeout é indistinguível de rodada lenta — a da matriz pendurou ~15min em `livre-09-n4-direta`.

## Alternativas consideradas e rejeitadas
- SPEC-20260916-0109 | inferir proficiência por polidez ou perguntar o nível diretamente ao modelo — rejeitada em 2026-09-16 01:21. Não é auditável nem mede sustentação de conversa.

## Gotchas
- SPEC-20260916-0109 | grader mecânico pode classificar idioma incorretamente (2026-09-16 01:58) — inspecione manualmente os casos reprovados antes de divulgar percentuais.
- SPEC-20260916-0109 | rodada com um turno isolado não mede coerência longitudinal (2026-09-16 03:31) — trate a recomendação desta SPEC como decisão da Fase 1, não validação definitiva de conversas completas.

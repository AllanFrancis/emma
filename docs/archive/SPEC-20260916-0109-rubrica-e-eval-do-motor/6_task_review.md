# Review: Task 6 - Grader, relatório comparativo e recomendação (ciclo 3 final)

**Revisor**: AI Code Reviewer
**Data**: 2026-09-16
**Arquivo da task**: fase 6 do SNAPSHOT em `journal.md` (não existe `6_task.md`)
**Status**: APROVADO COM OBSERVAÇÕES

## Resumo

A fase 6 está apta para encerramento. O major do ciclo 2 foi corrigido: o prompt v3 foi restaurado e o dry-run compara o prompt gerado com a evidência versionada, passando tanto para `openai/gpt-oss-20b` quanto para `openai/gpt-oss-120b`. Os três minors também foram tratados: o primeiro 429 é persistido antes do retry, o identificador novo do validador está em inglês e o relatório descreve C1 como validação contra o JSON Schema.

Não foram encontrados problemas CRITICAL ou MAJOR novos. Resta apenas uma melhoria opcional no guard de reprodutibilidade: ele compara diretamente a primeira fala (`cafe-01`), embora monte os 45 payloads. Isso não invalida a rodada atual, pois o prompt restaurado corresponde às evidências e a tabela permaneceu idêntica.

## Arquivos Revisados

| Arquivo | Status | Problemas |
|---------|--------|-----------|
| `scripts/eval/grade.mjs` | ✅ OK | 0 |
| `scripts/eval/turn-validator.mjs` | ✅ OK | 0 |
| `scripts/eval/run.mjs` | ✅ OK | 1 observação minor |
| `scripts/eval/validate.mjs` | ✅ OK | 0 |
| `docs/active/SPEC-20260916-0109-rubrica-e-eval-do-motor/relatorio.md` | ✅ OK | 0 |
| `docs/active/SPEC-20260916-0109-rubrica-e-eval-do-motor/evidence/` | ✅ OK | 0 |

## Problemas Encontrados

### 🔴 Problemas Críticos

Nenhum problema crítico encontrado.

### 🟡 Problemas Major

Nenhum problema major encontrado.

### 🟢 Problemas Minor

1. **O guard do dry-run verifica diretamente apenas a primeira evidência** — `scripts/eval/run.mjs:167-177`.

   `printDryRun` monta os 45 payloads, mas chama `assertPromptMatchesEvidence` somente para `records[0]`. A comparação atual já prova que o texto estático do prompt v3 e o cenário inicial foram restaurados; como os cenários e níveis variam, comparar cada registro tornaria o guard mais resistente a futuras alterações parciais.

   Melhoria opcional:

   ```js
   for (const record of records) {
     const payload = buildPayload(record, schema, model, tone);
     assertPromptMatchesEvidence(record, model, payload);
   }
   ```

## ✅ Destaques Positivos

- O prompt v3 voltou a corresponder ao payload versionado das evidências.
- O dry-run falha explicitamente se o prompt atual divergir da evidência existente.
- A primeira ocorrência de rate limit é salva antes da espera e do retry; se o retry também falhar, ambas as tentativas ficam preservadas.
- C1 usa o validador compartilhado e cobre campos obrigatórios, extras, tipos, arrays e `maxItems`.
- C3 falha fechado para correções não contáveis e para mais de três correções.
- O relatório é transparente sobre as duas falhas históricas sem corpo preservado e não as trata como placar auditável.
- O aceite humano está registrado com citação literal.
- A tabela final continua exatamente igual à publicada para as 90 respostas válidas.
- Os arquivos centrais usam nomes em inglês, funções pequenas e formatação aprovada pelo lint.

## Conformidade com Padrões

| Padrão | Status |
|--------|--------|
| Padrões de Código | ✅ |
| Node.js/ESM | ✅ |
| Contrato JSON Schema | ✅ |
| Persistência e auditabilidade | ✅ |
| Reprodutibilidade do prompt | ✅ |
| Typecheck | ✅ |
| Testes específicos | ✅ |
| Lint isolado dos quatro executáveis | ✅ |
| Verificação SDD (`verify --all`) | ✅ |
| Testes do manifesto | ⚠️ comando `test` não configurado; limitação de tooling, não falha da tarefa |

## Validações Executadas

- `node scripts/eval/run.mjs --dry --model openai/gpt-oss-20b` — PASS; prompt reproduz `cafe-01`.
- `node scripts/eval/run.mjs --dry --model openai/gpt-oss-120b` — PASS; prompt reproduz `cafe-01`.
- `node scripts/eval/grade.mjs --self-test` — PASS, 9 casos, 10 checagens, 0 falhas.
- `node scripts/eval/grade.mjs` — PASS, 45 respostas por modelo e tabela idêntica ao relatório.
- `node scripts/eval/validate.mjs --all` — PASS, 0 erros e 0 avisos.
- `bun x eslint scripts/eval/grade.mjs scripts/eval/run.mjs scripts/eval/validate.mjs scripts/eval/turn-validator.mjs` — PASS.
- `bun x tsc --noEmit` — PASS.
- `node scripts/specctl.mjs verify SPEC-20260916-0109-rubrica-e-eval-do-motor --all` — PASS.
- `git diff --check` nos arquivos revisados — PASS.

## Recomendações

1. Opcionalmente, ampliar `assertPromptMatchesEvidence` para todas as falas no dry-run; isso fortalece o guard sem exigir novas chamadas de API.
2. Manter a regra de “fala transcrita” como requisito da Fase 1, sem alterar retroativamente o prompt v3 deste experimento.

## Veredito

**APROVADO COM OBSERVAÇÕES.** Não há CRITICAL ou MAJOR pendente. A implementação atende aos requisitos da fase 6, as evidências sustentam a tabela e a recomendação, o aceite humano está registrado e todas as validações disponíveis passaram. A observação sobre comparar as 45 evidências no dry-run é melhoria defensiva e não bloqueia o fechamento da SPEC.

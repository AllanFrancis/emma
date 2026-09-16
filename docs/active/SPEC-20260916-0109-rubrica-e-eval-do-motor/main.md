# SPEC-20260916-0109: Rubrica de nível e eval do motor de diálogo

**Status:** active
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 01:09
**Ativada:** 2026-09-16 01:09
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** rubrica, eval, nivel, groq, contrato-do-turno
**Features:** dialogo, avaliacao
**Branch:** feature/rubrica-e-eval-do-motor
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 01:09
**Resumo:** Define a rubrica de avaliação de nível e mede com dados se um modelo aberto do Groq sustenta a conversa pedagógica da Emma.

## Objetivo

Transformar a estimativa de nível de heurística em rubrica auditável com evidências, e medir
empiricamente se os modelos abertos servidos pelo Groq atendem os 9 critérios de qualidade de
conversa definidos pelo usuário. A saída é uma recomendação de modelo para o MVP, sustentada por
um dataset versionado — antes de qualquer investimento em interface.

## Escopo

**DENTRO:**
- Rubrica de nível 1–5 com critérios observáveis: vocabulário, gramática, construção de frases, compreensão e sustentação de conversa; classificação exige evidência citada da fala do aluno
- Dataset versionado de ≥40 falas de aluno brasileiro com erros típicos de interferência do português
- Contrato do turno (os 8 campos) formalizado como JSON Schema, aplicado via `response_format: {type: "json_schema", strict: true}`
- Runner standalone que executa o dataset contra ≥2 modelos e persiste as saídas cruas
- Grade dos 9 critérios: checagens mecânicas + julgamento humano nos subjetivos
- Relatório comparativo e recomendação de modelo, registrada como decisão no LOG

**FORA:**
- Qualquer tela ou componente de UI (Fase 1)
- Server function de produção, cota, auth, persistência (Fase 1/2)
- TTS/STT, identidade vocal e consentimento de áudio (Fase 3)
- Escrita das 2 missões faltantes — conteúdo pendente que bloqueia `conversa-e-missoes`, não esta SPEC
- Escolha de provedor multilíngue pago para voz

## Invariantes

- NUNCA commitar chave de API — a chave vive em variável de ambiente local, fora do repositório.
- SEMPRE que a rubrica classificar um nível, a saída carrega evidência citada da fala do aluno; classificação sem evidência é inválida por definição.
- NUNCA afirmar qualidade de um modelo sem apontar o dataset versionado e as saídas que a produziram.

## Implementação

Tudo standalone em `scripts/eval/`, sem acoplamento ao app — Node puro, executável sem subir a
aplicação.

- `rubric.md` — a rubrica de nível: 5 faixas × 5 critérios, com descritores observáveis e a exigência de evidência. Documento de produto, revisado por humano.
- `dataset.jsonl` — uma fala por linha: texto do aluno, nível esperado e o que uma boa correção deveria capturar. Versionado; é a base de qualquer afirmação de qualidade.
- `turn-schema.json` — os 8 campos do contrato do turno como JSON Schema com `additionalProperties: false`, consumido pelo `strict: true` do Groq.
- `run.mjs` — dispara o dataset contra os modelos candidatos pelo endpoint OpenAI-compatível do Groq (`/openai/v1/chat/completions`), persistindo cada resposta crua em `evidence/<modelo>/`.
- `grade.mjs` — aplica as checagens mecânicas dos 9 critérios e monta a tabela comparativa.
- `validate.mjs` — valida a estrutura do dataset e do schema sem gastar chamada de API.

**Grading híbrido, porque metade dos 9 critérios não é mecanizável.**
Mecânico: JSON válido contra o schema · no máximo 3 correções por turno · `reply_en` termina em
pergunta · `instruction_pt` presente e em português · `correction_pt` vazio quando não há erro
relevante · vocabulário compatível com o nível.
Humano (@allan): responde primeiro ao significado · conversa natural, não aula de gramática ·
corrige só o que importa · personalidade consistente · não soa artificial.

**A cota do tier gratuito é restrição de design, não detalhe.** Dataset pequeno, execução
incremental com retomada, e toda saída persistida em `evidence/` — nada é re-executado só para
reler resultado.

### Modelo de dados

— Nenhuma mudança de dados no app. Todos os artefatos são arquivos versionados no repositório.

<!-- Alternativas consideradas e REJEITADAS:
  - Perguntar o nível direto ao modelo ("qual o nível deste aluno?") — rejeitado pelo usuário:
    sem critérios, a resposta não é auditável nem reproduzível.
  - Manter a heurística hasPolite do protótipo — rejeitado: mede polidez, não proficiência.
  - Avaliar direto na UI da Fase 1 — rejeitado: acopla a medição ao que ela deveria decidir. -->

## Riscos

- Modelo aberto falha nos critérios sutis (corrigir só o que importa, não virar aula de gramática) — mitigação: é exatamente o que o eval existe para descobrir; resultado negativo é resultado válido e barato, e reabre a decisão de provedor antes da Fase 1.
- Limite diário do tier gratuito interrompe uma rodada — mitigação: dataset de ~40 itens, execução incremental com retomada, saídas persistidas.
- Falas escritas pelo autor enviesam o resultado — mitigação: erros derivados de padrões documentados de interferência do português, não improvisados.

## Sinais de sucesso

- O modelo do MVP é escolhido olhando uma tabela comparativa, não uma intuição.
- A rubrica aplicada por outra pessoa, sem contexto, produz a mesma classificação.
- Se o resultado for negativo, isso aparece agora — com 4 arquivos escritos, não com 21 telas.

## Critério de aceite

- [ ] Rubrica de nível 1–5 documentada, com descritores observáveis por critério e exigência de evidência | evidence: manual @allan
- [ ] Dataset com ≥40 falas versionado e estruturalmente válido | verify: `node scripts/eval/validate.mjs`
- [ ] Contrato do turno em JSON Schema, com additionalProperties false, validado | verify: `node scripts/eval/validate.mjs --schema`
- [ ] Runner executa o dataset contra ≥2 modelos e persiste as saídas em evidence/ | verify: `node scripts/eval/run.mjs --dry`
- [ ] Checagens mecânicas dos 9 critérios implementadas e verdes no conjunto de referência | verify: `node scripts/eval/grade.mjs --self-test`
- [ ] Relatório comparativo e recomendação de modelo revisados pelo usuário | evidence: manual @allan

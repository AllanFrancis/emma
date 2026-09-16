# Feature: avaliacao

**Keywords:** rubrica, nível, diagnóstico, evidências, proficiência
**Arquivos principais:**
  - —
**Resumo:** Estimativa e evolução do nível de proficiência do aluno, por rubrica auditável com evidências.

## Specs desta feature
### Concluídas
—
### Planejadas (future/)
—

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

## Decisões arquiteturais ativas
—

## Alternativas consideradas e rejeitadas
—

## Gotchas
—

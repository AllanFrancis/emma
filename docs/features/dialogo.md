# Feature: dialogo

**Keywords:** motor de diálogo, contrato do turno, system prompt, personalidade, missões, groq
**Arquivos principais:**
  - —
**Resumo:** Motor de conversa da Emma — system prompt, contrato JSON do turno e catálogo de missões.

## Specs desta feature
### Concluídas
—
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

## Decisões arquiteturais ativas
—

## Alternativas consideradas e rejeitadas
—

## Gotchas
—

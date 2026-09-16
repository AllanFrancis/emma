# Feature: pedagogia

**Keywords:** núcleo pedagógico, PedagogicalIntent, política de nível, política de suporte, priorização de correção, máquina de missão
**Arquivos principais:**
  - —
**Resumo:** Decide O QUE ensinar — nível, quanto português, o que corrigir e quando a missão avança — separado de quem fala com o modelo.

## Specs desta feature
### Concluídas
—
### Planejadas (future/)
- SPEC-20260916-1652-nucleo-pedagogico | Núcleo pedagógico — as regras que não pertencem ao LLM | Primeira linha de código de produto; define a forma do perfil e do Intent que todas as camadas consomem

## Estado atual

Nada implementado. A área existe porque a §3 do PROMPT DE DESENVOLVIMENTO exige uma única
inteligência pedagógica, separada de personalidade e de canal, e a §11 exige que regra de domínio
seja dado e política explícita em vez de texto de prompt.

Hoje toda decisão pedagógica mora em duas prosas: o `systemPrompt()` do protótipo e o prompt v4 do
eval em `scripts/eval/run.mjs`. As duas funcionam por instrução ao modelo, e a evidência da
SPEC-20260916-1450 mostrou que instrução não basta — o modelo roteou correção para `suggestion_en`
em 4 de 28 casos, inclusive nos dois que o prompt nomeia literalmente como "corrija TAMBÉM".

O que já existe como insumo, e é o que torna esta área implementável:
- `scripts/eval/rubric.md` — a rubrica de nível N1–N5 × 5 critérios, com descritores observáveis e evidência obrigatória.
- `scripts/eval/turn-schema.json` — o contrato do turno v2, que será a fonte única dos tipos.
- As políticas de nível já decididas em `avaliacao`: mediana com teto e histerese.

## Decisões arquiteturais ativas
—

## Alternativas consideradas e rejeitadas
—

## Gotchas
—

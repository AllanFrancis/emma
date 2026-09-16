# SPEC-20260916-1450: Contrato do turno v2 — corrections[] estruturado

**Status:** active
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 14:50
**Ativada:** 2026-09-16 14:50
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** contrato-do-turno, corrections, next-action, schema, eval
**Features:** dialogo
**Branch:** feature/contrato-do-turno-v2
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 14:50
**Resumo:** Migra o contrato do turno de `correction_pt` string para `corrections[]` estruturado com `next_action`, e revalida o dataset de 45 falas sob o novo contrato.

## Objetivo

O contrato de 8 campos planos foi validado em 90 turnos, mas trata correção como texto livre: o
teto de 3 correções só é medível por heurística de string e o avanço da missão fica implícito na
prosa do modelo. O PROMPT DE DESENVOLVIMENTO (§12) especifica `corrections[]` estruturado e
`next_action`, o que torna as duas regras exatas e tira do LLM a decisão de quando a missão avança.
Esta SPEC fecha esse contrato antes de qualquer código de produto, porque ele é a interface entre
núcleo pedagógico, motor de diálogo e UI — mudá-lo depois custa retrabalho nas três camadas.

## Escopo

**DENTRO:**
- `turn-schema.json` v2: `corrections[]` de objetos (`original`, `suggested`, `explanation_pt`, `category`), `next_action` como enum, `maxItems: 3` em `corrections` e `words`, `additionalProperties: false` em todos os níveis
- Suporte a `enum` no validador de turno (hoje só cobre `type`, `required`, `additionalProperties` e `maxItems`)
- Validação de evidência: `corrections[].original` tem de ocorrer literalmente na fala do aluno
- Prompt v4 no runner, declarando o contrato v2 e preservando as três vias de decisão de correção do v3
- Grader migrado: teto de correções passa de heurística de string para contagem exata do array; duas checagens novas (evidência citada e coerência de `next_action`)
- Revalidação do dataset de 45 falas em `openai/gpt-oss-20b` sob o contrato v2, com evidência persistida

**FORA:**
- Qualquer tela, componente ou server function de produção (Fase 1)
- O núcleo pedagógico que consome o `PedagogicalIntent` (SPEC 1.1)
- Matriz de personalidade nível x tom (SPEC 0.2) e conversa multiturno (SPEC 0.3)
- Reexecução do `gpt-oss-120b` — a escolha de modelo da Fase 1 já está decidida e não é reaberta aqui
- Tradução do contrato para tipos TypeScript do app

## Invariantes

- SEMPRE toda correção cita evidência: `corrections[].original` ocorre literalmente na fala do aluno; correção sem evidência é saída inválida, não correção fraca.
- NUNCA mais de 3 correções por turno — recusado pelo schema, não pedido por instrução.
- NUNCA afirmar qualidade de modelo sem apontar o dataset versionado e as evidências que a produziram.
- SEMPRE o schema recusa campo desconhecido em todos os níveis, inclusive dentro de `corrections[]`.
- NUNCA commitar chave de API — `GROQ_API_KEY` vive em variável de ambiente da sessão.

## Implementação

Tudo segue standalone em `scripts/eval/`, Node puro, sem acoplamento ao app — o contrato é
artefato de dados, e o produto vai consumi-lo depois.

- `turn-schema.json` — `correction_pt` (string) sai; entram `corrections` (array de objeto) e `next_action` (enum de 4 valores). `category` classifica a correção, o que permite priorizar por tipo em vez de truncar por ordem de chegada.
- `turn-validator.mjs` — ganha `enum`; ganha `validateEvidence(turn, utterance)`, que é semântico e por isso fica separado do schema.
- `validate.mjs` — lista de campos esperados atualizada; novo `--self-test` que prova que cada classe de violação é recusada.
- `run.mjs` — prompt v4. As três vias de decisão do v3 são preservadas na letra, porque foram elas que moveram C5 e C7 entre v1 e v3; só a instrução de formato muda.
- `grade.mjs` — C3 passa a contar `corrections.length`; C4 e C5 leem o array; entram C11 (evidência citada) e C12 (não pede repetição em caso de controle). Novo `--assert-contract`, que sai diferente de zero se faltar evidência ou se algum turno violar o contrato.

**Por que `next_action` sai do LLM na decisão final.** O modelo propõe; o núcleo decide. Um
`complete_mission` na etapa 2 de 4 é recusado pelo núcleo, não obedecido. Nesta SPEC o campo é só
contratado e medido; quem o valida contra a etapa real é a SPEC 1.1.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| Turno (contrato do LLM) | REMOVE `correction_pt: string`; ADICIONA `corrections` (array de objeto, máx 3) e `next_action` (enum de 4 valores) |
| `corrections[]` | novos campos obrigatórios: `original`, `suggested`, `explanation_pt`, `category` |
| `corrections[].category` | novo enum: `grammar`, `vocabulary`, `word_order`, `preposition`, `false_friend`, `register` |
| `dataset.jsonl` | sem mudança de formato — o dataset descreve a fala do aluno, não a saída do modelo |

<!-- Alternativas consideradas e REJEITADAS:
  - Manter `correction_pt` string e adiar `corrections[]`: preserva as 90 evidências, mas contradiz
    a §12 e mantém o teto de 3 dependente de heurística de string, que devolve Infinity quando não
    reconhece o formato — hoje um turno bem corrigido em prosa livre reprova em C3 sem ter erro.
  - Adotar a §12 sem revalidar: a recomendação do gpt-oss-20b passaria a se apoiar em evidência de
    um contrato que não é mais o do produto.
  - Manter os dois contratos em paralelo com adapter: dobra a superfície de validação para
    beneficiar código de produto que ainda não existe.
-->

## Riscos

- `corrections[]` aninhado pode ser recusado pelo strict mode do Groq, como já se suspeitou de `maxItems` — mitigação: `--dry` monta o payload e a primeira rodada real confirma; fallback já decidido em DEC-20260916-0311.
- Modelo pode preencher `original` com paráfrase em vez de trecho literal, reprovando em massa na checagem de evidência — mitigação: o prompt v4 pede trecho literal e a rodada mede; se reprovar muito, o ajuste é de prompt, e a evolução v1 para v3 já provou que esse número se move por instrução.
- Revalidação depende de `GROQ_API_KEY`, ausente no ambiente atual — mitigação: todo o resto é verificável offline; a rodada é o único critério que exige a chave.
- Sobre-correção pode aumentar, porque um array convida a preencher mais de um item — mitigação: os 17 casos de controle medem exatamente isso, e C4 reprova.

## Sinais de sucesso

- O teto de 3 correções deixa de ser estimado e passa a ser exato: C3 mede `corrections.length`, sem heurística de string e sem `Infinity`.
- Toda correção da rodada real cita trecho literal da fala do aluno — a mesma exigência de evidência que já vale para a rubrica passa a valer para a correção.
- O contrato fica estável o suficiente para a SPEC 1.1 ser escrita contra ele sem renegociação.

## Critério de aceite

- [x] `turn-schema.json` declara `corrections[]` com os 4 campos obrigatórios e `category` em enum, `next_action` em enum de 4 valores, `maxItems: 3` em `corrections` e `words`, e recusa campo desconhecido em todos os níveis (2026-09-16 15:00, commit `603d025`, verify: exit 0) | verify: `node scripts/eval/validate.mjs --schema`
- [x] O validador recusa cada classe de violação do contrato: 4a correção, categoria fora do enum, `next_action` inválido, campo extra dentro de `corrections[]` e correção cujo `original` não ocorre na fala do aluno (2026-09-16 15:00, commit `603d025`, verify: exit 0) | verify: `node scripts/eval/validate.mjs --self-test`
- [x] O dataset de 45 falas segue válido e os 17 casos de controle continuam medindo sobre-correção sob o contrato v2 (2026-09-16 15:00, commit `603d025`, verify: exit 0) | verify: `node scripts/eval/validate.mjs --all`
- [x] O prompt v4 declara o contrato v2, preserva as três vias de decisão de correção do v3 e monta os 45 payloads sem gastar cota (2026-09-16 15:00, commit `603d025`, verify: exit 0) | verify: `node scripts/eval/run.mjs --dry`
- [x] O grader lê o formato v2, conta correções pelo array e as 12 checagens se comportam como especificado (2026-09-16 15:00, commit `603d025`, verify: exit 0) | verify: `node scripts/eval/grade.mjs --self-test`
- [x] Rodada real de 45 falas em `openai/gpt-oss-20b` sob o contrato v2, com zero falha de contrato e evidência persistida em `evidence/` (2026-09-16 16:28, commit `1bae4c0`, verify: exit 0) | verify: `node scripts/eval/grade.mjs --assert-contract`
- [ ] Leitura humana confirma que as correções do contrato v2 não pioraram em tato nem em sobre-correção frente ao v3 | evidence: manual @allan

# Feature: personalidade

**Keywords:** estilo, tom, intensidade, TeacherPreferences, invariância pedagógica, tranquila, direta
**Arquivos principais:**
  - —
**Resumo:** Decide COMO comunicar — tom, intensidade e encorajamento — sem nunca alterar a verdade pedagógica.

## Specs desta feature
### Concluídas
—
### Planejadas (future/)
- SPEC-20260916-1652-eval-personalidade | Eval de personalidade — mesma pedagogia, estilos diferentes | Mede a invariância antes de a camada existir; é o critério de sucesso §22.5 do MVP
- SPEC-20260916-1652-camada-de-personalidade | Camada de personalidade — estilo depois do LLM | Torna a invariância propriedade estrutural em vez de pedido ao modelo

## Estado atual

Nada implementado. A área tem doc próprio porque carrega a invariante mais frágil do produto: **a
personalidade não pode modificar a verdade pedagógica** (§3, §6, §9). Diluir isso num doc que fala
de outra coisa era o risco.

O protótipo trata personalidade como `isDirect()` — um booleano derivado de comparação de string —
e injeta o tom no `systemPrompt()`. A §6 proíbe explicitamente a implementação simplista
`patient = true` e pede um conceito extensível de preferências da professora.

**A evidência já mostrou por que o estilo não pode morar no prompt.** Na eval da
SPEC-20260916-0109, o `gpt-oss-120b` — que a tabela mecânica favorecia em taxa de correção —
corrigiu a maiúscula de "english" na fala `Sorry, my english is very bad`, de um aluno que acabara
de declarar vergonha do próprio inglês, e corrigiu `can you repeat please` de quem tinha acabado de
dizer que não entendeu. Tom mais rigoroso virou mais correção e pior pedagogia. Se o estilo entra no
prompt, a invariância depende de obediência do modelo.

Dois estilos estão definidos no protótipo e são normativos em conteúdo: **Tranquila** ("Paciente.
Reconhece o que deu certo antes de corrigir.") e **Direta** ("Sem rodeios. Corrige na hora e cobra a
repetição."). O protótipo também já varia a expressão visual do rosto por estilo (`stern` contra
`smile`), o que é personalidade aparecendo onde não afeta pedagogia — e portanto correto.

## Decisões arquiteturais ativas
—

## Alternativas consideradas e rejeitadas
—

## Gotchas
—

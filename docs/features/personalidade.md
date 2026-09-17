# Feature: personalidade

**Keywords:** estilo, tom, intensidade, TeacherPreferences, invariância pedagógica, tranquila, direta
**Arquivos principais:**
  - —
**Resumo:** Decide COMO comunicar — tom, intensidade e encorajamento — sem nunca alterar a verdade pedagógica.

## Specs desta feature
### Concluídas
- SPEC-20260916-1652 | 2026-09-16 | `e4ecf53` | Eval de personalidade — matriz tom × nível e comparação controlada v4 × v5
### Planejadas (future/)
- SPEC-20260916-2048-tom-versus-pedagogia | Tom versus pedagogia | Decide se a assimetria medida é efeito de tom ou variância de geração
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

### Delta de estado (SPEC-20260916-1652, 2026-09-16 20:52)

Primeira medição do tom. Matriz de 48 células — 12 falas × {nível 1, 4} × {tranquila, direta}:

| tom | correções emitidas | C4 (não corrige controle) | C5 (corrige quando há) |
|---|---|---|---|
| direta | 24 | 75% | 94% |
| tranquila | 22 | 63% | 75% |

Total de correções praticamente igual, então **não** é "direta corrige mais". A `direta` é mais
acertada nas duas pontas, e 4 das 5 falhas de C5 são do tom `tranquila`.

**Status: HIPÓTESE sustentada pelos resultados, não conclusão** (determinação do usuário em
2026-09-16 20:43). Há interação aparente entre tom e comportamento pedagógico. Não está
estabelecida: nenhuma rodada fixou `seed` ou `temperature`, cada célula foi n=1, e nos 6 casos de
quantidade divergente a direção foi MISTA — assinatura de amostragem. Execuções repetidas do mesmo
modelo sob o mesmo desenho não são observações independentes e não provam causalidade.

Decomposição das divergências (24 pares fala × nível): 5 idênticos · 5 divergem só na redação de
`focus` (texto livre comparado por igualdade exata — erro de desenho da asserção) · 4 divergem só
no rótulo de `category` com `suggested` idêntico · 4 divergem no texto da correção · 6 divergem na
quantidade. **Divergência real no que se ensina: 10 de 24.**

Dois critérios desta SPEC ficaram deferidos com autorização (R.6.2) porque a medição encontrou
divergência real: invariância e teto. Ambos migram para a SPEC-20260916-2048-tom-versus-pedagogia.

Violação candidata, não confirmada: `livre-02 n1 tranquila` corrigiu "english" → "English" com
`next_action: retry`, contra a DEC-20260916-0312 que está explícita no prompt. Ocorreu em 1 de 4
células.

## Decisões arquiteturais ativas
- DEC-20260916-2050-invariancia-por-nivel [ativa] (SPEC-20260916-1652) — a invariância pedagógica é comparada POR NÍVEL, nunca entre as 4 células juntas: correção diferente entre níveis é adaptação correta à dificuldade, e um comparador que acusasse isso estaria errado.
- DEC-20260916-2051-validade-x-confiabilidade [ativa] (SPEC-20260916-1652) — validade do contrato e confiabilidade da geração são dimensões distintas. Falha recuperada por retry não reprova o contrato e nunca é apagada: `valid_first_attempt`, `recovered_after_retry` e `unrecovered_contract_failure` são reportados juntos.

## Alternativas consideradas e rejeitadas
- SPEC-20260916-1652 | comparar as 4 células da matriz de uma vez para medir invariância — rejeitada em 2026-09-16 17:16. Confundiria adaptação ao nível com violação de invariância.
- SPEC-20260916-1652 | medir diferença de tom só por julgamento humano — rejeitada em 2026-09-16 16:52. O ponto é automatizar o que não pode mudar; o humano julga o que mudou.

## Gotchas
- SPEC-20260916-1652 | incluir campo de TEXTO LIVRE em asserção de igualdade exata infla violação (2026-09-16 17:53) — `focus` é prosa e duas gerações não redigem igual; 5 das 19 "violações" eram só redação. Compare texto livre por semelhança ou deixe fora da asserção.
- SPEC-20260916-1652 | asserção sobre desenho incompleto passa por falta de dados (2026-09-16 17:16) — rodei `verify` com 12 de 48 células e o critério de diferença passou com exit 0, porque as falas que poderiam violar ainda não tinham sido chamadas. Todo gate que conclui sobre um desenho deve exigir o desenho COMPLETO.
- SPEC-20260916-1652 | a unidade da métrica de confiabilidade é a GERAÇÃO, não a fala (2026-09-16 20:50) — na matriz a mesma fala produz 4 gerações, e contar por fala subnotificou 48 gerações válidas como 12.

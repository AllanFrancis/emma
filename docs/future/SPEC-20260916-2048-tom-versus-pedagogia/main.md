# SPEC-20260916-2048: Tom versus pedagogia — separar efeito de estilo de variância de geração

**Status:** draft
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 20:48
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** tom, invariancia, variancia, amostragem-repetida, pedagogia
**Features:** personalidade, pedagogia
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 20:43 — "interação aparente entre personalidade/tom e pedagogia" e "divergências pedagógicas reais entre tons"
**Resumo:** Decide, com amostragem repetida e parâmetros controlados, se o tom altera de fato a correção pedagógica ou se as divergências observadas são variância de geração.

## Objetivo

A SPEC-20260916-1652 mediu 48 células e encontrou uma assimetria: no tom `tranquila` o C5 ficou em
75% contra 94% no `direta`, com total de correções praticamente igual (22 contra 24). Se for real,
é a §6 sendo violada — "nenhuma personalidade pode prejudicar a didática" — e é o argumento para a
camada de personalidade pós-LLM. Mas a medição não pode concluir: nenhuma rodada fixou `seed` ou
`temperature`, cada célula foi n=1, e nos 6 casos de quantidade divergente a direção foi MISTA, que
é assinatura de amostragem. Esta SPEC existe para transformar a hipótese em resposta.

## Escopo

**DENTRO:**
- Condição de controle que quantifica a variância de base: a MESMA célula (fala, nível, tom) repetida N vezes
- Parâmetros de amostragem fixados no que o provedor permitir (`temperature`, `seed` se houver)
- Reexecução da matriz com repetição, para separar efeito de tom de ruído de geração
- Critério estatístico declarado ANTES da rodada: qual diferença, com qual N, sustenta atribuição ao tom
- Reclassificação das 10 divergências reais já identificadas (4 de texto de correção, 6 de quantidade) sob o novo desenho
- Veredito sobre `livre-02`: a correção de maiúscula com `retry` se repete no tom `tranquila` ou foi evento único?

**FORA:**
- Implementar a camada de personalidade (SPEC de camada-de-personalidade) — esta SPEC informa aquela
- Mudar o prompt para "consertar" o tom antes de saber se há o que consertar
- O contrato do turno, fechado na SPEC-20260916-1450
- Semântica de `next_action` (SPEC própria)

## Invariantes

- SEMPRE declarar o critério de atribuição ANTES de rodar; escolher o teste depois de ver o resultado é como o número deixa de significar algo.
- NUNCA chamar execuções repetidas do mesmo modelo de observações independentes — elas compartilham desenho, modelo e ausência de controle.
- SEMPRE reportar a variância de base junto com o efeito; efeito sem régua de ruído não é medida.
- NUNCA commitar chave de API.

## Implementação

O que falta não é mais dado, é DESENHO. A matriz atual mede uma célula por condição, e por isso não
distingue "o tom mudou a correção" de "a geração é estocástica".

- Condição de controle: repetir a mesma célula N vezes sem mudar nada. A dispersão dessas N saídas É a variância de base.
- Só então a diferença entre tons ganha significado: ela precisa exceder a variância de base.
- Fixar `temperature` no mínimo que o provedor aceitar reduz o ruído na origem. O Groq expõe `temperature`; `seed` precisa de confirmação contra a doc viva.
- O comparador de células da SPEC-20260916-1652 já existe e é reaproveitado; o que muda é o eixo de repetição e a leitura estatística.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| Evidência | ganha índice de repetição, para N saídas da mesma célula coexistirem |
| `matriz.json` | ganha `repeticoes` e os parâmetros de amostragem usados |

<!-- Alternativas consideradas e REJEITADAS:
  - Aumentar o número de falas em vez de repetir células: mais falas medem mais casos, não medem
    variância. Sem repetição não existe régua de ruído.
  - Concluir pela matriz atual: a direção mista nos 6 casos de quantidade já mostra que n=1 não basta.
-->

## Riscos

- Repetição multiplica o custo sob teto de tokens do tier gratuito — mitigação: subconjunto menor que 12 falas, priorizando as que divergiram.
- `seed` pode não existir no provedor, limitando o controle a `temperature` — mitigação: a condição de controle mede a variância que sobrar, qualquer que seja.
- O efeito pode ser real e pequeno, exigindo N grande — mitigação: o critério declarado antes decide se o N viável responde a pergunta; se não responder, isso é resultado e não fracasso.

## Sinais de sucesso

- Passa a existir resposta, e não hipótese, sobre o tom alterar a correção.
- A SPEC de camada-de-personalidade nasce sabendo se a camada pós-LLM é necessidade medida ou precaução.

## Critério de aceite

- [ ] Critério de atribuição declarado e versionado ANTES da primeira chamada da rodada
- [ ] Condição de controle executada: mesma célula repetida N vezes, com a variância de base reportada
- [ ] Parâmetros de amostragem fixados e gravados na evidência
- [ ] As 10 divergências reais da SPEC-20260916-1652 reclassificadas como efeito de tom ou variância
- [ ] Veredito sobre `livre-02` (correção de maiúscula com `retry`) com evidência de repetição
- [ ] Conclusão escrita afirmando ou refutando a hipótese, com o N e a variância que a sustentam | evidence: manual @allan

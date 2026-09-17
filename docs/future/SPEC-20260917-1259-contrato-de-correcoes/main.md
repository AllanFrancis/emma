# SPEC-20260917-1259: Contrato de correções — bloqueante versus informativa

**Status:** draft
**Porte:** G
**Owner:** @allan
**Criada:** 2026-09-17 12:59
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** correcao, bloqueante, informativa, next-action, complete-mission, contrato, C15
**Features:** dialogo, pedagogia, avaliacao
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-17 — decisão "3 agora e 2 depois" ao ser confrontado com a divergência entre a C15 da SPEC-20260916-2048-semantica-next-action e a política de fechamento de missão já implementada no núcleo
**Resumo:** Distingue correção que o aluno precisa aplicar de correção que só informa, e com isso reconcilia de uma vez o schema do turno, o núcleo, a C15 e a exceção de `complete_mission`.

## Objetivo

Existem hoje duas leituras válidas e incompatíveis sobre o que fazer quando um turno emite correção.

A SPEC-20260916-2048-semantica-next-action mediu a lacuna e fixou a regra estrita: correção emitida exige `retry`, sem exceção. A SPEC-20260916-1652-nucleo-pedagogico, arquivada antes, implementou e testou o contrário para um caso — `if (temCorrecao && transition !== "complete")` —, porque "cobrar repetição depois de o objetivo ter sido cumprido transformaria a vitória do aluno em mais uma tarefa".

Nenhuma das duas está errada. O que falta é a distinção que tornaria as duas verdadeiras ao mesmo tempo: **que TIPO de correção está sendo emitida.** Enquanto ela não existe, a C15 mede sob a regra estrita mas não tem força normativa, e a exceção do núcleo vale sem estar declarada em contrato nenhum. Esta SPEC fecha isso.

## Escopo

**DENTRO:**
- A distinção conceitual entre correção **bloqueante** (o aluno precisa aplicar antes de avançar ou concluir) e **informativa** (pode acompanhar o fechamento sem exigir nova tentativa)
- A **regra objetiva** que classifica uma correção em bloqueante ou informativa — não pode ser "o modelo decide" nem "correção em fechamento é informativa por definição"
- Expressão da distinção no contrato do turno (`scripts/eval/turn-schema.json`), incluindo nome do campo, que esta SPEC decide e nenhuma anterior podia
- `decidirNextAction` no núcleo passa a ler a distinção, e a exceção de `complete_mission` deixa de ser condição de transição para ser consequência do tipo de correção
- A C15 passa a exigir `retry` só das bloqueantes, e só então pode virar gate
- Compatibilidade com as evidências históricas: 107 turnos gravados não têm o campo novo, e a checagem tem de decidir o que fazer com eles sem inventar classificação retroativa
- Efeito no prompt, se houver: se a classificação for proposta pelo modelo, o prompt precisa saber disso; se for derivada por política, não

**FORA:**
- Rever a taxa de 62,3% medida pela SPEC-20260916-2048 — ela é o ponto de partida, não objeto de revisão
- Retenção de contexto e janela de histórico (SPEC-20260916-2257-retencao-de-contexto-na-conversa)
- Metodologia de repetição e dispersão (SPEC-20260917-1059-metodologia-de-repeticao)
- Transformar a C15 em gate ANTES de a distinção existir — é justamente o que esta SPEC destrava

## Invariantes

- SEMPRE a classificação de uma correção segue regra objetiva e auditável; "informativa" nunca é rótulo de conveniência para justificar um fechamento que se quis fazer.
- NUNCA correção bloqueante acompanha `continue_mission` ou `complete_mission`: se o aluno precisa aplicar, o fluxo dá a oportunidade antes de avançar.
- SEMPRE a decisão final de `next_action` é do núcleo; o modelo propõe (DEC-20260916-1612). Esta SPEC muda o INSUMO da decisão, nunca o dono dela.
- NUNCA a evidência histórica é reclassificada retroativamente para caber na regra nova; turno sem o campo é turno sem o campo.
- SEMPRE as seis superfícies mudam juntas — schema, núcleo, C15, prompt, evidência histórica e a exceção de `complete_mission`. Resolver em pedaços recria a divergência em outro lugar.

## Implementação

Trabalho de contrato antes de trabalho de código. A pergunta difícil não é onde gravar o campo, é **qual regra classifica**.

Três famílias de regra a avaliar, e a escolha é entregável desta SPEC:

- **Por categoria.** O enum `category` já existe: `grammar`, `vocabulary`, `word_order`, `preposition`, `false_friend`, `register`. `register` é candidato natural a informativa; `grammar` que quebra comunicação, a bloqueante. Vantagem: dado já presente em toda evidência. Risco: a mesma categoria muda de peso conforme o nível do aluno.
- **Por impacto na comunicação.** Mais fiel ao propósito, e o `main.md` do núcleo já fala em "priorizar o que quebra a comunicação sobre o que é só questão de registro". Risco: exige julgamento que hoje não está em campo nenhum.
- **Por política de nível.** A `correction-policy` do núcleo já prioriza por categoria e tem teto por nível; a distinção poderia sair da mesma tabela. Vantagem: reusa política existente e testada. Risco: acopla a distinção ao nível, e um erro grave num N1 pode virar informativa por teto.

Ordem de trabalho que evita retrabalho: decidir a regra, expressá-la no schema, adaptar o núcleo, ajustar a C15, e só então reavaliar a evidência histórica.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| `Correction` | ganha a distinção bloqueante/informativa — nome do campo decidido nesta SPEC |
| `turn-schema.json` | fonte única; `turn-contract.generated.ts` é regerado dele |
| `decidirNextAction` | passa a ler o tipo de correção; a condição `transition !== "complete"` sai |
| Evidência histórica | 107 turnos sem o campo — tratamento decidido, nunca inferido |

<!-- Alternativas consideradas e REJEITADAS:
  - Afrouxar a C15 para aceitar `complete_mission` com qualquer correção: recusado pelo
    usuário em 2026-09-17 — "Não quero abrir essa exceção implicitamente dentro da C15".
  - Remover a exceção do núcleo para alinhar ao estrito: recusado no mesmo round —
    é política anterior, explícita, implementada e testada, e não é bug.
  - Deixar o modelo classificar livremente: transfere decisão pedagógica ao LLM, o que
    viola a invariante do núcleo de que o modelo propõe e a política decide.
-->

## Riscos

- A regra objetiva pode não existir de forma limpa, e a classificação virar julgamento caso a caso — mitigação: as 64 correções já gravadas com categoria e nível permitem testar cada família de regra offline, sem chamada nova ao modelo, antes de escolher.
- Mudar `turn-schema.json` invalida o contrato das evidências históricas e pode reprovar o `assertContract` — mitigação: o tratamento da evidência histórica é critério de aceite, não detalhe.
- Se a classificação passar a ser proposta pelo modelo, o strict mode ganha um campo que ele pode errar, e o custo de `json_validate_failed` sobe — mitigação: preferir derivação por política a proposta do modelo, e medir se a preferência se sustenta.
- Seis superfícies numa SPEC só é escopo grande, com risco de ficar meio-feita — mitigação: porte G, e a ordem de trabalho acima existe para que cada etapa deixe o repositório consistente.

## Sinais de sucesso

- A C15 pode virar gate sem reprovar comportamento deliberado do núcleo.
- Um fechamento de missão com correção deixa de ser ambíguo: ou a correção era informativa e o fechamento está certo, ou era bloqueante e é defeito.
- A divergência registrada na `tabela-de-coerencia.md` da SPEC-20260916-2048 deixa de existir, em vez de ser gerenciada.

## Critério de aceite

- [ ] Regra objetiva de classificação escolhida entre as famílias avaliadas, com justificativa e com a rejeição das outras registrada | evidence: manual @allan
- [ ] A regra testada contra as 64 correções já gravadas, sem chamada nova ao modelo, mostrando como cada uma seria classificada
- [ ] Distinção expressa em `turn-schema.json`, com `turn-contract.generated.ts` regerado da fonte única
- [ ] `decidirNextAction` lê o tipo de correção e a condição `transition !== "complete"` sai, com teste cobrindo bloqueante e informativa no fechamento de missão
- [ ] C15 exige `retry` apenas das bloqueantes, com self-test para os dois tipos
- [ ] Tratamento decidido e implementado para os 107 turnos históricos sem o campo, sem reclassificação retroativa
- [ ] Efeito no prompt resolvido: declarado se a classificação é proposta pelo modelo ou derivada por política, e o prompt ajustado apenas se for o primeiro caso
- [ ] A divergência da `tabela-de-coerencia.md` da SPEC-20260916-2048 marcada como resolvida, apontando para esta SPEC

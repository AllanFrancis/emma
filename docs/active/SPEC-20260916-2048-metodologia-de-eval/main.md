# SPEC-20260916-2048: Metodologia de eval — controle de parâmetros e retry alinhado à DEC

**Status:** active
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 20:48
**Ativada:** 2026-09-16 23:23
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** metodologia, temperature, seed, retry, confiabilidade, timeout
**Features:** dialogo, avaliacao
**Branch:** feature/metodologia-de-eval
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 20:43 — "necessidade de melhorar a metodologia de avaliação futura, incluindo controle de parâmetros quando o provider/modelo permitir"
**Resumo:** Fecha as lacunas metodológicas que limitaram a força das conclusões: parâmetros de amostragem não controlados, retry não implementado e requisição sem timeout.

## Objetivo

Três limitações apareceram na SPEC-20260916-1652 e nenhuma é sobre o produto — são sobre a
capacidade de medir. Sem elas resolvidas, toda eval futura terá o mesmo teto: diferença isolada não
atribuível, falha de contrato abortando rodada, e requisição pendurada travando a medição inteira.
Esta SPEC é investimento em instrumento, não em produto.

## Escopo

**DENTRO:**
- Controle de parâmetros de amostragem: `temperature` fixada e `seed` se o provedor expuser; gravados na evidência
- Confirmação contra a documentação viva do Groq do que é suportado — não assumir por analogia com outro provedor
- Retry in-process para `json_validate_failed`, alinhando o `run.mjs` à DEC-20260916-0311, que prevê retry e depois fallback
- Timeout na requisição: hoje `callModel` chama `fetch` sem timeout, e uma conexão pendurada travou a rodada da matriz por ~15 minutos em `livre-09-n4-direta`
- Distinção, na evidência, entre tentativas de uma mesma célula — hoje os registros de falha são gravados por FALA e não por célula, o que impede dizer qual geração recuperou

**FORA:**
- Mudar prompt ou contrato do turno
- A pergunta sobre tom (SPEC própria) — esta SPEC entrega o instrumento que aquela usa
- Painel ou visualização de métricas (Fase 4)

## Invariantes

- SEMPRE gravar na evidência os parâmetros de amostragem usados; comparar duas rodadas sem saber os parâmetros não é comparação.
- NUNCA deixar uma requisição sem timeout: rodada longa com conexão pendurada é indistinguível de rodada lenta.
- SEMPRE o retry de `json_validate_failed` segue a DEC-20260916-0311 — retry e depois fallback, nunca abortar a rodada por falha de geração isolada.
- NUNCA apagar ocorrência de falha recuperada; a métrica de confiabilidade existe para isso (invariante herdada da SPEC-20260916-1652).

## Implementação

Tudo em `scripts/eval/`, sem tocar o produto.

- `temperature` no payload e na evidência. `seed` depende de suporte; confirmar na doc viva antes de codar, não por analogia com a API da OpenAI.
- Retry de `json_validate_failed`: o `run.mjs` hoje classifica o HTTP 400 como erro não-rate-limit e PARA a rodada (`stop: true`). A DEC-20260916-0311 prevê retry. A recuperação de `talk-06` na SPEC anterior veio de re-execução manual, não do runner.
- Timeout via `AbortSignal.timeout`, com o valor derivado do custo medido por turno (~1065 tokens) e não arbitrado.
- Nome de arquivo de falha passa a carregar a célula (`fala-nNivel-tom`), não só a fala, para a métrica de confiabilidade poder atribuir a recuperação à geração certa.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| Evidência | ganha os parâmetros de amostragem efetivos |
| Registro de falha | nome passa a identificar a CÉLULA, não só a fala |

<!-- Alternativas consideradas e REJEITADAS:
  - Assumir que o Groq aceita `seed` porque a API e compativel com a da OpenAI: compatibilidade de
    endpoint nao garante paridade de parametro. Confirmar na doc viva.
  - Timeout fixo arbitrario: derivar do custo medido por turno da um numero defensavel.
-->

## Riscos

- `temperature: 0` pode degradar a naturalidade da conversa, que é qualidade de produto — mitigação: o parâmetro controlado vale para MEDIÇÃO; o valor de produção é decisão separada e deve ser registrada como tal.
- `seed` pode não existir no Groq, limitando a reprodutibilidade — mitigação: a condição de controle por repetição (SPEC de tom-versus-pedagogia) mede a variância que sobrar.

## Sinais de sucesso

- Duas rodadas da mesma condição passam a ser comparáveis, e "efeito real ou variância" deixa de ser ressalva obrigatória.
- Rodada longa não trava mais por conexão pendurada.
- Falha de geração é recuperada pelo runner, como a DEC-20260916-0311 sempre previu.

## Critério de aceite

- [ ] Suporte a `temperature` e `seed` no Groq confirmado contra a documentação viva, com a fonte citada
- [ ] Parâmetros de amostragem fixados no payload e gravados em toda evidência nova
- [ ] `json_validate_failed` recebe retry in-process conforme a DEC-20260916-0311, com teste do caminho
- [ ] Requisição tem timeout derivado do custo medido, com teste que prova que a rodada não trava
- [ ] Registro de falha identifica a CÉLULA, permitindo atribuir a recuperação à geração certa
- [ ] Duas execuções da mesma condição, com parâmetros fixados, produzem resultado comparável — e a dispersão residual é reportada | evidence: manual @allan

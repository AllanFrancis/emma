# Tasks — SPEC-20260916-1652-motor-de-dialogo

**Pipeline:** só tasks · **Execução:** autônoma · **Workspace:** inline
**Decidido por:** usuário em 2026-09-17 (ver `[decisão]` de 12:43 no journal)

## Regra que governa esta lista

As tasks **decompõem** o que o `main.md` já contratou. Não ampliam escopo. Instrução do usuário: "Não deixe as tasks ampliarem o contrato existente. Elas devem decompor o que já foi decidido entre server function, prompt puro, adapter Groq e dados da missão."

Task que precise de decisão nova de arquitetura é sinal de contrato incompleto — a rota é R.6.2 (perguntar), não resolver dentro da task.

## Estado real do repositório — ponto de partida, não folha em branco

Levantado em 2026-09-17 antes de escrever esta lista. **O núcleo pedagógico JÁ EXISTE em código** e é insumo, não trabalho desta SPEC.

`src/domain/` tem 16 arquivos versionados, com superfície pública em `src/domain/index.ts`:

| Já existe | O que é |
|---|---|
| `decidirIntent(entrada: PedagogicalInput): PedagogicalIntent` | produz o Intent que esta SPEC consome |
| `revisarTurno(entrada, propostas): TurnoRevisado` | recebe o que o modelo PROPÔS e devolve o que sai — correções sobreviventes e `nextAction` |
| `decidirNextAction(...)` | decisão final de `next_action`, já com precedência sobre a proposta do modelo |
| `resolverCorrecoes`, `temEvidencia` | rejeição de correção sem evidência literal, e teto por prioridade de categoria |
| `Mission`, `MissionStep` | `MissionStep.openingEn` é o portador do roteiro de fallback |
| `turn-contract.generated.ts` | tipos do turno, gerados de `scripts/eval/turn-schema.json` |
| `src/start.ts` | `createCsrfMiddleware` JÁ instalado com filtro `handlerType === "serverFn"` |

**NÃO RECRIAR** `decidirIntent`, `revisarTurno`, `decidirNextAction` nem qualquer política do núcleo. O motor **integra** com isso.

O que NÃO existe: catálogo de missões como dado (só o tipo), qualquer adapter de provedor, qualquer server function, e nenhuma rota além do scaffold. Não há SDK do Groq nas dependências — o adapter fala com o endpoint compatível com OpenAI por `fetch`.

## Tasks

### 1.0 — Prompt como função pura de `Intent`

Cobre os critérios "Prompt gerado por função pura a partir do `Intent`, com teste que não faz rede" e "O prompt declara que a entrada é fala transcrita".

- 1.1 `construirPrompt(intent: PedagogicalIntent, historico): string`, função pura, sem import de rede. Lê o Intent inteiro: `targetLevel`, `supportRatio`, `missionGoal`, `missionScenario`, `missionStep`, `maxCorrections`, `priorityCategories`, `mustRequestProduction`, `recentFocus`, `effectivePreferences`.
- 1.2 Declaração de fala transcrita no prompt (DEC-20260916-0312), com teste que asserta a presença.
- 1.3 Testes sem rede: mesmo Intent produz o mesmo prompt; mudar `targetLevel` ou `supportRatio` muda o prompt de forma observável.

Fronteira: nenhuma regra pedagógica NOVA no texto do prompt. Tudo que o prompt diz sobre política tem de vir de campo do Intent. Regra escrita à mão aqui é violação da §11.

### 2.0 — Adapter de provedor isolado

Cobre "Chamada usa `json_schema` com `strict: true` e o `turn-schema.json` como fonte única", "Rate limit por tokens vira mensagem compreensível" e "Trocar o adapter não altera nenhum arquivo do núcleo".

- 2.1 Interface do adapter: recebe prompt + schema, devolve texto bruto ou erro tipado. Nenhum tipo do núcleo cruza essa fronteira.
- 2.2 Implementação Groq por `fetch` no endpoint compatível com OpenAI, com `response_format: {type: "json_schema", strict: true}` carregando `scripts/eval/turn-schema.json` como fonte única — nunca uma segunda cópia do schema.
- 2.3 Erros tipados distinguindo `json_validate_failed`, rate limit por TOKENS/min e falha não recuperável. Modelo e endpoint como configuração de servidor, não literal espalhado.
- 2.4 Rate limit vira mensagem para o aluno ("me dá um segundo"), nunca HTTP 429 cru.
- 2.5 Teste de troca de adapter: um adapter falso satisfaz a interface e o núcleo não é tocado.

### 3.0 — Catálogo de missões como dado de produto

Cobre a dependência que o `main.md` assume: o roteiro volta ao domínio para servir de fallback.

- 3.1 Catálogo com as missões do protótipo, preenchendo `Mission` e `MissionStep`. `openingEn` por etapa é o roteiro. O texto é CÓPIA do protótipo, não escrita nova.
- 3.2 Teste de integridade: toda missão tem ao menos uma etapa, índices contíguos, e nenhuma etapa sem `openingEn` — sem isso o fallback tem buraco.

### 4.0 — Server function como fronteira de confiança

Cobre "Nenhuma chave de API no bundle do cliente", "Resposta validada contra o schema e contra a evidência citada no servidor" e "Zero decisão pedagógica no motor".

- 4.1 Server function que recebe `PedagogicalInput` + histórico e devolve o turno já validado. Único ponto do código que fala com o adapter.
- 4.2 Pipeline: `decidirIntent` → `construirPrompt` → adapter → parse → valida schema → valida evidência citada → `revisarTurno` → turno final. Parse é `JSON.parse` sobre resposta de strict mode; **nunca** fatiamento de texto ou regex.
- 4.3 A decisão de `next_action` e a sobrevivência das correções vêm de `revisarTurno`. O motor não escolhe: se precisar escolher, o Intent está incompleto e o defeito é do núcleo.
- 4.4 Chave de API lida só do ambiente do servidor. CSRF já está coberto por `src/start.ts`; confirmar que o filtro `serverFn` cobre esta função e registrar isso.

### 5.0 — Fallback: o turno nunca morre na tela

Cobre "`json_validate_failed` recebe retry e, persistindo, cai no roteiro da missão — com teste do caminho de falha".

- 5.1 Retry em `json_validate_failed`, com teto explícito.
- 5.2 Esgotado o retry, o turno vem do `openingEn` da etapa atual da missão, entrando no ponto certo do percurso.
- 5.3 Teste do caminho de falha com adapter que sempre falha: um turno válido chega ao cliente em 100% das tentativas.

### 6.0 — Invariantes por teste, não por gate humano

Instrução do usuário: "a proteção da chave/API e demais fronteiras de confiança devem ser verificadas por testes/inspeção, não por gate humano adicional."

- 6.1 Teste que inspeciona o build e falha se a chave de API ou o nome da variável de ambiente aparecerem em qualquer artefato do cliente.
- 6.2 Teste que falha se algum arquivo de `src/domain/` importar o adapter, o cliente HTTP ou qualquer coisa de rede — a invariante do núcleo é "nada aqui faz rede".
- 6.3 Medição de latência por turno registrada desde o primeiro turno, porque o `main.md` a nomeia como mitigação de risco. Streaming é decisão de outra SPEC e fica FORA.

### 7.0 — Janela de histórico como ORÇAMENTO, não política

Fronteira crítica, reafirmada pelo usuário: não absorver trabalho da futura `retencao-de-contexto`.

- 7.1 Janela com teto explícito em tokens, **medido e não estimado**.
- 7.2 O que a janela faz é cortar por orçamento. O que ela **não** faz: heurística de "dado já fornecido", deduplicação de pergunta, ou sumarização que decida o que preservar. Isso é política de retenção e pertence à SPEC-20260916-2257-retencao-de-contexto-na-conversa.
- 7.3 Registrar o custo por turno, porque o `main.md` tem risco declarado de o turno 8 custar mais que o turno 1.

## Ordem e por quê

1.0 e 3.0 primeiro, porque são puros e testáveis sem rede. 2.0 depois, que é onde a rede entra. 4.0 costura. 5.0 precisa de 2.0 e 3.0 prontos para provar o caminho de falha. 6.0 e 7.0 podem correr junto de 4.0.

## Fora, explicitamente

Decisão pedagógica de qualquer natureza (vem no Intent). Estilo e tom (`camada-de-personalidade`). A tela de conversa (`conversa-e-missoes`). Cota autoritativa por dia e fuso (Fase 2). Autenticação, persistência em banco, voz. Política de retenção de contexto (`retencao-de-contexto`). Streaming.

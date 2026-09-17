# SPEC-20260916-1652: Motor de diálogo — server function, strict JSON e fallback

**Status:** active
**Porte:** G
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** 2026-09-17 12:07
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** motor, server-function, groq, strict-json, fallback, prompt
**Features:** dialogo
**Branch:** feature/motor-de-dialogo
**Programa:** emma
**Workspace:** inline
**Origem:** usuário em 2026-09-16 16:52
**Tasks:** `tasks.md` (pipeline só tasks, execução autônoma — decidido em 2026-09-17)
**Resumo:** Transforma `PedagogicalIntent` em turno de conversa por server function no Groq, com schema estrito, retry e fallback roteirizado — e a chave de API nunca no cliente.

## Objetivo

O protótipo chama o modelo direto do browser com a chave que o usuário cola, e monta o JSON
fatiando chaves do texto. Nenhuma das duas coisas sobrevive a produção. Esta SPEC constrói o
caminho real: server function que recebe o `Intent`, gera o prompt a partir dele, chama o Groq com
`response_format: json_schema, strict: true`, valida a resposta contra o contrato v2 e garante que
um turno nunca morra na tela do aluno.

## Escopo

**DENTRO:**
- Server function do TanStack Start como único ponto que fala com o Groq
- Prompt gerado a partir do `PedagogicalIntent`, nunca escrito à mão nem montado na interface
- `response_format: {type: "json_schema", strict: true}` com o `turn-schema.json` como fonte única
- Validação da resposta contra o contrato v2 no servidor, incluindo evidência citada
- Retry em `json_validate_failed` e, persistindo a falha, fallback nas etapas roteirizadas da missão (DEC-20260916-0311)
- Declaração de fala transcrita no prompt (DEC-20260916-0312)
- Adapter de provedor isolado: trocar Groq por outro não toca o núcleo nem a interface
- Tratamento de rate limit por TOKENS por minuto, com a mensagem certa para o aluno em vez de erro cru

**FORA:**
- Decisão pedagógica de qualquer natureza — vem pronta no `Intent` (SPEC de nucleo-pedagogico)
- Estilo e tom (SPEC de camada-de-personalidade)
- A tela de conversa (SPEC de conversa-e-missoes)
- Cota autoritativa por dia e fuso (Fase 2) — aqui só o teto por sessão, em memória
- Autenticação, persistência em banco, voz

## Invariantes

- NUNCA a chave de API aparece no bundle do cliente, em `localStorage`, em prop de componente ou em log.
- SEMPRE um turno chega ao aluno: `json_validate_failed` recebe retry e depois cai no roteiro da missão. Turno não morre na tela.
- NUNCA o JSON é obtido por fatiamento de texto ou regex; a resposta vem validada contra o schema ou não vem.
- SEMPRE o prompt é derivado do `Intent`; prompt escrito à mão em qualquer camada é violação da §11.
- NUNCA o motor toma decisão pedagógica — se precisar de uma, o `Intent` está incompleto e o defeito é no núcleo.

## Implementação

A server function é a fronteira de confiança. Tudo que é segredo, cota e validação vive do lado do
servidor; o cliente recebe um turno já válido ou um turno de roteiro.

- `POST` via server function: recebe `Intent` + histórico da sessão, devolve o turno validado.
- Geração do prompt: função pura `Intent -> string`, testável sem rede, para o prompt ser revisável em diff.
- Chamada ao Groq pelo endpoint compatível com OpenAI, com o `turn-schema.json` carregado como schema.
- Pipeline de resposta: parse -> valida schema -> valida evidência -> devolve. Falha em qualquer etapa cai no retry e depois no roteiro.
- O roteiro de fallback vem do catálogo de missões, como dado de produto. Ele existe no protótipo v1 como `MISSIONS[].script[]` e na v2 virou shim de preview — precisa voltar ao domínio, e esta SPEC depende disso.
- Rate limit: o teto do tier gratuito é de TOKENS por minuto, não de requisições. O aluno vê "me dá um segundo" e não "HTTP 429".

**Por que o fallback é roteiro e não mensagem de erro.** O aluno do produto é alguém cujo maior
bloqueio declarado é vergonha de errar ou travar na hora de responder. Um erro técnico no meio da
primeira conversa em inglês não é inconveniência, é desistência.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| `Turn` | fala do aluno, saída validada, `next_action`, etapa da missão — em memória na Fase 1 |
| `Mission.script[]` | etapas roteirizadas voltam a ser dado de produto, para servir de fallback |
| Configuração | modelo e endpoint como configuração de servidor, nunca literal espalhado |

<!-- Alternativas consideradas e REJEITADAS:
  - Chamar o modelo do cliente, como o protótipo: expõe a chave e torna cota inexistente.
  - Confiar no strict mode sem fallback: a evidência mostrou HTTP 400 json_validate_failed em 1 de
    10 chamadas no 120b. Strict não é garantia.
  - Prompt como template na interface: viola a §11 e impede testar o prompt sem subir a UI.
-->

## Riscos

- Latência da chamada somada à do TTS futuro pode quebrar a sensação de conversa — mitigação: medir latência por turno desde já e registrar; a decisão de streaming é de outra SPEC.
- Custo cresce com o histórico acumulado; turno 8 custa mais que turno 1 — mitigação: janela de histórico com teto explícito em tokens, medida e não estimada.
- O roteiro de fallback pode divergir da conversa real e soar desconexo quando acionado — mitigação: o roteiro é por etapa da missão, então entra no ponto certo do percurso.
- Migrar o roteiro da v2 do protótipo de volta ao domínio é trabalho de conteúdo que esta SPEC assume mas não controla — mitigação: o texto existe idêntico na v1 e no shim da v2; é cópia, não escrita.

## Sinais de sucesso

- Nenhuma chave de API sai do servidor, e isso é verificável no bundle.
- Um turno chega ao aluno em 100% das tentativas, mesmo com o provedor falhando.
- O prompt de produção é revisável em diff e testável sem rede.

## Critério de aceite

- [x] Nenhuma chave de API no bundle do cliente, verificado por inspeção do build (2026-09-17 15:46, commit `ad3d4a6`, evidence: invariantes.test.ts inspeciona dist/client (construindo se faltar) e falha se aparecer GROQ_API_KEY, api.groq.com ou padrao gsk_*. Confirmado tambem por grep direto: nenhum artefato do cliente. Chave lida so de process.env em turno.server.ts)
- [x] Prompt gerado por função pura a partir do `Intent`, com teste que não faz rede (2026-09-17 15:46, commit `ad3d4a6`, evidence: construirPrompt(intent) em src/dialogo/prompt.ts, sem import de rede. 18 testes usando decidirIntent REAL: pureza (mesma entrada mesma saida), e nivel/supportRatio/style/maxCorrections/priorityCategories/etapa/recentFocus mudando o prompt de forma observavel. Nenhum faz rede)
- [x] Chamada usa `json_schema` com `strict: true` e o `turn-schema.json` como fonte única (2026-09-17 15:47, commit `ad3d4a6`, evidence: adapter.test.ts intercepta o fetch e verifica NO CORPO do pedido: response_format.type = json_schema e response_format.json_schema.strict = true. O strict vem do proprio turn-schema.json, que e importado por ?raw em turno.server.ts — fonte unica, sem segunda copia no app)
- [x] Resposta é validada contra o schema e contra a evidência citada no servidor, antes de chegar ao cliente (2026-09-17 15:47, commit `ad3d4a6`, evidence: criarValidador le turn-schema.json e valida required/type/enum/maxItems/additionalProperties; validarEvidencia confere que cada original ocorre LITERALMENTE na fala (ignorando caixa, DEC-20260916-0312). 15 testes. motor.test.ts prova que schema invalido e evidencia nao citada NAO passam ao cliente, mesmo com HTTP 200)
- [x] `json_validate_failed` recebe retry e, persistindo, cai no roteiro da missão — turno nunca morre na tela, com teste do caminho de falha (2026-09-17 15:47, commit `ad3d4a6`, evidence: produzirTurno faz retry so em json_validate_failed e cai no openingEn da etapa ATUAL. 19 testes de motor cobrindo o caminho de FALHA com adapter injetado: retry esgotado vai ao roteiro, retry que recupera, JSON ilegivel, e um turno chegando em 100% das combinacoes de falha inclusive sem credencial nenhuma)
- [x] O prompt declara que a entrada é fala transcrita (DEC-20260916-0312) (2026-09-17 15:47, commit `ad3d4a6`, evidence: construirPrompt sempre emite 'A entrada do aluno e FALA TRANSCRITA: nao corrija maiuscula, pontuacao nem grafia'. Teste asserta a presenca. O validador tambem aplica a decisao ignorando caixa na conferencia de evidencia)
- [x] Rate limit por tokens vira mensagem compreensível ao aluno, não erro cru (2026-09-17 15:47, commit `ad3d4a6`, evidence: 429 vira falha tipada rate_limit com retry-after lido do header, e mensagemParaOAluno devolve 'Me da um segundo, ja volto'. Teste garante que NENHUMA mensagem ao aluno casa /HTTP|429|500|ECONNREFUSED|json_validate|token|api/i em nenhum dos 4 tipos de falha)
- [x] Trocar o adapter de provedor não altera nenhum arquivo do núcleo pedagógico (2026-09-17 15:47, commit `ad3d4a6`, evidence: AdapterDeProvedor nao deixa nenhum tipo do nucleo cruzar: recebe prompt/mensagens/schema e devolve texto ou erro tipado. motor.test.ts roda os 19 testes com adapter FALSO, sem tocar nenhum arquivo do nucleo. Teste estatico prova que adapter.ts nao importa de ../domain, e invariantes.test.ts prova que src/domain nao importa o adapter)
- [x] Zero decisão pedagógica no motor: nenhuma política de nível, suporte ou correção neste módulo (2026-09-17 15:47, commit `ad3d4a6`, evidence: O motor chama decidirIntent e revisarTurno do nucleo e nao reimplementa nenhuma politica — inclusive no caminho de roteiro, onde revisarTurno tambem decide. Teste prova o nucleo SOBRESCREVENDO o modelo: proposta reply com correcao emitida sai como retry. invariantes.test.ts garante que src/domain nao importa nada de dialogo/rede, mantendo a politica fora do motor)

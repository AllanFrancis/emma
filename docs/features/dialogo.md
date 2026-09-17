# Feature: dialogo

**Keywords:** motor de diálogo, contrato do turno, system prompt, personalidade, missões, groq
**Arquivos principais:**
  - scripts/eval/turn-schema.json — o contrato do turno (v2)
  - scripts/eval/turn-validator.mjs — validação de schema e de evidência citada
  - scripts/eval/run.mjs — prompt de sistema e runner contra o Groq
  - scripts/eval/grade.mjs — as 13 checagens mecânicas de qualidade do turno
**Resumo:** Motor de conversa da Emma — system prompt, contrato JSON do turno e catálogo de missões.

## Specs desta feature
### Concluídas
- SPEC-20260916-0109 | 2026-09-16 | `06b391c` | Rubrica de nível e eval do motor de diálogo
- SPEC-20260916-1450 | 2026-09-16 | `01c70a4` | Contrato do turno v2 — corrections[] estruturado
- SPEC-20260916-1652 | 2026-09-16 | `e4ecf53` | Eval de personalidade — matriz tom × nível e comparação controlada v4 × v5
### Planejadas (future/)
- SPEC-20260916-2048-semantica-next-action | Semântica de next_action | Correção emitida sem pedir aplicação não é medida por nenhuma checagem
- SPEC-20260916-2048-regra-fala-transcrita | Regra da fala transcrita | Instrução no prompt não impediu a violação da DEC-20260916-0312
- SPEC-20260916-2048-metodologia-de-eval | Metodologia de eval | Sem controle de parâmetros, diferença isolada não é atribuível ao prompt
- SPEC-20260916-1652-eval-conversa-multiturno | Eval de conversa multiturno | Mede coerência longitudinal, que turno isolado não mede
- SPEC-20260916-1652-motor-de-dialogo | Motor de diálogo — server function, strict JSON e fallback | Tira a chave do cliente e garante que um turno nunca morre na tela
- SPEC-20260916-1652-conversa-e-missoes | Conversa e missões — a tela que é o produto | Traz o catálogo de missões de volta ao domínio

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

### Delta de estado (SPEC-20260916-0109, 2026-09-16 03:31)

O contrato dos 8 campos agora está formalizado e validado em `scripts/eval/turn-schema.json`.
Um dataset versionado de 45 falas comparou `openai/gpt-oss-20b` e `openai/gpt-oss-120b` sob o
mesmo prompt. O `gpt-oss-20b` foi escolhido para a Fase 1: teve zero falhas de contrato em 45
chamadas e sobre-corrigiu menos, embora omita algumas correções relevantes. A avaliação também
confirmou que o tier gratuito é limitado por tokens por minuto no nível da organização.

### Delta de estado (SPEC-20260916-1450, 2026-09-16 16:36)

**O contrato do turno agora tem 9 campos, não 8.** `correction_pt` (string) saiu; entraram
`corrections[]` — array de no máximo 3 objetos com `original`, `suggested`, `explanation_pt` e
`category` — e `next_action` (`reply` | `retry` | `continue_mission` | `complete_mission`).
Revalidado em 45 turnos no `gpt-oss-20b`: zero falha de contrato, C11 (evidência literal) em
100% nas 33 correções, C4 (não corrige caso de controle) subindo de 88% para 94% frente ao v3.
O grader passou de 10 para 13 checagens mecânicas.

**Duas correções factuais ao "Estado atual" acima**, apuradas ao ler o protótipo inteiro:

1. As **três** missões da v1 estão completas, cada uma com 4 etapas roteirizadas — não só a do
   café. Não há conteúdo de missão pendente bloqueando a Fase 1.
2. O protótipo normativo passou a ser `Emma - Protótipo v2.dc.html` (1,4 MB, React), fornecido
   pelo usuário em 2026-09-16 16:12. Frente ao `App Standalone`: FLOW com as mesmas 21 telas,
   QUESTIONS e contrato de 8 campos idênticos; mas as missões **perderam o `script[]`** (o
   roteiro virou shim de preview ativo só sem `window.claude`), a chave de API saiu do app
   (`window.claude.complete()`), cota e nome da personagem viraram props (`cotaDiaria` 2–30
   default 8, `nomePersonagem`), o log da conversa deixou de ser persistido e a velocidade da
   fala passou a variar por nível (`rate 0.85` para nível ≤ 2).

**Consequência aberta:** a DEC-20260916-0311 exige fallback em `scriptedTurn()`, e na v2 esse
roteiro não é mais dado de domínio. Shim de preview não é fallback de produção — o roteiro das
3 missões precisa voltar ao catálogo de missões na Fase 1.

**Calibração de prompt é o próximo alvo, não o contrato.** As 4 omissões da rodada (C5 em 86%)
têm um padrão único: em todas, o modelo pôs a forma correta em `suggestion_en` em vez de
`corrections[]`, inclusive nos dois casos que o prompt nomeia literalmente na via (b) —
"I want a coffee" num balcão e o falso cognato "doubt". E 3 das 33 `explanation_pt` saíram em
inglês (C13 em 88%). Ambos se atacam por prompt.

### Delta de estado (SPEC-20260916-1652, 2026-09-16 20:52)

**Prompt v5 MANTIDO** por decisão do usuário. Comparação controlada nas 7 falas que falharam com o
v4, em condição idêntica (nível do dataset, tom tranquila, mesmo modelo): **5 melhora · 2
equivalência · 0 regressão confirmada**.

- **C13 é o ganho mais consistente**: das 3 explicações em inglês, 2 viraram português de forma
  verificável (`hotel-05`, `hotel-10`) e a 3ª virou n/a por não haver correção. Na matriz, C13 = 97%
  contra 88% do v4.
- **C5 melhorou parcialmente**: das 4 omissões, o v5 consertou 2 (`cafe-08` "some"→"any", `talk-06`
  "no?"→"isn't it?") e manteve 2 (`cafe-02`, `talk-10`). Nas que persistem, a forma correta continua
  indo para `suggestion_en` — o padrão que a regra de precedência pretendia eliminar.
- **C4 sem regressão confirmada**: das 7, só `hotel-07` é controle; o v4 sobre-corrigia e o v5 não
  corrigiu. A queda de C4 para 69% na matriz é COMPOSIÇÃO DE AMOSTRA, não regressão: 4 das 5 falhas
  são `hotel-07`, que pesa 25% dos controles na matriz contra 6% no dataset de 45, e o v4 falhava a
  mesma fala.

Ressalva registrada: para `hotel-07` a matriz (4/4 células sobre-corrigiram) CONTRADIZ a comparação
controlada (não corrigiu). A discordância entre desenhos é evidência de variância de amostragem e
torna esse veredito frágil.

Primeira `json_validate_failed` do `gpt-oss-20b`, em `talk-06`: JSON malformado (string de `focus`
sem fechar) somado a `words` com 4 itens violando `maxItems: 3`. A SPEC-20260916-0109 registrou 2
no 120b e ZERO no 20b em 45 chamadas; agora 1 em ~57 do v5. Recuperada, e contabilizada como evento
de confiabilidade sem invalidar a execução.

Lacuna de medição aberta: `hotel-10` mudou `next_action` de `retry` para `reply` mantendo a
correção. Nenhuma das 13 checagens mede isso — C12 só olha casos de controle. Vai para a
SPEC-20260916-2048-semantica-next-action.

## Decisões arquiteturais ativas
- DEC-20260916-2052-prompt-v5 [ativa] (SPEC-20260916-1652) — prompt v5 mantido: precedência da via (b) sobre a (c) e `explanation_pt` amarrada ao português. Base: 5 melhoras, 0 regressões em comparação controlada nas 7 falas que falhavam no v4.
- DEC-20260916-0310-modelo-dialogo [ativa] (SPEC-20260916-0109) — usar `openai/gpt-oss-20b` na Fase 1; prioriza tato e confiabilidade sobre a maior taxa de correção do 120b.
- DEC-20260916-0311-fallback-json [ativa] (SPEC-20260916-0109) — falha `json_validate_failed` recebe retry e depois cai em `scriptedTurn()`; um turno nunca morre na interface.
- DEC-20260916-0312-fala-transcrita [ativa] (SPEC-20260916-0109) — o prompt declara que a entrada é fala transcrita, impedindo correções de maiúsculas e pontuação inexistentes na fala.
- DEC-20260916-1610-corrections-estruturado [ativa] (SPEC-20260916-1450) — correção é objeto com `original`, `suggested`, `explanation_pt` e `category`, teto de 3 no schema; ausência de correção é ARRAY VAZIO, nunca campo ausente, porque array vazio é fato afirmado e campo ausente é ambíguo entre "não há" e "esqueci".
- DEC-20260916-1611-evidencia-na-correcao [ativa] (SPEC-20260916-1450) — `corrections[].original` é trecho literal da fala do aluno; correção sem evidência é saída inválida. Normaliza caixa, apóstrofo e pontuação de borda (é fala transcrita), mas recusa paráfrase.
- DEC-20260916-1612-next-action-proposta [ativa] (SPEC-20260916-1450) — `next_action` é PROPOSTA do modelo, não decisão; quem confronta com a etapa real da missão é o núcleo pedagógico. Sem isso, "avançar de etapa" volta para dentro do prompt.
- DEC-20260916-1613-todos-campos-required [ativa] (SPEC-20260916-1450) — os 9 campos ficam em `required`: o strict mode do Groq segue o structured outputs da OpenAI, que exige `required` completo sob `additionalProperties: false`. Campo opcional de JSON Schema não existe nesse modo.

## Alternativas consideradas e rejeitadas
- SPEC-20260916-0109 | `openai/gpt-oss-120b` como modelo da Fase 1 — rejeitada em 2026-09-16 03:31. Teve duas falhas `json_validate_failed` e mais sobre-correções pedagogicamente nocivas.
- SPEC-20260916-0109 | `qwen/qwen3.8-27b` no tier gratuito — rejeitada em 2026-09-16 01:44. O limite de taxa interrompeu a rodada na segunda chamada.
- SPEC-20260916-1450 | manter `correction_pt` string e adiar `corrections[]` — rejeitada em 2026-09-16 15:00. Preservaria as 90 evidências do v3, mas mantém o teto de 3 dependente de heurística de string que devolve `Infinity` quando não reconhece o formato: turno bem corrigido em prosa livre reprovava em C3 sem ter erro.
- SPEC-20260916-1450 | adotar o contrato v2 sem revalidar o dataset — rejeitada em 2026-09-16 15:00. A recomendação do `gpt-oss-20b` passaria a se apoiar em evidência de um contrato que não é mais o do produto.
- SPEC-20260916-1450 | rodízio das 6 chaves de API para ampliar cota — rejeitada em 2026-09-16 16:12. Reafirma a decisão do usuário de conta única; os limites são por organização, então o rodízio não rende cota.

## Gotchas
- SPEC-20260916-0109 | `strict: true` não garante resposta utilizável (2026-09-16 01:55) — o Groq pode devolver HTTP 400 `json_validate_failed`; mantenha fallback explícito.
- SPEC-20260916-0109 | limites do Groq são compartilhados pela organização (2026-09-16 02:09) — paralelizar chamadas ou alternar chaves da mesma conta não amplia a cota. (citado por: SPEC-20260916-1450)
- SPEC-20260916-1450 | o teto do tier gratuito é de TOKENS por minuto, não de requisições (2026-09-16 16:13) — a rodada morre com `remainingRequests` em 995 e `remainingTokens` em 1207. A ~1065 tokens por turno a janela permite 1 ou 2 turnos; o `retry-after` do Groq vem em 2-5s, curto demais para refilar. Use backoff com espera mínima de 20s e pause pelo header `x-ratelimit-remaining-tokens`.
- SPEC-20260916-1450 | rate limit não é falha de contrato (2026-09-16 16:30) — um gate que conta qualquer entrada de `_failures/` como falha de contrato trava o critério para sempre no tier gratuito. Classifique por `erro.error` antes de reprovar.
- SPEC-20260916-1652 | `strict: true` falha também no `gpt-oss-20b` (2026-09-16 20:28) — primeira `json_validate_failed` do 20b, com JSON malformado E `words` acima do `maxItems` na mesma resposta. Confirma a DEC-20260916-0311: retry e fallback não são precaução, são requisito.
- SPEC-20260916-1652 | `fetch` sem timeout trava a rodada inteira (2026-09-16 20:27) — `livre-09-n4-direta` ficou ~15 min pendurada com orçamento de tokens saudável. Requisição sem timeout é indistinguível de rodada lenta.
- SPEC-20260916-1652 | headers de rate limit por minuto não expõem a janela longa (2026-09-16 18:14) — veio 429 com `retry-after` de 677s enquanto `remainingRequests: 950` e `remainingTokens: 5952` pareciam saudáveis. O ciclo medido foi 429 (~680s) → 429 (~130-170s) → sucesso, ~12 min por chamada.
- SPEC-20260916-1450 | detector de português genérico falha em explicação de correção (2026-09-16 16:36) — explicação é curta e cita palavras inglesas entre aspas ("Use 'on' depois de 'depends'."), então marcadores de conversa dão falso positivo. Calibre contra as evidências reais; minha primeira medição acusou 11 de 33 quando o número era 3.

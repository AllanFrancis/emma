# SPEC-20260916-1652: Núcleo pedagógico — as regras que não pertencem ao LLM

**Status:** active
**Porte:** G
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** 2026-09-16 23:23
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** pedagogia, intent, politica, nivel, missao, rubrica
**Features:** pedagogia, avaliacao
**Branch:** feature/nucleo-pedagogico
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 16:52
**Resumo:** Implementa em TypeScript puro as decisões pedagógicas que hoje moram no prompt — nível, suporte em pt-BR, priorização de correção e máquina de missão — expondo-as como `PedagogicalIntent`.

## Objetivo

A §11 do PROMPT DE DESENVOLVIMENTO é explícita: "não coloque toda a inteligência do produto dentro
de um prompt textual gigantesco; regras de domínio devem existir como dados e políticas explícitas".
Hoje elas moram no prompt e o protótipo não tem nenhuma. Esta SPEC é a primeira linha de código de
produto do repositório e a peça que torna a §3 real — uma única inteligência pedagógica, separada de
personalidade e de canal. Sem ela, cada camada seguinte recria regra pedagógica por conta própria.

## Escopo

**DENTRO:**
- Política de nível: mediana dos 5 critérios da rubrica, com teto quando sustentação de conversa fica 2+ níveis abaixo, e histerese (promoção em 2 reavaliações, rebaixamento em 3)
- Política de suporte em pt-BR: proporção por nível como tabela de dados, nunca percentual na interface
- Política de correção: teto de 3, priorização por `category` (o que quebra a comunicação vence o que é registro) e truncagem por prioridade em vez de ordem de chegada
- Máquina de estados da missão: etapa atual, o que fecha uma etapa, o que fecha a missão
- Decisão final de `next_action`: recebe a proposta do modelo e a confronta com a etapa real
- Rejeição de correção sem evidência: `original` tem de ocorrer na fala do aluno
- `PedagogicalIntent` como única saída, e o único insumo que o motor de diálogo recebe
- Tipos TypeScript do contrato do turno v2, derivados do `turn-schema.json` como fonte única

**FORA:**
- Qualquer chamada de LLM — este módulo não conhece provedor, não faz rede e não importa nada de `scripts/eval/`
- Montagem do prompt e parsing de resposta (SPEC de motor-de-dialogo)
- Estilo, tom e intensidade (SPEC de camada-de-personalidade)
- Telas (SPECs de onboarding-e-perfil, conversa-e-missoes)
- Persistência em banco: as entidades existem como tipos e vivem em memória na Fase 1
- Voz, cota real, autenticação

## Invariantes

- NUNCA o núcleo faz chamada de rede nem conhece o nome de um fornecedor de LLM; é função pura de estado para `PedagogicalIntent`.
- SEMPRE o núcleo decide `next_action`; a proposta do modelo é entrada, nunca comando. `complete_mission` na etapa 2 de 4 é recusado.
- SEMPRE classificação de nível carrega evidência citada; critério sem amostra suficiente permanece `null`, nunca estimativa inventada.
- NUNCA mais de 3 correções saem do núcleo, e a truncagem é por prioridade de `category`, nunca por ordem de chegada.
- NUNCA a proporção de português é escrita na interface; ela vem da política, por nível.
- SEMPRE o tipo do turno deriva do `turn-schema.json`; duas definições do mesmo contrato é dual-write.

## Implementação

Módulo de domínio em TypeScript puro, testável sem subir a aplicação e sem mock de rede — porque não
há rede para mockar. É o que permite testar pedagogia com asserção em vez de com julgamento.

- Entradas: perfil do aluno (autoavaliação, motivo, bloqueio, minutos), avaliação de nível mais recente, preferências da professora, estado da sessão (modo, missão, etapa, turnos consumidos, overrides), pontos recentes de melhoria, expressões praticadas e a janela recente da conversa.
- Saída: `PedagogicalIntent` com `targetLevel`, `supportRatio`, `missionGoal`, `missionScenario`, `missionStep`, `maxCorrections`, `priorityCategories[]`, `mustRequestProduction`, `recentFocus[]` e `expectedNextAction`.
- As políticas são dados + função, não `if` espalhado: tabela de suporte por nível, ordem de prioridade de `category`, tabela de transição da missão.
- A separação entre preferências persistentes e overrides de sessão resolve por merge (`{...perfil, ...sessao.overrides}`), e a sessão NUNCA escreve no perfil — mesmo sem nenhum controle de override na interface da Fase 1.

**Por que este módulo vem antes de qualquer tela.** Ele define a forma do perfil do aluno, que o
onboarding captura, e a forma do `Intent`, que o motor consome. Escrever tela antes disso significa
capturar campos que talvez não alimentem decisão nenhuma — foi exatamente o que o planejamento
encontrou em `quantoFala` e `quando`, capturados pelo protótipo e usados por nada.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| `LearnerProfile` | autoavaliação, motivo, bloqueio, minutos/dia, horário — preferências PERSISTENTES |
| `TeacherPreferences` | `style` (enum aberto), `intensity`, `supportLevel`, `speechRate` — nunca booleano |
| `LevelAssessment` | 5 critérios + evidência citada + nível resultante + timestamp; append-only e imutável |
| `Mission` | objetivo comunicativo, cenário, nível-alvo, etapas roteirizadas (o fallback da DEC-20260916-0311) |
| `SessionState` | modo, missão, etapa, turnos consumidos, `overrides` temporários |
| `PedagogicalIntent` | saída única do núcleo (campos na Implementação) |
| Tipos do turno | derivados de `scripts/eval/turn-schema.json`, fonte única |

<!-- Alternativas consideradas e REJEITADAS:
  - Manter as políticas dentro do prompt: é o que a §11 proíbe, e a evidência já mostrou que o
    modelo desobedece instrução (roteou correção para suggestion_en nos casos nomeados na via b).
  - Núcleo que também chama o LLM: acopla decisão pedagógica a fornecedor e torna o teste de
    pedagogia um teste de integração.
  - Escrever os tipos do turno à mão em paralelo ao JSON Schema: dual-write do mesmo contrato.
-->

## Riscos

- As políticas podem se revelar mais sutis do que a rubrica sugere, inflando o porte — mitigação: o G já prevê fases, e cada política entra com teste próprio antes da seguinte.
- `priorityCategories` é decisão pedagógica sem evidência empírica ainda; a ordem entre `grammar` e `register` é opinião até ser medida — mitigação: a ordem é dado configurável, não código, e a eval de personalidade pode medi-la.
- Derivar tipos do JSON Schema pode exigir ferramenta ou geração — mitigação: o contrato tem 9 campos; se a geração custar mais que o benefício, um teste que compara tipo e schema resolve o dual-write.
- A máquina de missão depende de saber o que fecha uma etapa, e as etapas roteirizadas do protótipo não declaram isso — mitigação: é o que a eval multiturno mede antes desta SPEC.

## Sinais de sucesso

- Existe um lugar único no código que responde "o que ensinar agora", e ele é lido sem entender de LLM.
- Trocar de provedor de modelo não toca nada deste módulo.
- Pedagogia passa a ter teste com asserção, em vez de depender de leitura humana de evidência.

## Critério de aceite

- [x] Nenhuma importação de rede, SDK ou fornecedor no módulo; o núcleo é função pura de estado para `PedagogicalIntent` (2026-09-17 00:18, commit `2b83700`)
- [x] Política de nível implementa mediana, teto por sustentação e histerese (2 para promover, 3 para rebaixar), com teste para cada regra (2026-09-17 00:18, commit `2b83700`)
- [x] Política de suporte em pt-BR é tabela de dados por nível, sem percentual em componente (2026-09-17 00:18, commit `2b83700`)
- [x] Política de correção trunca em 3 por prioridade de `category`, com teste que prova a ordem (2026-09-17 00:18, commit `2b83700`)
- [x] Máquina de missão avança e fecha etapa por transição explícita, com teste de cada transição (2026-09-17 00:18, commit `2b83700`)
- [x] `next_action` proposto pelo modelo é recusado quando incoerente com a etapa real, com teste do caso `complete_mission` prematuro (2026-09-17 00:18, commit `2b83700`)
- [x] Correção cujo `original` não ocorre na fala do aluno é rejeitada pelo núcleo (2026-09-17 00:18, commit `2b83700`)
- [x] Tipos do turno derivam do `turn-schema.json` sem segunda definição do contrato (2026-09-17 00:18, commit `2b83700`)
- [x] `overrides` de sessão resolvem por merge e não escrevem no perfil, com teste (2026-09-17 00:18, commit `2b83700`)

# SPEC-20260916-1652: Diagnóstico inicial — primeira vitória e primeira amostra

**Status:** draft
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** diagnostico, rubrica, primeira-vitoria, fala-livre, evidencia
**Features:** avaliacao, onboarding
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 16:52
**Resumo:** Entrega o diagnóstico em duas etapas — repetição como vitória fácil e pergunta aberta como amostra útil — aplicando a rubrica com evidência citada.

## Objetivo

O protótipo pede ao aluno para repetir uma frase fixa e estima nível por heurística de polidez,
que você rejeitou. A rubrica, por outro lado, define o diagnóstico como "a primeira fala livre do
aluno" — e repetição evidencia no máximo 2 dos 5 critérios. Você decidiu o encadeamento das duas:
a repetição fica porque é a primeira vitória concreta da §10, com baixo risco de fracasso, e a
pergunta aberta entra depois porque é o que alimenta a rubrica. Esta SPEC entrega as duas etapas e
substitui a heurística pela rubrica auditável.

## Escopo

**DENTRO:**
- Etapa 1: repetir a frase-alvo do protótipo, por TEXTO na Fase 1 — a primeira vitória concreta
- Etapa 2: uma pergunta aberta curta, cuja resposta é a amostra que a rubrica avalia
- Aplicação da rubrica de `scripts/eval/rubric.md` com evidência citada obrigatória; critério sem amostra suficiente permanece `null`
- `diagFeedback` com a devolutiva e a faixa exibida (`LADDER`), deixando claro que o nível evolui com o uso
- `conquista` — o fecho da primeira vitória
- Caminho de texto completo e funcional sem microfone, sem permissão e sem navegador compatível (§10)
- Gravação do `LevelAssessment` como registro imutável, append-only

**FORA:**
- Captura por voz, STT e a máquina de estados de áudio (SPEC de voz, Fase 3)
- A copy de consentimento de áudio — ela existe no protótipo e precisa ser reescrita para informar processamento externo, mas isso pertence à SPEC de voz, que é quando a afirmação passa a valer
- Reavaliação contínua ao longo do uso: aqui só o diagnóstico inicial; a histerese é do núcleo
- Heurística de qualquer natureza para estimar nível

## Invariantes

- NUNCA estimar nível por heurística nem perguntar o nível direto ao modelo; a rubrica com critérios e evidência é o único caminho.
- SEMPRE a classificação carrega trecho citado da fala do aluno; sem amostra, o critério é `null` e nunca um chute.
- NUNCA a ausência de voz, microfone ou permissão bloqueia o diagnóstico: o caminho de texto é completo (§10).
- SEMPRE o nível estimado é apresentado como ponto de partida que evolui, nunca como veredito.
- NUNCA afirmar ao aluno que o áudio não sai do dispositivo — na Fase 1 não há áudio, e quando houver a afirmação tem de ser verdadeira.

## Implementação

Duas etapas encadeadas numa tela, com a segunda só aparecendo depois da primeira. O aluno ganha
antes de ser medido.

- Etapa 1 reusa a frase-alvo do protótipo (`I'd like a table for two, please.`) e o fecho de "primeira frase". Baixa exigência, alta taxa de sucesso.
- Etapa 2 faz uma pergunta aberta curta e adequada a quem talvez saiba pouco, para que a resposta seja avaliável sem ser intimidante.
- A rubrica é aplicada por chamada ao modelo com schema próprio: 5 critérios, cada um com nível e evidência citada, mais o nível resultante pela política do núcleo (mediana com teto).
- O núcleo calcula o nível; o modelo preenche a rubrica e cita evidência. O modelo não decide nível — é a mesma separação do contrato do turno.
- `LevelAssessment` grava os 5 critérios, as evidências e o resultado. Append-only: reavaliação cria registro novo, nunca sobrescreve.

**Por que duas etapas em vez de uma.** Uma repetição é vitória sem amostra; uma pergunta aberta de
cara é amostra com risco de fracasso na primeira tela do produto, para um público cujo bloqueio
declarado é vergonha de errar. O encadeamento custa uma interação e entrega as duas coisas.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| `LevelAssessment` | 5 critérios (nível + evidência citada cada), nível resultante, origem (diagnóstico inicial), timestamp; imutável |
| Schema da rubrica | JSON Schema próprio para a saída da avaliação, irmão do `turn-schema.json` |

<!-- Alternativas consideradas e REJEITADAS:
  - Só repetição, como o protótipo: evidencia no máximo 2 dos 5 critérios da rubrica; 3 ficariam
    `null` na primeira avaliação.
  - Só pergunta aberta: perde a primeira vitória de baixo risco que a §10 pede, na tela onde o
    abandono é mais provável.
  - Heurística hasPolite do protótipo: mede polidez, não proficiência. Rejeitada pelo usuário.
-->

## Riscos

- A pergunta aberta pode produzir resposta curtíssima ("yes", "ok"), insuficiente para a rubrica — mitigação: critério sem amostra vira `null` por contrato, e o nível cai de volta para a autoavaliação declarada; o produto segue.
- O modelo pode inventar evidência, citando trecho que o aluno não disse — mitigação: a mesma validação de evidência literal do contrato do turno se aplica aqui.
- Duas etapas alongam o onboarding, onde cada passo custa desistência — mitigação: a instrumentação mede a conclusão do onboarding, então o custo fica visível em vez de suposto.

## Sinais de sucesso

- O aluno produz linguagem na primeira sessão e recebe uma devolutiva que reconhece o que funcionou.
- O nível inicial vem de critérios auditáveis com evidência, e não de heurística.
- Nenhum aluno é bloqueado por não ter microfone ou não querer usá-lo.

## Critério de aceite

- [ ] Etapa 1 (repetição) e etapa 2 (pergunta aberta) implementadas em sequência, ambas por texto
- [ ] Rubrica aplicada com os 5 critérios, cada classificação com trecho citado da fala do aluno
- [ ] Critério sem amostra suficiente resulta em `null`, e o nível final recai na autoavaliação declarada
- [ ] Nível final calculado pela política do núcleo (mediana com teto), não pelo modelo
- [ ] `LevelAssessment` gravado como registro imutável; reavaliação cria registro novo
- [ ] Percurso completo sem microfone, sem permissão e em navegador sem reconhecimento de fala
- [ ] `diagFeedback` apresenta o nível como ponto de partida que evolui com o uso
- [ ] Nenhuma afirmação sobre áudio no texto exibido, já que não há captura de áudio nesta fase

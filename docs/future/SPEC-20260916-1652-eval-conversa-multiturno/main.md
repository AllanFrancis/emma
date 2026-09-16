# SPEC-20260916-1652: Eval de conversa multiturno — coerência e avanço de missão

**Status:** draft
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** multiturno, coerencia, missao, next-action, contexto
**Features:** dialogo
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 16:52
**Resumo:** Mede o que turno isolado não mede — retenção de contexto, avanço de missão e coerência de `next_action` ao longo de uma conversa inteira.

## Objetivo

Toda a evidência acumulada até aqui é de TURNO ISOLADO: 45 falas independentes, cada uma sem
história. O journal da SPEC-20260916-0109 registra isso como gotcha explícito — "rodada com um turno
isolado não mede coerência longitudinal". Mas o produto é conversa, e a §4 do PROMPT DE
DESENVOLVIMENTO define um ciclo que só existe ao longo de vários turnos: continuar a conversa, não
abandonar o objetivo, registrar progresso. Esta SPEC mede a dimensão que falta antes de a SPEC de
motor-de-dialogo ser escrita contra ela.

## Escopo

**DENTRO:**
- Conversas roteirizadas de 4+ turnos por missão, com a fala do aluno versionada como script (o "aluno" é dado, não improviso)
- Cobertura das 3 missões do protótipo, mais uma conversa livre
- Medição de retenção de contexto: a Emma não repete pergunta já respondida nem pede dado que o aluno já deu
- Medição de progressão: `next_action` avança quando deve e a missão fecha no `complete_mission`
- Medição de não-repetição de correção: erro já corrigido num turno não volta a ser corrigido nos seguintes
- Relatório com o percurso completo de cada conversa, legível como diálogo e não como tabela

**FORA:**
- Matriz de personalidade (SPEC de eval-personalidade)
- O núcleo que VALIDA `next_action` contra a etapa real — aqui só se mede a proposta do modelo
- Aluno simulado por LLM: a fala do aluno é script versionado, porque aluno improvisado destrói a reprodutibilidade
- Qualquer código de produto

## Invariantes

- SEMPRE a fala do aluno vem de script versionado; conversa não reprodutível não é evidência.
- NUNCA a Emma pede de novo uma informação que o aluno já deu no histórico — é o modo de falha mais visível para quem usa.
- NUNCA a mesma correção reaparece depois de já ter sido feita; repetir correção é punir quem já foi corrigido.
- NUNCA commitar chave de API — `GROQ_API_KEY` vive em variável de ambiente da sessão.

## Implementação

O runner atual manda uma fala e recebe um turno. Aqui ele passa a manter `messages` acumulado e a
percorrer um script de falas do aluno, persistindo a conversa inteira como uma unidade.

- `conversations.jsonl` — novo dataset: uma conversa por linha, com missão, nível e a sequência de falas do aluno, mais o que cada etapa espera que aconteça.
- `run.mjs` ganha modo conversa: acumula o histórico, avança o script a cada turno e grava a conversa completa num arquivo só.
- `grade.mjs` ganha checagens longitudinais: pergunta repetida, dado já fornecido sendo pedido de novo, correção repetida, `next_action` coerente com a etapa e `complete_mission` no fim.
- O custo por conversa cresce com o histórico — cada turno carrega os anteriores. Sob teto de TOKENS/min isso importa: conversas curtas (4 a 6 turnos) e poucas por rodada.

**Por que o aluno é script e não LLM.** Aluno simulado por modelo produz conversa diferente a cada
execução, e aí não se sabe se a Emma melhorou ou se o aluno mudou. Script fixo torna a comparação
entre prompts possível — é o mesmo motivo pelo qual o dataset de falas é versionado.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| `conversations.jsonl` | novo: `id`, `missao`, `nivel`, `falas[]` (script do aluno), `espera[]` (o que cada etapa deve provocar) |
| Evidência | uma conversa completa por arquivo, com todos os turnos e o histórico enviado |

<!-- Alternativas consideradas e REJEITADAS:
  - Aluno simulado por LLM: mata a reprodutibilidade, que é a base de toda comparação entre prompts.
  - Reaproveitar dataset.jsonl encadeando falas aleatórias: conversa incoerente mede a reação da
    Emma ao absurdo, não a sustentação de uma conversa real.
-->

## Riscos

- Custo por conversa cresce a cada turno pelo histórico acumulado, sob teto de TOKENS/min — mitigação: conversas de 4 a 6 turnos e janela de histórico explícita, medida em tokens.
- Checagens longitudinais são mais difíceis de mecanizar que as de turno; risco de medir o fácil e chamar de coerência — mitigação: cada checagem nasce de um modo de falha nomeado, e o relatório mostra a conversa inteira para leitura humana.
- `complete_mission` pode nunca aparecer se o modelo não reconhecer o fim da missão — mitigação: é exatamente o que esta SPEC existe para descobrir, e é o que justifica o núcleo decidir em vez de obedecer.

## Sinais de sucesso

- Passa a existir evidência de que a Emma sustenta uma conversa, e não só um turno bonito.
- A SPEC de motor-de-dialogo nasce sabendo se `next_action` é confiável como proposta ou se precisa de mais regra no núcleo.
- O gotcha "turno isolado não mede coerência longitudinal" deixa de ser ressalva e passa a ser medição.

## Critério de aceite

- [ ] `conversations.jsonl` cobre as 3 missões do protótipo e uma conversa livre, com a fala do aluno versionada
- [ ] Runner executa conversa com histórico acumulado e persiste a conversa inteira como evidência
- [ ] Nenhuma conversa tem pergunta repetida nem pedido de dado que o aluno já forneceu
- [ ] Nenhuma correção se repete depois de já ter sido aplicada
- [ ] `next_action` coerente com a etapa em todas as conversas, e a missão fecha em `complete_mission`
- [ ] Leitura humana confirma que as conversas soam como conversa e não como sequência de exercícios | evidence: manual @allan

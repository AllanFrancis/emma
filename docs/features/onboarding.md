# Feature: onboarding

**Keywords:** entrada, perfil pedagógico, uma decisão por tela, primeira vitória, LearnerProfile
**Arquivos principais:**
  - —
**Resumo:** Primeira experiência: telas de entrada, captura do perfil pedagógico e a primeira vitória concreta do aluno.

## Specs desta feature
### Concluídas
- SPEC-20260916-1652 | 2026-09-17 | `pendente` | Onboarding e perfil pedagógico — entrada, promessa e as 6 perguntas que alimentam o motor, com `LearnerProfile` e `TeacherPreferences` gravados
### Planejadas (future/)
- SPEC-20260916-1652-diagnostico-inicial | Diagnóstico inicial — primeira vitória e primeira amostra | Compartilhado com `avaliacao`: a primeira produção de linguagem acontece no onboarding

## Estado atual

Nada implementado. O protótipo é normativo para ordem, conteúdo, hierarquia visual e estados
(§2.2), e traz 8 perguntas em `QUESTIONS`, cada uma com enunciado em pt-BR e opções com rótulo e
subtítulo.

**Apuração do planejamento: só 6 das 8 perguntas alimentam alguma decisão.** `nivel`, `motivo`,
`bloqueio` e `personalidade` entram no prompt do motor; `minutos` define o timer da sessão; `audio`
define o comportamento de TTS. `quantoFala` e `quando` são capturados, exibidos no resumo e usados
por decisão nenhuma — `quando` só serviria para notificação, que é Fase 4. As duas ficaram como
`ADIAR` no escopo do MVP, com a justificativa de que toda pergunta no onboarding custa desistência.

Regras que vêm do documento e não do protótipo:
- Uma decisão principal por tela, com uma ação clara de continuação (§10).
- O nível autoavaliado é ponto de partida declarado, nunca classificação definitiva.
- A ausência de voz, microfone ou permissão **nunca** bloqueia o acesso ao produto (§10).
- A primeira experiência termina com uma vitória concreta.

**Inconsistência conhecida no protótipo:** a barra de progresso calcula sobre 8 perguntas, mas
`diagnostico`, `diagFeedback`, `conquista` e `projecao` estão no meio delas sem entrar na contagem —
o progresso pula. É decisão de UX a confirmar, não bug de código.

## Decisões arquiteturais ativas
—

## Alternativas consideradas e rejeitadas
—

## Gotchas
—

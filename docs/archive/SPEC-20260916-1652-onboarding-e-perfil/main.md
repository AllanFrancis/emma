# SPEC-20260916-1652: Onboarding e perfil pedagógico

**Status:** done
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** 2026-09-17 12:07
**Concluída:** 2026-09-17 15:52
**Pausada em:** —
**Commit final:** `54cc552`
**Keywords:** onboarding, perfil, telas, uma-decisao, progresso
**Features:** onboarding
**Branch:** feature/onboarding-e-perfil
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 16:52
**Resumo:** Constrói as telas de entrada e as 6 perguntas que realmente alimentam o motor, gravando o perfil pedagógico que o núcleo consome.

## Objetivo

O protótipo captura 8 respostas, mas o planejamento apurou que só 6 alimentam alguma decisão:
nível, motivo, bloqueio e personalidade entram no prompt, minutos definem o timer e áudio define o
comportamento de TTS. `quantoFala` e `quando` são exibidos e usados por nada — `quando` só serviria
para notificação, que é Fase 4. Esta SPEC entrega o caminho de entrada com uma decisão por tela,
conforme a §10, capturando exatamente o que o `LearnerProfile` precisa.

## Escopo

**DENTRO:**
- `entrada` e `promessa`: contrato de expectativa, com a headline e a proposta de valor do protótipo
- As 6 perguntas que alimentam o motor: `audio`, `nivel`, `motivo`, `bloqueio`, `minutos`, `personalidade`
- Uma decisão principal por tela e uma ação clara de continuação (§10)
- Barra de progresso coerente com as telas que existem de fato
- Gravação do `LearnerProfile` e das `TeacherPreferences` iniciais
- Fidelidade ao protótipo em ordem, conteúdo, hierarquia visual e estados (§2.2)
- `NARRATION` por tela em pt-BR como texto, com a leitura em voz alta ficando para a Fase 3

**FORA:**
- `quantoFala` e `quando` — capturados pelo protótipo, alimentam decisão nenhuma na Fase 1; adiados com justificativa
- `projecao` — gráfico com prazo derivado de tabela fixa; promete resultado sem base (Fase 2)
- `diagnostico`, `diagFeedback` e `conquista` (SPEC de diagnostico-inicial)
- Autenticação e recuperação de senha (Fase 2)
- TTS da narração (Fase 3)
- `retorno`, `plano`, `ofensiva`, `paywall`

## Invariantes

- SEMPRE uma decisão principal por tela; tela que pede duas escolhas viola a §10.
- NUNCA a ausência de voz bloqueia o acesso: a preferência de áudio é preferência, não requisito.
- SEMPRE o nível autoavaliado é ponto de partida declarado, nunca classificação definitiva — nenhuma tela pode sugerir o contrário.
- NUNCA capturar dado que não alimenta decisão: campo no perfil sem consumidor é dívida, não previsão.
- NUNCA redesenhar o fluxo por conta própria: ordem, conteúdo e hierarquia vêm do protótipo (§2.2).

## Implementação

Primeiras telas de produto do repositório. O scaffold já traz os 46 componentes shadcn/ui intocados
e o TanStack Router configurado, então o trabalho é de composição e fidelidade, não de fundação.

- Rotas do TanStack Router para o percurso, com o passo atual como estado navegável em vez de índice num objeto global.
- Componente de pergunta único, parametrizado pelo catálogo de perguntas — o protótipo já faz isso com `questionView` e um `QUESTIONS` declarativo, e essa forma é boa.
- As opções e os textos vêm do protótipo na letra; a forma (tipografia, cor, componente) é livre por decisão registrada do usuário.
- `LearnerProfile` e `TeacherPreferences` gravados na forma que o núcleo pedagógico definiu; na Fase 1 vivem no cliente, sem banco.
- A barra de progresso conta as telas que existem, e não 8 perguntas com 4 telas intercaladas fora da contagem — o protótipo faz o progresso pular, e isso é bug de UX a confirmar.

**Por que cortar `quantoFala` e `quando`.** Não é economia de trabalho: é evitar pedir ao aluno uma
informação que o produto não usa. Toda pergunta no onboarding custa desistência, e cobrar por nada
é o pior negócio possível na tela de entrada.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| `LearnerProfile` | gravado: autoavaliação, motivo, bloqueio, minutos/dia |
| `TeacherPreferences` | gravado: `style` da escolha de personalidade, `supportLevel` inicial da preferência de áudio |
| Catálogo de perguntas | dado declarativo: chave, enunciado, opções com rótulo e subtítulo, nota |

<!-- Alternativas consideradas e REJEITADAS:
  - Manter as 8 perguntas por fidelidade ao protótipo: fidelidade é de fluxo e conteúdo, não
    obrigação de capturar dado inútil. O corte está declarado e é decisão do usuário.
  - Passo como índice em estado global, como no protótipo: perde deep link, voltar do navegador e
    retomada, que são de graça com router.
-->

## Riscos

- Cortar duas perguntas altera a contagem da barra de progresso e o ritmo percebido do onboarding — mitigação: a barra passa a contar telas reais, o que já era necessário.
- A forma é livre mas o conteúdo não; risco de redesenhar demais e perder a experiência validada — mitigação: os textos vêm do protótipo na letra e o diff mostra qualquer desvio.
- O perfil vive no cliente na Fase 1; limpar o navegador apaga o onboarding — mitigação: aceitável sem autenticação, e é exatamente o que a Fase 2 resolve.

## Sinais de sucesso

- O aluno chega à primeira conversa com um perfil que muda o comportamento da Emma de forma perceptível.
- Nenhuma pergunta do onboarding existe sem consumidor no núcleo.
- A conclusão do onboarding é mensurável desde o primeiro dia.

## Critério de aceite

- [x] `entrada`, `promessa` e as 6 perguntas implementadas com ordem, conteúdo e estados fiéis ao protótipo (2026-09-17 15:42, commit `8aa503b`, evidence: questions.ts e momentos.ts com enunciados, opcoes label+sub, ordem e nota COPIADOS do prototipo (.scratch/prototipo/_decoded/app-inline-1.html: const QUESTIONS L425, const MOMENTS L850, VIEWS.entrada L882). 6 perguntas na ordem audio-nivel-motivo-bloqueio-minutos-personalidade. Estados: opcao marcada, Continuar desabilitado sem escolha. Teste garante 6 perguntas, sem quantoFala/quando, prompt nao vazio e opcoes sem duplicata)
- [x] Cada tela pede exatamente uma decisão principal e oferece uma ação clara de continuação (2026-09-17 15:43, commit `8aa503b`, evidence: Uma decisao por tela: momento tem so o botao de seguir; pergunta tem um radiogroup unico (name=pergunta-<chave>) e um Continuar. Nenhuma tela pede duas escolhas)
- [x] `LearnerProfile` e `TeacherPreferences` gravados na forma definida pelo núcleo pedagógico (2026-09-17 15:43, commit `8aa503b`, evidence: montarPerfil devolve LearnerProfile e TeacherPreferences importados de src/domain. Teste de integracao prova a forma alimentando o NUCLEO REAL: preferenciasEfetivas aceita as 4 preferencias e decidirIntent produz Intent coerente (nivel autoavaliado vira targetLevel sem nenhum LevelAssessment))
- [x] Todo campo gravado tem consumidor no núcleo; nenhum campo órfão (2026-09-17 15:43, commit `8aa503b`, evidence: preferredTime NAO e gravado — teste asserta ausencia da chave. Teste 'nenhum campo alem dos que o nucleo define' limita o perfil a selfAssessedLevel/reason/blocker/minutesPerDay, todos consumidos por decidirIntent. intensity e speechRate tem consumidor (preferenciasEfetivas) e vem de defaults.ts centralizado)
- [x] Barra de progresso coerente com as telas existentes, sem salto (2026-09-17 15:43, commit `8aa503b`, evidence: PERCURSO conta telas reais (entrada + promessa + 6 perguntas = 8 passos). Teste prova progresso monotono, incremento CONSTANTE entre todas as telas e fechamento em 100%. Corrige o bug do prototipo, que dividia por 8 perguntas ignorando as 4 telas intercaladas)
- [x] Nenhuma tela apresenta o nível autoavaliado como classificação definitiva (2026-09-17 15:43, commit `8aa503b`, evidence: NOTA_DE_NIVEL em momentos.ts, exibida na tela de nivel: 'E so um ponto de partida. Eu ajusto conforme a gente conversa.' Nenhuma tela usa palavra de classificacao. Comentario no tipo e no codigo reforca que quem classifica e LevelAssessment com evidencia)
- [x] Percurso completável sem microfone, sem áudio e sem permissão de navegador (2026-09-17 15:43, commit `8aa503b`, evidence: Percurso e radio + botao, sem getUserMedia, sem Audio, sem SpeechRecognition e sem permissao de navegador em nenhum ponto. A pergunta de audio grava PREFERENCIA (supportLevel), nao acesso a dispositivo. Zero consumo de Groq)
- [x] Navegação por rota: deep link e voltar do navegador funcionam (2026-09-17 15:43, commit `8aa503b`, evidence: Tela e PARAMETRO DE ROTA em /onboarding/\, validado contra PERCURSO com notFound() fora dele; /onboarding redireciona para a primeira. Uma URL por tela faz deep link e voltar do navegador funcionarem; respostas releem de localStorage a cada tela, entao voltar preserva escolha. routeTree.gen.ts regenerado por vite build)

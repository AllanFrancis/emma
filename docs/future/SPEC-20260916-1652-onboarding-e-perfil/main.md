# SPEC-20260916-1652: Onboarding e perfil pedagógico

**Status:** draft
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** onboarding, perfil, telas, uma-decisao, progresso
**Features:** onboarding
**Branch:** —
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

- [ ] `entrada`, `promessa` e as 6 perguntas implementadas com ordem, conteúdo e estados fiéis ao protótipo
- [ ] Cada tela pede exatamente uma decisão principal e oferece uma ação clara de continuação
- [ ] `LearnerProfile` e `TeacherPreferences` gravados na forma definida pelo núcleo pedagógico
- [ ] Todo campo gravado tem consumidor no núcleo; nenhum campo órfão
- [ ] Barra de progresso coerente com as telas existentes, sem salto
- [ ] Nenhuma tela apresenta o nível autoavaliado como classificação definitiva
- [ ] Percurso completável sem microfone, sem áudio e sem permissão de navegador
- [ ] Navegação por rota: deep link e voltar do navegador funcionam

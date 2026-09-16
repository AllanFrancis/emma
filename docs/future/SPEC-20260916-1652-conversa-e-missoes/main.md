# SPEC-20260916-1652: Conversa e missões — a tela que é o produto

**Status:** draft
**Porte:** G
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** conversa, missoes, cota, traducao, travei, sugestao
**Features:** dialogo, progresso
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 16:52
**Resumo:** Entrega a tela de conversa completa com as 3 missões, correção visível, tradução sob demanda, cota de 8 turnos e o catálogo de missões como dado de produto.

## Objetivo

É a tela que justifica o produto. Tudo antes dela é preparação e tudo depois é devolutiva. A §22
define que o MVP precisa provar cinco coisas, e quatro delas acontecem aqui: a Emma mantém conversa
útil, ensina sem interromper demais, o aluno entende a correção e tenta de novo. Esta SPEC também
traz o catálogo de missões de volta ao domínio, resolvendo o buraco que a v2 do protótipo abriu ao
mover o roteiro para um shim de preview.

## Escopo

**DENTRO:**
- A tela de conversa do protótipo: fala da Emma, instrução em pt-BR, correção visível, resposta modelo, input, cabeçalho com timer e cota
- Catálogo de missões como dado de produto: as 3 missões com objetivo, cenário, turno de abertura e as 4 etapas roteirizadas de cada (o fallback da DEC-20260916-0311)
- Tradução sob demanda (`showPt`), com a proporção de exibição vinda da política de suporte do núcleo
- Botão "Travei": orçamento próprio e pequeno, separado da cota de conversa — não pune hesitação
- Resposta modelo com ação de usar, e a decisão registrada sobre se isso conta como produção de linguagem
- Timer por minutos escolhidos no onboarding
- Cota de 8 turnos por sessão, em memória, com o valor vindo de configuração e nunca literal no componente
- Conclusão de missão ao `complete_mission` validado pelo núcleo
- Rotação circular de missões, como o protótipo faz

**FORA:**
- Cota autoritativa por dia com fuso resolvido no servidor (Fase 2) — aqui é por sessão, em memória
- Voz: "Ouvir", microfone no input e TTS (Fase 3)
- `licaoOk`, `ofensiva`, `resumo`, `plano` (SPEC de fecho-de-licao)
- Modos `free_conversation` e `pronunciation` — a Fase 1 entrega missão guiada, com `SessionMode` já no domínio
- Histórico persistente entre sessões (Fase 2)
- Paywall real (Fase 4)

## Invariantes

- SEMPRE cada turno termina pedindo nova produção de linguagem ao aluno; turno que não devolve a bola quebra o ciclo da §4.
- NUNCA o valor da cota aparece literal em componente; vem de configuração, porque a §24 proíbe fixar limite de plano.
- SEMPRE um turno chega à tela, inclusive quando o provedor falha — o fallback roteirizado é caminho de produção, não enfeite.
- NUNCA pedir ajuda consome cota de conversa: quem trava é exatamente o público que o produto quer servir.
- NUNCA a interface decide o que corrigir, quanto corrigir ou quando a missão avança; tudo isso chega decidido.

## Implementação

A maior tela do produto, e a que acumula mais estado. O protótipo é normativo para o que aparece e
em que ordem; a forma é livre.

- Composição a partir do scaffold shadcn/ui existente, com o layout e a hierarquia do protótipo.
- O catálogo de missões nasce como dado versionado no repositório: as 3 missões com texto idêntico ao do protótipo, incluindo as 4 etapas de cada. O texto existe na v1 como `MISSIONS[].script[]` e na v2 dentro do shim `SCRIPTS`; aqui é cópia, não escrita.
- Cada envio chama a server function do motor, que devolve o turno validado; a tela renderiza e não interpreta.
- "Travei" tem duas formas possíveis e a escolha fica registrada: consumir de um orçamento próprio, ou reaproveitar o `suggestion_en` que já veio no turno anterior sem gastar chamada nenhuma.
- A cota exibida no cabeçalho vem do mesmo lugar que a cota aplicada; dois números que podem divergir é bug esperando acontecer.

**Sobre o botão de usar a sugestão.** Ele permite concluir a missão sem produzir linguagem própria,
o que contradiz a métrica central da §20. A decisão de manter, remover ou manter sem contar como
produção precisa estar registrada antes da implementação, porque muda o que a instrumentação mede.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| `Mission` | catálogo como dado de produto: objetivo, cenário, abertura, `script[]` de 4 etapas com correção, sugestão, palavras e foco |
| `SessionState` | missão, etapa, turnos consumidos, orçamento de dicas, segundos restantes |
| `SessionMode` | enum no domínio com `guided_mission` implementado; `free_conversation` e `pronunciation` declarados |

<!-- Alternativas consideradas e REJEITADAS:
  - Manter o roteiro só como shim de preview, como a v2 do protótipo: deixa a DEC-20260916-0311 sem
    fallback de produção.
  - Cota por sessão como comportamento final, como o protótipo faz zerando em startMission: o
    usuário decidiu 8 por DIA com renovação diária e fuso no servidor; aqui é degradação
    consciente de Fase 1, não a semântica final.
  - Tradução sempre visível: a §5 pede tradução sob demanda e proporção variável por nível.
-->

## Riscos

- É a tela com mais estados de interface do produto e costuma ser subestimada — mitigação: porte G com fases, e os estados vindos do protótipo em vez de inventados.
- A latência do turno quebra a sensação de conversa se não houver indicação de espera — mitigação: o protótipo já tem o estado de "pensando", e ele entra desde o começo.
- O botão de usar a sugestão pode virar o caminho padrão do aluno, inflando conclusão de missão sem aprendizado — mitigação: a instrumentação distingue produção própria de sugestão usada, e a decisão sobre o botão é do usuário.
- Cota em memória é burlável e some no refresh — mitigação: aceitável sem autenticação; a Fase 2 move para o servidor.

## Sinais de sucesso

- Uma missão é completável de ponta a ponta e a conversa parece conversa.
- O aluno recebe correção, entende e tenta de novo — medido, não suposto.
- Nenhum turno morre na tela, mesmo com o provedor instável.

## Critério de aceite

- [ ] As 3 missões completáveis de ponta a ponta, com objetivo, cenário e as 4 etapas de cada no catálogo versionado
- [ ] Cada turno exibe fala em inglês, instrução em pt-BR, correção quando houver e resposta modelo
- [ ] Tradução sob demanda funciona e a proporção de exibição vem da política de suporte do núcleo
- [ ] Cota de turnos respeitada, com o valor vindo de configuração e o número exibido idêntico ao aplicado
- [ ] "Travei" não consome cota de conversa
- [ ] Falha do provedor cai no roteiro da missão e a conversa continua, com teste do caminho de falha
- [ ] Conclusão de missão ocorre por `next_action` validado pelo núcleo, nunca por contagem de turnos na interface
- [ ] Zero decisão pedagógica na interface: nenhuma regra de correção, nível ou avanço de etapa em componente
- [ ] Decisão registrada sobre o botão de usar a sugestão | evidence: manual @allan

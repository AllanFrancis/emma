# SPEC-20260916-1652: Fecho de lição — devolutiva do que mudou

**Status:** draft
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** progresso, resumo, licao, escada, devolutiva
**Features:** progresso
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 16:52
**Resumo:** Fecha a sessão com a devolutiva concreta do que o aluno produziu, sem inventar número nem prometer resultado.

## Objetivo

A §10 exige que a primeira experiência termine com uma vitória concreta, e o resumo é onde ela fica
visível. Sem fecho, o aluno conversa e sai sem saber o que mudou — e o que faz alguém voltar amanhã
é perceber que hoje valeu. Esta SPEC entrega `licaoOk` e `resumo` do protótipo, com uma restrição
que o protótipo não respeita: nada de número inventado nem prazo prometido.

## Escopo

**DENTRO:**
- `licaoOk`: fecho da lição, com o texto variando por personalidade, como o protótipo já faz
- `resumo`: escada de nível (`LADDER`), maior bloqueio declarado, tempo por dia e as expressões efetivamente praticadas na sessão
- Extração de `PracticedExpression` e `FocusPoint` a partir dos `words[]` e `focus` dos turnos, no momento do turno
- Deduplicação e janela dos pontos de melhoria, como o protótipo faz com os 6 últimos

**FORA:**
- `ofensiva` (sequência de dias) — exige persistência e fuso resolvido no servidor (Fase 2)
- `plano` — a rotina de 3 colunas descreve features que não existem (aquecer, revisar erros de ontem); Fase 2
- `projecao` — prazo derivado de tabela fixa; promete resultado sem base
- `retorno` — depende de autenticação e histórico (Fase 2)
- Instrumentação dos eventos (SPEC de instrumentacao-minima)

## Invariantes

- NUNCA inventar nota, percentual de evolução ou prazo de resultado; a §13.13 proíbe avaliação precisa sem evidência e a §19 proíbe depoimento fictício.
- SEMPRE as expressões e os pontos de melhoria exibidos vêm dos turnos reais da sessão, nunca de exemplo fixo — o protótipo cai num literal quando a lista está vazia, e isso é mentira em miniatura.
- SEMPRE o nível exibido usa a faixa amigável (`LADDER`), com N4 e N5 colapsados de propósito, como o protótipo define e o planejamento registrou como normativo.
- NUNCA o resumo apresenta o nível como veredito fechado.

## Implementação

Duas telas de leitura, sem entrada de dados. O trabalho real é garantir que tudo exibido tenha
origem rastreável na sessão.

- `licaoOk` reusa o `momentView` do protótipo, com o texto de fecho variando por personalidade — é a personalidade aparecendo num lugar onde ela não afeta pedagogia nenhuma.
- `resumo` mostra a escada com a posição atual, as quatro linhas de perfil e o destaque do maior bloqueio declarado.
- As expressões praticadas são derivadas dos turnos e agregadas no momento em que o turno acontece, não no fim: na Fase 2 os turnos expiram em 30 dias e a agregação precisa sobreviver a isso.
- Quando a sessão não produziu expressão nenhuma, a tela diz isso em vez de mostrar exemplo — o protótipo preenche com `["I'd like", "anything else", "card"]` quando a lista está vazia, e isso apresenta como praticado algo que não foi.

**Por que agregar no momento do turno e não no fecho.** A §18 fixa retenção de 30 dias para
mensagens detalhadas. Se o histórico de aprendizado só existir dentro do turno, ele morre com o
turno. Extrair no momento é o que permite o aluno manter o que aprendeu depois que a conversa
expira.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| `PracticedExpression` | expressão, contagem, última vez — derivada de `words[]`, agregada no turno |
| `FocusPoint` | ponto de melhoria recorrente, derivado de `focus`, com janela dos últimos N |
| Nível exibido | derivado: faixa do `LADDER` a partir do nível interno, N4 e N5 na mesma etiqueta |

<!-- Alternativas consideradas e REJEITADAS:
  - Exibir exemplo fixo quando a sessão não gerou expressões, como o protótipo: apresenta como
    praticado o que não foi praticado.
  - Agregar expressões e pontos de melhoria só no fecho da sessão: perde o histórico de
    aprendizado quando o turno expirar em 30 dias (Fase 2).
  - Incluir a projeção de prazo no resumo: número derivado de tabela fixa, apresentado como
    previsão. Promete resultado.
-->

## Riscos

- O resumo pode parecer vazio numa sessão curta, tendo o efeito oposto ao pretendido — mitigação: o conteúdo é o que houve; se sessão curta gera resumo pobre, o sinal é sobre a sessão e a instrumentação vai mostrar.
- A escada com 4 faixas para 5 níveis internos pode confundir quem sobe de N4 para N5 sem ver mudança — mitigação: é comportamento normativo e deliberado do protótipo, registrado como decisão, não bug.

## Sinais de sucesso

- O aluno termina a sessão sabendo o que produziu e o que trabalhar, sem receber número inventado.
- As expressões praticadas sobrevivem à expiração das mensagens na Fase 2.

## Critério de aceite

- [ ] `licaoOk` e `resumo` implementados com conteúdo e hierarquia fiéis ao protótipo
- [ ] O texto de fecho varia por personalidade
- [ ] Toda expressão e todo ponto de melhoria exibidos vêm de turnos reais da sessão
- [ ] Sessão sem expressões exibe a ausência, e nunca exemplo fixo
- [ ] `PracticedExpression` e `FocusPoint` são extraídos no momento do turno, com teste que prova que sobrevivem ao descarte do turno
- [ ] Nenhuma nota, percentual de evolução ou prazo de resultado é exibido
- [ ] A escada usa a faixa amigável com N4 e N5 colapsados

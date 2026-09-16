# Feature: progresso

**Keywords:** resumo de lição, sequência de dias, expressões praticadas, métrica central, instrumentação, LADDER
**Arquivos principais:**
  - —
**Resumo:** Sessões, sequência de dias, expressões praticadas e a instrumentação da métrica que define o produto.

## Specs desta feature
### Concluídas
—
### Planejadas (future/)
- SPEC-20260916-1652-conversa-e-missoes | Conversa e missões | Compartilhado com `dialogo`: é onde as expressões praticadas nascem
- SPEC-20260916-1652-fecho-de-licao | Fecho de lição — devolutiva do que mudou | Entrega licaoOk e resumo sem inventar número nem prazo
- SPEC-20260916-1652-instrumentacao-minima | Instrumentação mínima | Sem medição, a Fase 1 é demonstração e não prova

## Estado atual

Nada implementado.

**A métrica pedagógica central é comportamental, não de engajamento** (§20): *o aluno produziu
linguagem e tentou novamente após receber feedback?* O documento é explícito em não otimizar por
clique ou tempo de tela. Isso é o que separa medir aprendizado de medir uso.

O protótipo acumula em estado, e essa forma é boa: `words[]` com deduplicação e `focus[]`
deduplicado e limitado aos 6 últimos, ambos alimentados a cada turno a partir da saída do modelo.
Já a v2 do protótipo persiste `words.slice(-24)` e `focus.slice(-6)`, e **não** persiste o log da
conversa — minimização de dados alinhada com a §18.

Duas coisas do protótipo que não podem ir para produção como estão:
- `streak` é fixo em `1` e nunca incrementa. Sequência real exige persistência e fuso resolvido no servidor.
- O `plano` exibe uma rotina de três colunas — aquecer com a frase do dia, conversar, revisar os erros de ontem — descrevendo features que não existem. Ficou como `ADIAR`.
- O `resumo` cai num literal (`["I'd like", "anything else", "card"]`) quando a lista de expressões está vazia, apresentando como praticado algo que não foi.

**Restrição de arquitetura que vem da retenção.** A §18 fixa 30 dias para mensagens detalhadas. Se
o histórico de aprendizado só existir dentro do turno, ele morre com o turno — então
`PracticedExpression` e `FocusPoint` têm de ser extraídos no momento do turno, não no fecho da
sessão nem por análise posterior.

## Decisões arquiteturais ativas
—

## Alternativas consideradas e rejeitadas
—

## Gotchas
—

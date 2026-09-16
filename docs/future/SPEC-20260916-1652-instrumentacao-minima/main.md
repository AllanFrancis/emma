# SPEC-20260916-1652: Instrumentação mínima — medir a métrica que define o produto

**Status:** draft
**Porte:** P
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** progresso, metricas, instrumentacao, nova-tentativa, funil
**Features:** progresso
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 16:52
**Resumo:** Instrumenta os poucos eventos que permitem responder se o aluno produziu linguagem e tentou de novo após o feedback.

## Objetivo

A §20 nomeia uma métrica pedagógica central: **o aluno produziu linguagem e tentou novamente após
receber feedback?** Sem isso instrumentado, a Fase 1 entrega telas bonitas e não prova nada — e a
§22 define o MVP justamente como prova, não como demonstração. Esta SPEC é pequena de propósito:
poucos eventos, escolhidos porque respondem a pergunta, e não porque são fáceis de coletar.

## Escopo

**DENTRO:**
- O evento central: turno em que o aluno produziu linguagem após ter recebido correção no turno anterior
- Distinção entre produção própria e uso do botão de resposta modelo — sem isso, a métrica central é inflável
- Conclusão do onboarding e tempo até a primeira interação
- Conclusão da primeira missão e quantidade de turnos por sessão
- Uso da tradução sob demanda, que é o proxy de quanto suporte em português o aluno realmente precisa
- Custo por turno em tokens, que já é conhecido (~1065 medidos) e precisa ser observado em uso real

**FORA:**
- Painel, dashboard ou visualização (Fase 4, com observabilidade)
- Retorno no dia seguinte e sequência de dias — exigem identidade persistente (Fase 2)
- Ativação e retenção de voz (Fase 3)
- Envio para serviço externo de analytics: na Fase 1 os eventos ficam locais, porque enviar dado de aprendizado a terceiro sem consentimento registrado contraria a §18

## Invariantes

- NUNCA otimizar por clique ou tempo de tela; os eventos existem para responder a pergunta pedagógica da §20.
- NUNCA enviar evento para terceiro sem consentimento registrado; na Fase 1 o destino é local.
- SEMPRE distinguir produção própria de sugestão usada; tratar as duas como iguais falsifica a métrica central.
- NUNCA instrumentar o que não será lido: evento sem pergunta associada é ruído que custa manutenção.

## Implementação

Camada fina de eventos, com nome e carga explícitos, chamada dos pontos onde o fato acontece — não
um interceptador genérico que captura tudo e decide depois.

- Contrato de evento tipado: nome, timestamp, sessão e a carga específica de cada tipo.
- O evento central precisa de correlação entre dois turnos: houve correção no turno N e produção no N+1. Isso é estado de sessão, não análise posterior.
- O destino é uma interface, para a Fase 4 trocar local por serviço sem tocar os pontos de chamada. Mesmo padrão de porta dos adapters de voz.
- Custo por turno vem do `usage` da resposta do provedor, que o Groq já devolve; é registrar o que já existe.

**Por que isto entra na Fase 1 e não depois.** A Fase 1 existe para provar que conversar com a Emma
é útil. Uma fase de prova sem medição é uma fase de demonstração — e a decisão de seguir para a
Fase 2 passa a ser de gosto em vez de evidência.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| Evento | `nome`, `timestamp`, `sessao`, carga tipada por tipo |
| `SessionState` | ganha o que permite correlacionar correção no turno N com produção no N+1 |
| Porta de destino | interface de sink; implementação local na Fase 1 |

<!-- Alternativas consideradas e REJEITADAS:
  - Instrumentar tudo e decidir depois o que olhar: gera volume, custo de manutenção e nenhuma
    resposta. A §20 já diz qual é a pergunta.
  - Enviar para analytics de terceiro já na Fase 1: dado de aprendizado a terceiro sem
    consentimento registrado contraria a §18.
  - Derivar a métrica central de logs no fim: a correlação entre turno N e N+1 é estado de sessão;
    reconstruir depois é frágil e opcionalmente errado.
-->

## Riscos

- Medir produção "própria" depende de distinguir texto digitado de sugestão copiada, e o aluno pode editar a sugestão — mitigação: registrar as três situações (própria, sugestão intacta, sugestão editada) em vez de forçar um binário.
- Eventos locais somem quando o aluno limpa o navegador, o que enviesa a leitura — mitigação: a Fase 1 mede tendência com poucos usuários, não estatística; a Fase 2 resolve com identidade.

## Sinais de sucesso

- É possível responder com dado, e não com impressão, se o aluno tentou de novo depois do feedback.
- A decisão de seguir para a Fase 2 se apoia em evidência de uso.

## Critério de aceite

- [ ] O evento central registra nova produção de linguagem após correção no turno anterior
- [ ] Produção própria, sugestão intacta e sugestão editada são registradas como situações distintas
- [ ] Conclusão do onboarding, tempo até a primeira interação, conclusão da primeira missão e turnos por sessão instrumentados
- [ ] Uso da tradução sob demanda instrumentado
- [ ] Custo por turno em tokens registrado a partir do `usage` da resposta do provedor
- [ ] Nenhum evento sai para terceiro; o destino é local e atrás de uma interface
- [ ] Todo evento instrumentado tem uma pergunta da §20 associada, declarada no código

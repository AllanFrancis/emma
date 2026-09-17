# Journal — SPEC-20260916-1652

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-17 00:18
**Onde tô:** início — nada feito ainda
**Próximo passo:** <primeiro passo concreto>
**Última decisão:** —
**Bloqueio atual:** nenhum
**Se retomar, ler:** main.md desta SPEC

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | <fase> | pendente | 2026-09-16 23:23 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
<!-- anti-alucinação por estrutura: separe o que é SABIDO (verificado no código/teste) do que é CHUTE (inferido) do que está EM ABERTO. Nunca trate inferência como fato. -->
- fato:
- inferência:
- dúvida:

### Respostas-chave do usuário

### Tentativas que falharam

### Arquivos tocados

### Onde parei

### Sessões (máx 5 linhas + 1 agregada)

## LOG (append-only — NUNCA editar entradas antigas)
<!-- tipos: ativação descoberta decisão tentativa blocker unblock refactor nota conclusão | entrada nova: specctl log -->

## 2026-09-16 23:23 — [ativação] SPEC ativada (branch feature/nucleo-pedagogico, base main)

## 2026-09-17 00:18 — [decisão] Porte G sem pipeline (main.md e o documento de requisitos) e modo autonomo, citando o usuario

Porte G exige que o CAMINHO do pipeline seja pergunta explícita, nunca default
silencioso (docs/rules/lifecycle.md, item 3). A SPEC nasceu `--future` com o main.md já
redigido, então o checkpoint não aconteceu na ordem prevista. Registro aqui o que foi
decidido e com que base, para a decisão não ficar implícita.

CAMINHO: **sem pipeline**. O main.md é rico e É o documento de requisitos — tem objetivo,
escopo DENTRO/FORA, 6 invariantes, modelo de dados com 7 entidades, riscos com mitigação e
9 critérios de aceite. Redigir prd.md e techspec.md a partir dele produziria terceira e
quarta cópia do mesmo contrato, que é o dual-write que a própria regra combate. A regra
prevê exatamente este caso: "parcial/sem pipeline → main rico, ele É o documento de
requisitos".

Também pesou que a arquitetura NÃO é o difícil aqui. O main.md já nomeia os módulos, a
saída única (`PedagogicalIntent`) e a fronteira (nada de rede). O difícil é fidelidade à
rubrica, e isso se resolve com teste, não com techspec.

MODO DE EXECUÇÃO: **autônomo**. O fail-safe da regra é `com gates` quando não há modo
registrado, e o modo foi dado pelo usuário em 2026-09-16: "siga de forma autonoma!" — e
antes disso "Pode iniciar a implementação dos três worktrees mantendo cada SPEC
estritamente dentro do próprio escopo." As fases prosseguem com registro no journal.

FASES, como o porte G prevê, cada política com teste próprio antes da seguinte:
  1. Tipos do contrato do turno, gerados do schema
  2. Política de nível (mediana, teto, histerese)
  3. Política de suporte em pt-BR
  4. Política de correção (evidência, prioridade, teto)
  5. Máquina de missão
  6. Decisão de next_action
  7. Composição do PedagogicalIntent + overrides por merge

Se o usuário preferir outro caminho, isto se corrige com uma nova entrada `[decisão]` — o
que já está escrito não vira lixo, porque o main.md continua sendo o contrato em qualquer
um dos caminhos.
⎿ commit acb8deb+dirty · 7 files changed, 26 insertions(+), 117 deletions(-)

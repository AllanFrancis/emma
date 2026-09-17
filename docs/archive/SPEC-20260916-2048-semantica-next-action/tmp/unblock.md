O `[blocker]` de 12:46 está resolvido — não por reconciliação, mas por decisão do usuário de que a divergência é **conhecida e não resolvida de propósito**, e que ela pertence a outro escopo.

Citação do usuário, 2026-09-17: "Não quero deixar um `[blocker]` que dê a impressão de que a implementação da C15 está incompleta. A implementação está completa; o que apareceu foi uma decisão de domínio mais profunda que pertence a outro escopo."

### O que foi decidido: saída 3 agora, saída 2 depois

- **A C15 fica estrita**, como implementada: `corrections.length > 0` ⇒ só `retry` é coerente.
- **Mas o estatuto dela é de OBSERVAÇÃO/MEDIÇÃO**, não de norma. Ela não reprova o núcleo e não bloqueia CI. Está escrito no comentário da checagem em `grade.mjs`, e o `--levantamento-aplicacao` imprime um aviso explícito quando encontrar `complete_mission` com correção, dizendo que é divergência conhecida e não defeito.
- **A exceção do núcleo permanece VÁLIDA.** Não é bug. `decidirNextAction` e o teste `"mas fechar a missao vence a cobranca de repeticao"` ficaram intactos, por instrução expressa: "Preserve tanto a linha quanto o teste existente de fechamento da missão. Também não ajuste a C15 para acomodá-los."
- **A reconciliação tem SPEC própria:** SPEC-20260917-1259-contrato-de-correcoes, criada em `docs/future/` e registrada no DAG do programa `emma` como dependente desta. Porte G, porque resolve seis superfícies em conjunto — schema do turno, núcleo, C15, prompt, exceção de `complete_mission` e compatibilidade com as 107 evidências históricas.

### Duas semânticas coexistindo, declaradamente

| Camada | O que responde |
|---|---|
| C15 | "Sob a regra estrita, quantos turnos com correção não pedem aplicação?" |
| Núcleo | "Uma missão concluída pode vencer a necessidade de repetição." |

Isso não está escondido em nenhum dos dois lugares. É o estado desenhado até a SPEC do contrato de correções.

### Duas ressalvas que o usuário fixou para a SPEC futura

1. **Não assumir que qualquer correção em `complete_mission` é automaticamente informativa.** A classificação precisa de regra objetiva.
2. **Dependência explícita antes de a C15 virar gate:** a SPEC futura tem de resolver conjuntamente correção bloqueante × informativa, comportamento de `next_action`, a exceção de `complete_mission`, o schema do turno, o núcleo, a C15 e a compatibilidade com a evidência histórica.

### Levantamento oficial, confirmado

61 turnos mensuráveis com correção, 38 sem pedido de aplicação, **62,3%**, zero chamada nova ao modelo. Os números anteriores que incluíam `conversas/` (64 e 41, 64,1%) estão SUBSTITUÍDOS pela medição reproduzível — `node scripts/eval/grade.mjs --levantamento-aplicacao`. Registrado em `evidence/levantamento-taxa.md`.

Esta SPEC está pronta para fechar nesses termos, com a divergência registrada como conhecida e não resolvida.

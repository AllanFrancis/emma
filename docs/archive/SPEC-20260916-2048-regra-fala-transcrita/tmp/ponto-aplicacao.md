Ponto de aplicação: FILTRAR NO NÚCLEO PEDAGÓGICO. Registrada como
DEC-20260916-2332-grafia-filtrada-no-nucleo em `docs/features/dialogo.md`.

As duas opções que o main.md colocou na mesa:

(a) Rejeitar em `validateTurn` — mais forte: a correção deixa de existir porque o turno
    inteiro fica inválido.
(b) Filtrar no núcleo — mais tolerante: o modelo propõe, o núcleo descarta.

Escolhida (b). Três razões, na ordem em que pesaram:

1. O levantamento mostra que o resto do turno estava BOM nos 4 casos. Rejeitar no
   validador transforma "uma correção ruim entre várias" em `json_validate_failed`, o
   que aciona retry e depois `scriptedTurn()` pela DEC-20260916-0311. Trocar um turno
   inteiro, com fala e instrução aproveitáveis, por um turno roteirizado é perda líquida
   — e a taxa de 4,8% viraria 4,8% de turnos degradados sem necessidade.
2. `validateTurn` valida CONTRATO. Correção de grafia é saída bem-formada: os 9 campos
   estão lá, o tipo está certo, a evidência é literal (C11 passa em todos os 4). O que
   está errado é PEDAGÓGICO. Misturar as duas coisas no validador apaga a fronteira que
   a ARCHITECTURE.md declara — "regra pedagógica em texto de prompt ou em componente é
   violação da §11", e o validador de contrato é da mesma família.
3. A DEC-20260916-1612 já dá ao núcleo a autoridade sobre `next_action`. Isso importa
   porque o descarte não basta: em 3 dos 4 casos o `next_action` era `retry`. Se o
   núcleo só remove a correção, sobra um turno pedindo que o aluno repita sem lhe mostrar
   nada para corrigir. O núcleo tem de descartar E rebaixar o `next_action` quando a
   lista esvazia — e ele é o único lugar que já pode fazer as duas.

Alternativa (a) NÃO foi descartada por preguiça: se a taxa fosse alta ou se o padrão
aparecesse acompanhado de turno inaproveitável, invalidar seria defensável. Os dados
dizem o contrário.

FORA DESTA SPEC, por decisão do usuário de manter cada SPEC no próprio escopo: a
implementação do filtro. Ela pertence à SPEC-20260916-1652-nucleo-pedagogico, que roda
em paralelo em outro worktree e precisará PORTAR o predicado para TypeScript — o
`isSurfaceOnlyCorrection` desta SPEC vive em `scripts/eval/turn-validator.mjs`, que é
harness de eval em .mjs, não código de produto.

O que esta SPEC entrega para aquela consumir:
- a definição verificável de "diferença exclusivamente de superfície" (caixa, pontuação,
  acento), com os pares de teste que separam violação de correção legítima;
- a taxa base de 4,8% para comparar depois da aplicação;
- C14, que passa a acusar regressão em qualquer rodada futura.

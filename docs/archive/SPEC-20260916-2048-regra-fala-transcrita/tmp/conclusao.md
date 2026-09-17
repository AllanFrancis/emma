A DEC-20260916-0312 deixou de depender de obediência do modelo. O que existia era uma
frase no prompt v5; o que existe agora é uma checagem que reprova.

Entregue:
- `isSurfaceOnlyCorrection` exportado de `scripts/eval/turn-validator.mjs`, sobre uma
  normalização de superfície que remove caixa, pontuação e diacrítico. `validateTurn` e
  `validateEvidence` ficaram intocados — a regra é pedagógica, não de contrato.
- C14 no array `CHECKS` de `grade.mjs`, com `every`: uma correção de superfície contamina
  o turno mesmo acompanhada de correção legítima.
- 7 pares de self-test. Positivos: caixa (`english`->`English`), pontuação
  (`lets go`->`let's go`), acento (`cafe`->`café`), mista na mesma lista. Negativos:
  `i'm agree`->`I agree` e `I want`->`I'd like`. Suíte: 26 casos de turno, 14 checagens,
  0 falhas.
- Descoberta de evidência dividida em duas funções nomeadas —
  `findEvidenceTargets` (docs/active, execução atual, única fonte de `printTable` e dos
  gates) e `findHistoricalEvidenceTargets` (docs/archive, só levantamento) — sobre um
  `collectEvidenceTargets` comum. Modo `--levantamento-superficie` reporta as duas
  separadas e nunca somadas.

Medido, sem uma chamada nova ao modelo: 190 turnos, 61 com correção, 83 correções, 4 de
grafia (4,8%), 3 delas pedindo `retry`. O caso `livre-02 n1 tranquila` que originou a
SPEC apareceu, e com ele três irmãos — incluindo um `wifi`->`Wi-Fi` que a leitura humana
não tinha pego. Zero falso positivo nas outras 79.

Decidido e registrado como DEC-20260916-2332: o núcleo pedagógico FILTRA, o validador não
rejeita. Rejeitar invalidaria turno bom inteiro por causa de uma correção entre várias, e
o levantamento mostra que o resto do turno estava aproveitável nos 4 casos. O núcleo
também precisa rebaixar `next_action` quando a lista de correções esvazia, senão sobra um
turno pedindo repetição sem mostrar o que corrigir — a DEC-20260916-1612 já lhe dá essa
autoridade.

O que NÃO entrou, de propósito: a aplicação do filtro. Ela é da
SPEC-20260916-1652-nucleo-pedagogico, que precisa portar o predicado para TypeScript —
`turn-validator.mjs` é harness de eval, não código de produto. Também não entrou nada de
`semantica-next-action` nem de retenção de contexto, por instrução do usuário de manter
cada SPEC no próprio escopo.

Porte P mantido, com a regra citada: o gatilho normativo de escalada é precisar de suíte
ou script novo, e o harness de self-test já existia.

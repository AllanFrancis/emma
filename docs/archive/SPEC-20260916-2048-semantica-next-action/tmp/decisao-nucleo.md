Decisão do usuário em 2026-09-17, fechando o critério 4.

### Fonte de verdade de `next_action`: o núcleo sobrescreve a proposta do modelo

Citação do usuário: "Escolho núcleo sobrescrevendo a proposta do modelo." E a regra determinística que ele especificou:

- há correção que requer aplicação → o núcleo força a ação de repetição/aplicação;
- não há correção → respeita-se a semântica correspondente do fluxo/missão;
- avanço ou conclusão nunca podem ignorar uma correção pendente.

O modelo continua PROPONDO `next_action`; o núcleo produz o valor final. Isso não é novidade de governança, é a aplicação de DEC-20260916-1612 a este campo.

### O que sustenta a escolha

Taxa medida offline, sem uma chamada nova: **38 de 61 turnos com correção emitida (62,3%) não pedem aplicação**, todos `reply`. Reproduzível por `node scripts/eval/grade.mjs --levantamento-aplicacao`.

E o argumento decisivo contra resolver por instrução de prompt: `hotel-10` está gravado duas vezes, mesma fala e mesma correção (1, `grammar`). No contrato-do-turno-v2 veio `next_action=retry`, correto. No prompt-v5 veio `reply`. O prompt REGREDIU o caso, e ninguém notou porque nenhuma checagem media. Instrução de prompt é justamente o que falhou — tratá-la como garantia seria repetir o erro que a evidência já registrou.

### Tabela de coerência: aprovada sem exceção

As duas combinações sem base empírica foram classificadas INCOERENTES por decisão do usuário:

- `continue_mission` + correção emitida → incoerente
- `complete_mission` + correção emitida → incoerente

Regra aprovada, na formulação dele: "se existe uma correção que o aluno precisa aplicar, o fluxo pedagógico deve dar oportunidade de aplicação antes de avançar ou concluir a missão."

E o limite explícito: "enquanto o contrato atual não distinguir explicitamente uma 'correção informativa/não bloqueante', uma correção emitida deve impedir `continue_mission` e `complete_mission`. Se futuramente quisermos permitir observações no fechamento da missão sem exigir nova tentativa, isso deve entrar como uma semântica nova e explícita no contrato. Não quero abrir essa exceção implicitamente dentro da C15."

Consequência: a C15 não tem exceção. `corrections.length > 0` ⇒ só `retry` é coerente. A porta para observação no fecho se abre mudando o CONTRATO do turno, nunca afrouxando a checagem.

### O que foi implementado

- **C15** em `CHECKS` de `scripts/eval/grade.mjs`, espelho de C12. Independe de `record` — ao contrário de C12, que precisa de `tipo_erro` —, então roda sobre qualquer evidência, inclusive matriz e conversas.
- **7 casos de self-test**, cobrindo os quatro valores do enum com correção (incluindo `continue_mission` e `complete_mission`, explicitamente pedidos pelo usuário), os dois casos de silêncio sem correção, e a independência de `record`. Suíte: 33 casos de turno, 15 checagens de turno, 0 falha.
- **`--levantamento-aplicacao`**, mesma forma do `--levantamento-superficie` que a SPEC-20260916-2048-regra-fala-transcrita criou: lê `docs/active/` e `docs/archive/` como fontes SEPARADAS, porque somar rodada atual com histórico não dá taxa, dá mistura.
- C15 entra de graça no relatório de conversa (`--conversas`) e na legenda, porque as duas camadas iteram `CHECKS`. Nenhuma linha da camada de relatório foi tocada — território de `metodologia-de-repeticao`.

### Contagem de checagens corrigida onde é superfície desta SPEC

O contrato dizia "13 checagens"; já eram 14 quando foi escrito, porque a C14 (grafia de fala transcrita) entrou pela SPEC-20260916-2048-regra-fala-transcrita, arquivada depois. Corrigido em: `main.md` desta SPEC (para 14, que é o estado ANTERIOR a esta SPEC — a lacuna existia contra 14), `docs/ARCHITECTURE.md` (para 15, estado atual) e o comentário do bloco longitudinal em `grade.mjs` (para 15).

NÃO corrigido de propósito: as três ocorrências históricas em `docs/features/dialogo.md` (linhas que descrevem o que era verdade quando o contrato v2 e a SPEC longitudinal fecharam) e todas as do `docs/archive/` — editá-las falsificaria registro. E a linha do mapa de arquivos de `dialogo.md`, que descreve estado atual e deveria ir a 15, fica DIFERIDA para o `### Delta de estado` do fechamento: `dialogo.md` é o arquivo em colisão de claim com `motor-de-dialogo`, e `docs/rules/team.md` proíbe editar a prosa de estado concorrentemente.

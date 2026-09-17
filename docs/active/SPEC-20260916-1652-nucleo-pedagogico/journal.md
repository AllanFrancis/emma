# Journal — SPEC-20260916-1652

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-17 00:21
**Onde tô:** concluída — os 9 critérios evidenciados no commit `2b83700`
**Próximo passo:** fechar (`close`); quem consome é motor-de-dialogo e onboarding-e-perfil
**Última decisão:** Porte G sem pipeline, modo autônomo, citando o usuário
**Bloqueio atual:** nenhum
**Se retomar, ler:** main.md desta SPEC + `src/domain/index.ts` (a fronteira pública)

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | Tipos do contrato do turno, gerados do schema | concluída | 2026-09-17 00:18 |
| 2 | Política de nível (mediana, teto, histerese) | concluída | 2026-09-17 00:18 |
| 3 | Política de suporte em pt-BR | concluída | 2026-09-17 00:18 |
| 4 | Política de correção (evidência, prioridade, teto) | concluída | 2026-09-17 00:18 |
| 5 | Máquina de missão | concluída | 2026-09-17 00:18 |
| 6 | Decisão de `next_action` | concluída | 2026-09-17 00:18 |
| 7 | Composição do `PedagogicalIntent` + overrides por merge | concluída | 2026-09-17 00:18 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
<!-- anti-alucinação por estrutura: separe o que é SABIDO (verificado no código/teste) do que é CHUTE (inferido) do que está EM ABERTO. Nunca trate inferência como fato. -->
- fato: 76 testes passam (`bun test`), `bun x tsc --noEmit` exit 0, `bun run lint` 0 erros (6 avisos pré-existentes em `src/components/ui/`).
- fato: o módulo tem 8 arquivos em `src/domain/` e nenhum importa rede, SDK, provedor ou `scripts/eval/` — há um teste que LÊ os próprios arquivos e reprova se alguém adicionar.
- fato: os tipos do turno são gerados; `node scripts/gen-turn-types.mjs --check` reprova arquivo desatualizado e um teste roda esse `--check`.
- fato: o manifesto passou a declarar `commands.test = bun test`, e o `close --dry` já reconhece ("suíte do projeto roda 1× no close").
- fato: `AGENTS.md`/`CLAUDE.md` regenerados por `specctl entrypoints` por causa do label de test.
- inferência: `etapaFechou` por `expectedWords` deve cobrir as 3 missões do protótipo, mas isso só se confirma quando o catálogo real entrar (SPEC de conversa-e-missoes) — a fixture aqui é minha, não o roteiro dele.
- dúvida: a ordem entre `grammar` e `register` em `PRIORIDADE_DE_CATEGORIA` é opinião pedagógica sem medição. O main.md já declarava o risco; a ordem é dado configurável exatamente por isso.
- dúvida: `maxCorrectionsPara` (1/2/3 por nível) é escolha minha em cima da invariante do teto de 3. Não contradiz nada declarado, mas não estava especificada.

### Respostas-chave do usuário
- 2026-09-16: "siga de forma autonoma!" → modo de execução `autônomo` registrado, em vez do fail-safe `com gates`.
- 2026-09-16: "Pode iniciar a implementação dos três worktrees mantendo cada SPEC estritamente dentro do próprio escopo." → nada de motor, tela, personalidade ou catálogo de missões entrou aqui.

### Tentativas que falharam
- `new URL(import.meta.url).pathname` para achar a raiz nos testes: devolve `%20` no caminho com espaço e 6 testes morreram com ENOENT. Resolvido com `fileURLToPath`.
- `eslint --fix` reformatou `turn-contract.generated.ts` e derrubou o teste de dual-write, que compara byte a byte. Resolvido pondo o gerado em `ignores`, como `routeTree.gen.ts` já estava.
- Primeira rodada de `tsc` acusou 24 erros de `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`. Corrigidos com guarda e com `?: T | undefined` onde `undefined` é valor legítimo — nenhum `as` novo, nenhum `any`.

### Arquivos tocados
- `src/domain/`: `types.ts`, `level-policy.ts`, `support-policy.ts`, `correction-policy.ts`, `mission.ts`, `next-action.ts`, `preferences.ts`, `intent.ts`, `index.ts`, `turn-contract.generated.ts` (gerado) + 6 arquivos de teste.
- `scripts/gen-turn-types.mjs` (novo), `package.json` (scripts `test` e `gen:turn-types`), `eslint.config.js` (ignora o gerado), `docs/.spec-system.json` (`commands.test`).
- `docs/features/pedagogia.md` e `docs/features/avaliacao.md`.

### Onde parei
Critérios 1-9 carimbados. Falta só o `close`.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-16 23:23→2026-09-17 00:20 — ativação, decisão de porte/pipeline, as 7 fases, 76 testes, DECs e carimbo dos 9 critérios.

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

## 2026-09-17 00:21 — [conclusão] Nucleo pedagogico em pe: 5 politicas como dados e funcoes, 76 testes, PedagogicalIntent como saida unica

Existe pela primeira vez código de produto neste repositório, e ele é pedagogia — não
tela, não prompt, não integração. A §11 do prompt de desenvolvimento deixou de ser
intenção: as regras que estavam dentro de um texto agora são dados e funções com teste.

O que ficou de pé, política por política:

- NÍVEL. Mediana dos critérios pontuados, nunca média. O teste que importa é o do perfil
  que o produto existe para consertar: [5,5,5,5,1] dá média 4,2 e a média não vê problema
  nenhum; a mediana dá 5 e o teto por sustentação derruba para 4. Histerese assimétrica —
  2 avaliações para subir, 3 para descer, 1 degrau por vez — porque dia ruim não pode
  rebaixar quem está aprendendo. Nota sem citação sai da conta como se fosse `null`.
- SUPORTE pt-BR. Tabela por nível (1 → 0,75 → 0,5 → 0,25 → 0,1). A preferência da
  professora desloca ±0,15 mas não inverte: um N1 com suporte mínimo ainda recebe mais
  apoio que um N4 com suporte alto. Nível é evidência, preferência é gosto, evidência ganha.
- CORREÇÃO. Evidência literal obrigatória, teto de 3 e truncagem por prioridade de
  categoria. O teste que prova a ordem é o que mais vale: com teto 1, uma lista que chega
  como [register, grammar, false_friend] sai como [false_friend] — por ordem de chegada
  sairia `register`, mantendo o detalhe e descartando o erro que inverte o sentido.
- MISSÃO. Tabela de transição em que `complete` só existe na última etapa. Isso torna
  `complete_mission` na etapa 2 de 4 estruturalmente impossível, em vez de proibido por um
  `if` que alguém esquece.
- NEXT_ACTION. A proposta do modelo é entrada, não comando (DEC-20260916-1612). Recusa
  `complete_mission` prematuro, recusa `continue_mission` sem etapa seguinte, recusa
  `retry` sem correção, e força `retry` quando houve correção — com uma exceção: fechar a
  missão vence a cobrança de repetição, porque cobrar repetição depois da vitória
  transforma a vitória em tarefa.
- OVERRIDES. Merge em objeto novo, e a sessão nunca escreve no perfil. `undefined` num
  override significa "não mexi nisso", não "apague".

Sobre o contrato do turno: os tipos são GERADOS de `scripts/eval/turn-schema.json`. O
schema é a fonte porque é ele que o strict mode do Groq consome, e o `--check` do gerador
reprova arquivo desatualizado — com um teste que roda esse `--check`. Mudar o schema sem
regenerar reprova a suíte, que é o único jeito de o dual-write não nascer sem ninguém ver.
`maxItems: 3` não é expressável em tipo TypeScript, então o teto virou regra de runtime e
há um teste que amarra as duas coisas.

Números: 76 testes, 269 asserções, `tsc --noEmit` limpo com `noUncheckedIndexedAccess` e
`exactOptionalPropertyTypes` ligados, lint sem erro. O teste mais útil da suíte é o que LÊ
os arquivos do próprio módulo e reprova se aparecer `fetch(`, import de `scripts/eval` ou
de qualquer SDK — a invariante "sem rede" passou a ser verificada, não prometida.

O que NÃO entrou, de propósito: motor de diálogo, telas, camada de personalidade,
catálogo real de missões e persistência. Nada de `semantica-next-action` nem de retenção de
contexto, por instrução do usuário. O filtro de correção de grafia decidido pela
SPEC-20260916-2048-regra-fala-transcrita (DEC-20260916-2332) tampouco entrou: ela roda em
paralelo em outro worktree e a decisão de lá previu que a aplicação seria da SPEC seguinte
do núcleo, não desta — puxá-la aqui seria antecipar trabalho de branch que ainda não
mergeou.

Duas escolhas minhas que não estavam especificadas e ficam à revisão: o teto de correção
por nível (1 no N1, 2 nos N2–N3, 3 do N4 em diante) e o critério de fechamento de etapa por
`expectedWords`. Nenhuma contradiz invariante declarada, e as duas são dado, não código.
⎿ commit 2b83700+dirty · 6 files changed, 59 insertions(+), 24 deletions(-)

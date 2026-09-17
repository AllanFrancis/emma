# Feature: pedagogia

**Keywords:** núcleo pedagógico, PedagogicalIntent, política de nível, política de suporte, priorização de correção, máquina de missão
**Arquivos principais:**
  - —
**Resumo:** Decide O QUE ensinar — nível, quanto português, o que corrigir e quando a missão avança — separado de quem fala com o modelo.

## Specs desta feature
### Concluídas
- SPEC-20260916-1652 | 2026-09-17 | `pendente` | Núcleo pedagógico — políticas de nível, suporte, correção e missão como TypeScript puro, com `PedagogicalIntent` como saída única
- SPEC-20260916-2048 | 2026-09-17 | `pendente` | Semântica de `next_action` — correção emitida exige aplicação; C15 espelha C12 e o núcleo passa a ser fonte de verdade do campo
### Planejadas (future/)
—

## Estado atual

Nada implementado. A área existe porque a §3 do PROMPT DE DESENVOLVIMENTO exige uma única
inteligência pedagógica, separada de personalidade e de canal, e a §11 exige que regra de domínio
seja dado e política explícita em vez de texto de prompt.

Hoje toda decisão pedagógica mora em duas prosas: o `systemPrompt()` do protótipo e o prompt v4 do
eval em `scripts/eval/run.mjs`. As duas funcionam por instrução ao modelo, e a evidência da
SPEC-20260916-1450 mostrou que instrução não basta — o modelo roteou correção para `suggestion_en`
em 4 de 28 casos, inclusive nos dois que o prompt nomeia literalmente como "corrija TAMBÉM".

O que já existe como insumo, e é o que torna esta área implementável:
- `scripts/eval/rubric.md` — a rubrica de nível N1–N5 × 5 critérios, com descritores observáveis e evidência obrigatória.
- `scripts/eval/turn-schema.json` — o contrato do turno v2, que será a fonte única dos tipos.
- As políticas de nível já decididas em `avaliacao`: mediana com teto e histerese.

## Decisões arquiteturais ativas
- DEC-20260917-0018-intent-saida-unica [ativa] (SPEC-20260916-1652) — o núcleo expõe UMA saída, `PedagogicalIntent`, e é o único insumo pedagógico do motor de diálogo. Se o motor precisar de algo que não está no Intent, a decisão vazou do núcleo. `decidirIntent` responde antes do turno; `revisarTurno` julga o que o modelo propôs (correções sobreviventes e `next_action` final).
- DEC-20260917-0019-tipos-gerados-do-schema [ativa] (SPEC-20260916-1652) — os tipos do turno são GERADOS de `scripts/eval/turn-schema.json` por `scripts/gen-turn-types.mjs`, com `--check` que reprova arquivo desatualizado e teste que roda o `--check`. O schema é a fonte porque é ele que o strict mode do Groq consome; escrever os tipos à mão ao lado dele seria dual-write. `maxItems: 3` não é expressável em tipo, então o teto vira regra de runtime em `MAX_CORRECTIONS`.
- DEC-20260917-0020-prioridade-de-categoria [ativa] (SPEC-20260916-1652) — a truncagem de correções é por prioridade de `category` e a ordem é DADO, não código: `false_friend > word_order > grammar > preposition > vocabulary > register`. Falso cognato inverte o sentido e é o erro mais caro numa conversa; registro comunica e só soa mal, então cede o lugar primeiro. A ordem entre `grammar` e `register` é opinião até a eval medir — trocá-la não exige tocar em nenhuma função.
- DEC-20260917-0021-teto-de-correcao-por-nivel [ativa] (SPEC-20260916-1652) — além do teto de 3 do schema, o núcleo limita por nível: 1 correção no N1, 2 nos N2–N3, 3 a partir do N4. Três correções para quem está começando é o que faz a pessoa desistir.
- DEC-20260917-0022-etapa-fecha-por-expressao [ativa] (SPEC-20260916-1652) — uma etapa de missão fecha quando a fala do aluno contém alguma das `expectedWords` da etapa; etapa sem `expectedWords` fecha com qualquer produção não vazia. É critério grosso e assumidamente grosso: o roteiro do protótipo não declara condição de fechamento e a eval multiturno mostrou que o modelo também não é confiável nisso. Critério explícito e testável no núcleo é melhor que critério implícito dentro do prompt.
- DEC-20260917-0023-overrides-nao-escrevem-no-perfil [ativa] (SPEC-20260916-1652) — preferências persistentes e overrides de sessão resolvem por merge (`{...perfil, ...overrides}`), em objeto novo, e a sessão nunca escreve no perfil. Override com valor `undefined` significa "não mexi nisso", não "apague a preferência" — um spread cru apagaria.
- DEC-20260917-0024-correcao-exige-aplicacao [ativa] (SPEC-20260916-1652) — havendo correção aceita, o turno tem de pedir que o aluno a aplique (`retry`), e o núcleo sobrescreve a proposta do modelo quando ela seguir adiante. Exceção única: fechamento de missão vence a cobrança de repetição, porque cobrar repetição depois de o objetivo ter sido cumprido transformaria a vitória do aluno em mais uma tarefa. A regra geral é a mesma lacuna que a SPEC-20260916-2048-semantica-next-action vai medir; aqui ela já nasce aplicada no núcleo.

## Alternativas consideradas e rejeitadas
- SPEC-20260916-1652 | média aritmética dos 5 critérios para fechar o nível — rejeitada em 2026-09-17. Média premia quem é forte em vocabulário e mudo em conversa, que é exatamente o perfil que o produto existe para consertar; o teste `o perfil que o produto existe para consertar` fixa isso.
- SPEC-20260916-1652 | truncar correções por ordem de chegada — rejeitada em 2026-09-17. Deixaria `register` no turno e cortaria `false_friend`, ou seja, manteria o detalhe e descartaria o erro que inverte o sentido.
- SPEC-20260916-1652 | núcleo que também chama o LLM — rejeitada em 2026-09-17. Acopla decisão pedagógica a fornecedor e transforma teste de pedagogia em teste de integração. O teste `nenhum arquivo do dominio importa rede` lê os próprios arquivos do módulo para impedir a regressão.

## Gotchas
- SPEC-20260916-1652 | o tsconfig roda com `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` (2026-09-17) — acesso por índice devolve `T | undefined` e campo opcional NÃO aceita `undefined` explícito. Em domínio isso é bom (força tratar ausência), mas obriga a declarar `readonly campo?: T | undefined` quando o `undefined` é valor legítimo, e a usar guarda em vez de `as`.
- SPEC-20260916-1652 | `new URL(import.meta.url).pathname` devolve `%20` no caminho deste repo, que tem espaço em "meus projetos" (2026-09-17) — use `fileURLToPath`. Seis testes falharam com ENOENT antes de a causa aparecer.
- SPEC-20260916-1652 | arquivo gerado precisa entrar em `ignores` do eslint (2026-09-17) — o prettier reformata e o `--check` do gerador, que compara byte a byte, passa a reprovar por formatação em vez de por divergência de contrato. Mesma convenção que `src/routeTree.gen.ts` já usava.

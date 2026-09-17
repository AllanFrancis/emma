# Journal — SPEC-20260916-1652

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-17 15:44
**Onde tô:** 8 critérios evidenciados; pronto para fechar
**Próximo passo:** `close` (decisão humana) e merge de `feature/onboarding-e-perfil`
**Última decisão:** defaults de `intensity`/`speechRate` centralizados, sem pergunta nova
**Bloqueio atual:** nenhum
**Se retomar, ler:** `src/onboarding/questions.ts` (catálogo) e `defaults.ts`

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | Forma de dado do núcleo e mapeamento das 6 perguntas | concluída | 2026-09-17 13:12 |
| 2 | Catálogo, defaults, perfil e persistência, com testes | concluída | 2026-09-17 15:40 |
| 3 | Rotas e telas, com progresso por tela real | concluída | 2026-09-17 15:42 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
<!-- anti-alucinação por estrutura: separe o que é SABIDO (verificado no código/teste) do que é CHUTE (inferido) do que está EM ABERTO. Nunca trate inferência como fato. -->
- fato: as 6 perguntas mapeiam para `selfAssessedLevel`, `reason`, `blocker`, `minutesPerDay`, `TeacherPreferences.style` e `TeacherPreferences.supportLevel`. Nível por índice = 1..5; minutos = 5/10/20/30.
- fato: `preferredTime` NÃO é gravado, e teste asserta a ausência da chave. É opcional no tipo, então o corte é compatível.
- fato: `intensity` e `speechRate` não têm pergunta e `preferenciasEfetivas` exige o objeto completo. Defaults `media`/`normal` vivem só em `src/onboarding/defaults.ts`.
- fato: `decidirIntent` do núcleo REAL aceita o perfil capturado e devolve Intent coerente — nível autoavaliado vira `targetLevel` sem nenhum `LevelAssessment`.
- fato: o protótipo calculava progresso sobre 8 perguntas ignorando 4 telas intercaladas, e o progresso pulava. Corrigido contando telas reais, com teste de incremento constante.
- fato: `bun test` 107 pass / 0 fail; `tsc --noEmit` limpo; `bun run lint` 0 erro (6 avisos pré-existentes no scaffold).
- fato: zero consumo de Groq, e o percurso completa sem microfone, áudio ou permissão de navegador.
- inferência: a fidelidade visual ao protótipo é de conteúdo e hierarquia, não de pixel — a forma é livre por decisão registrada no contrato. Não houve comparação visual lado a lado.
- dúvida: nenhuma aberta para esta SPEC.

### Respostas-chave do usuário
- Defaults: "intensity: media" e "speechRate: normal", "explícitos e centralizados, não espalhados pelas telas ou criados implicitamente durante a persistência".
- "Não crie novas perguntas para esses dois campos nesta SPEC."
- "Preserve a decisão de não persistir `preferredTime` quando não houver uma regra clara de consumo desse dado. Não quero criar campo órfão apenas porque existe uma pergunta possível."
- Validação sem Groq: "toda a validação deve poder acontecer sem consumo de Groq."

### Tentativas que falharam
- Primeiro `tsc --noEmit` reprovou as rotas novas com erros que pareciam de tipagem (`'/onboarding/$tela' is not assignable to '/'`). Causa: `src/routeTree.gen.ts` é gerado pelo router-plugin e não é atualizado por `bun test` nem por `tsc`. Resolvido com `bun run build`, que regenera. Nunca editar à mão.

### Arquivos tocados
- `src/onboarding/` — `questions.ts` (catálogo + percurso + progresso), `defaults.ts`, `perfil.ts`, `momentos.ts`, `storage.ts`, mais `perfil.test.ts` e `storage.test.ts`
- `src/routes/onboarding.index.tsx` (redireciona) e `src/routes/onboarding.$tela.tsx` (tela por parâmetro de rota)
- `src/routeTree.gen.ts` — REGENERADO, não editado
- `docs/features/onboarding.md` — linha de R.7

### Onde parei
Pronto para `close`. O destino ao fim do percurso é a raiz por ora: o diagnóstico inicial é da SPEC-20260916-1652-diagnostico-inicial, que está bloqueada no DAG.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-17 12:07–15:44 — ativação em worktree paralelo, mapeamento contra o núcleo, catálogo e persistência com testes, rotas e telas, 8 critérios evidenciados.

## LOG (append-only — NUNCA editar entradas antigas)
<!-- tipos: ativação descoberta decisão tentativa blocker unblock refactor nota conclusão | entrada nova: specctl log -->

## 2026-09-17 12:07 — [ativação] SPEC ativada (branch feature/onboarding-e-perfil, base main)

## 2026-09-17 12:14 — [nota] Fronteiras da rodada paralela: sem colisao, sem Groq, arquivos gerados e forma de dado vinda do nucleo

Esta SPEC roda em worktree dedicado (`.worktrees/onboarding-e-perfil`, branch `feature/onboarding-e-perfil`), em paralelo com duas outras a partir de main 5b3f112:

- SPEC-20260916-1652-motor-de-dialogo (G) — região `src/` servidor
- SPEC-20260916-2048-semantica-next-action (P) — região `scripts/eval/grade.mjs`, área das `CHECKS`

Região desta SPEC: `src/routes/` (rotas do percurso de entrada) e composição de telas sobre os 46 componentes shadcn/ui que o scaffold já traz intocados.

**Sem colisão de claim (R.11):** esta é a única das três cuja feature (`onboarding`) não é compartilhada. As outras duas colidem entre si em `dialogo`; esta não participa. `docs/features/onboarding.md` tem escritor único nesta rodada.

**Restrição de rede — decisão do usuário nesta rodada:** esta SPEC não consome Groq, porque o escopo dela não exige. O onboarding captura perfil e preferências; a primeira conversa (que precisa do modelo) é de `conversa-e-missoes` e `diagnostico-inicial`, ambas bloqueadas no DAG. Se aparecer necessidade de chamada ao modelo aqui, isso é sinal de escopo vazando, não de dependência legítima.

**Sobreposição de arquivo gerado a vigiar:** `src/routeTree.gen.ts` é GERADO pelo router-plugin e está fora do lint. Esta SPEC adiciona rotas, então vai regenerá-lo. `motor-de-dialogo` mexe no lado servidor e pode ou não tocá-lo. Instrução do usuário: arquivo gerado se REGENERA depois do merge, não se reconcilia à mão. Mesma regra vale para `docs/PROGRAMS.md`, que as três branches alteram nas mesmas duas linhas (`prontos:` / `em progresso:`) por efeito da ativação.

**Fronteira de dado:** `LearnerProfile` e `TeacherPreferences` têm a forma definida pela SPEC-20260916-1652-nucleo-pedagogico, já ARQUIVADA — a forma é insumo, não invenção desta SPEC. Ler o archive dela antes de gravar campo.

**Corte já contratado no main.md:** `quantoFala` e `quando` NÃO são capturados (alimentam decisão nenhuma na Fase 1), e `projecao` fica para a Fase 2. Isso é escopo fechado, com justificativa registrada — não reabrir por conta própria.
⎿ commit eabbb95

## 2026-09-17 13:12 — [descoberta] Mapeamento das 6 perguntas fecha, mas intensity e speechRate nao tem pergunta e o nucleo nao tem default

Forma de dado levantada em `src/domain/types.ts`, que existe e está versionado — o núcleo pedagógico já foi entregue e arquivado. A forma é INSUMO desta SPEC, não invenção dela.

### O que o núcleo define

```ts
interface LearnerProfile {
  readonly selfAssessedLevel: Level;   // "Ponto de partida declarado, nunca classificação"
  readonly reason: string;
  readonly blocker: string;
  readonly minutesPerDay: number;
  readonly preferredTime?: string;     // OPCIONAL
}

interface TeacherPreferences {
  readonly style: "tranquila" | "direta" | (string & {});
  readonly intensity: "baixa" | "media" | "alta";
  readonly supportLevel: "minimo" | "medio" | "alto";
  readonly speechRate: "lenta" | "normal" | "rapida";
}
```

### Mapeamento das 6 perguntas contratadas

| Pergunta | Campo |
|---|---|
| `nivel` | `LearnerProfile.selfAssessedLevel` |
| `motivo` | `LearnerProfile.reason` |
| `bloqueio` | `LearnerProfile.blocker` |
| `minutos` | `LearnerProfile.minutesPerDay` |
| `personalidade` | `TeacherPreferences.style` |
| `audio` | `TeacherPreferences.supportLevel` |

O mapeamento fecha exatamente como o `main.md` previu: "`style` da escolha de personalidade, `supportLevel` inicial da preferência de áudio".

### Confirmação do corte de `quando`

`preferredTime` é **opcional** no tipo, e o comentário do núcleo diz "Capturado no onboarding; só alimenta notificação, que é Fase 4". O corte contratado nesta SPEC — não capturar `quando` — é portanto COMPATÍVEL com o tipo: não gravar o campo é válido, e gravá-lo criaria campo órfão, violando o critério "Todo campo gravado tem consumidor no núcleo".

Ou seja, o comentário do núcleo descreve a intenção original do protótipo, não uma exigência. Nada a reconciliar.

### LACUNA REAL: dois campos sem pergunta

`TeacherPreferences` exige **quatro** campos, e as 6 perguntas cobrem apenas dois (`style` e `supportLevel`). `intensity` e `speechRate` não têm pergunta correspondente, e `preferenciasEfetivas` no núcleo exige o objeto COMPLETO — não há default lá, e o merge de overrides pressupõe persistentes inteiras.

Então esta SPEC tem de fornecer valor inicial para os dois. Escolha, por ser decisão menor de valor default:

- `intensity: "media"` — opção do meio do enum, o neutro defensável
- `speechRate: "normal"` — idem; e este campo só tem efeito no TTS, que é Fase 3, então em Fase 1 é inerte

Isso NÃO é campo órfão: os dois são consumidos pelo núcleo via `preferenciasEfetivas`. O que falta é pergunta, não consumidor — e o `main.md` não contratou pergunta para eles. Acrescentar tela nova seria ampliar escopo; usar default neutro é o que o contrato permite.

Registrado aqui para que a escolha do default seja visível em vez de ficar escondida no código. Se o usuário quiser pergunta para algum dos dois, isso é mudança de escopo e vai por R.6.2.

### Onde o perfil vive na Fase 1

No cliente, sem banco — o `main.md` é explícito e assume o risco: "limpar o navegador apaga o onboarding — mitigação: aceitável sem autenticação, e é exatamente o que a Fase 2 resolve."
⎿ commit 12e8ddc

## 2026-09-17 15:44 — [conclusão] Percurso de entrada completo, com perfil que o nucleo consome de verdade

O aluno chega da tela de entrada até um perfil que o núcleo pedagógico consome de verdade.

### O que foi entregue

**Catálogo declarativo, não componente.** `src/onboarding/questions.ts` guarda as seis perguntas com enunciado, opções e subtítulos copiados do protótipo. Uma tela parametrizada pelo catálogo, que é a forma que o protótipo já usava e que o contrato decidiu manter — o diff mostra qualquer desvio de texto.

**Passo como parâmetro de rota**, `/onboarding/$tela`, validado contra o percurso. Deep link, voltar do navegador e retomada saem de graça; o protótipo usava índice em estado global e perdia os três.

**Barra de progresso que conta telas reais.** O protótipo dividia o percentual por 8 perguntas com 4 telas intercaladas fora da contagem, e o progresso pulava. Aqui cada tela vale um passo, com teste provando incremento constante e fechamento em 100%.

**Perfil na forma do núcleo, provado contra o núcleo.** O teste que importa não é de tipo — tipo o compilador já garante. É o de integração: `preferenciasEfetivas` aceita as preferências capturadas, e `decidirIntent` produz um Intent coerente, com o nível autoavaliado virando `targetLevel` sem nenhum `LevelAssessment`. Ou seja, a autoavaliação cumpre exatamente o papel de ponto de partida declarado.

**Defaults centralizados.** `intensity` e `speechRate` não têm pergunta, e `preferenciasEfetivas` exige o objeto completo. Os dois vivem em `src/onboarding/defaults.ts` e em nenhum outro lugar — nenhuma tela e nenhuma função de persistência inventa valor para eles.

### Os dois cortes, mantidos

`quantoFala` e `quando` continuam fora, e `preferredTime` NÃO é gravado. Teste asserta a ausência da chave. O tipo do núcleo tem o campo como opcional e o comentário dele menciona captura no onboarding, mas isso descreve a intenção do protótipo, não uma exigência — gravar criaria campo órfão, contra o critério de aceite.

### Escolhas de implementação que valem registro

**Persistência tolerante.** Toda leitura de `localStorage` devolve vazio em vez de lançar quando o dado está ausente, corrompido, ou quando `localStorage` não existe (SSR, modo privado, armazenamento bloqueado). Onboarding que quebra por navegador sujo é pior que onboarding que recomeça.

**Resposta fora do catálogo é descartada na leitura.** Se uma opção mudar de texto entre versões, o valor velho no navegador deixaria `montarPerfil` lançar numa sessão que o usuário não tem como consertar. O filtro evita isso.

**`montarPerfil` recusa perfil parcial** em vez de gravar meio dado: perfil incompleto faria o núcleo decidir sobre informação que a pessoa não deu.

### Gotcha para as próximas SPECs de tela

`src/routeTree.gen.ts` é GERADO pelo router-plugin e não é atualizado por `bun test` nem por `tsc`. Rota nova sem `bun run build` (ou `dev`) faz o typecheck reprovar com erros que parecem ser de tipagem da rota, mas são de árvore desatualizada. Regenerar, nunca editar à mão.

### Verificação

`bun test` 107 pass / 0 fail (31 novos). `bun x tsc --noEmit` limpo. `bun run lint` 0 erro, com os 6 avisos pré-existentes do scaffold `src/components/ui/`. Zero consumo de Groq, e o percurso completa sem microfone, áudio ou permissão de navegador.
⎿ commit 8aa503b+dirty · 2 files changed, 9 insertions(+), 10 deletions(-)

# Journal — SPEC-20260916-1652

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-17 13:12
**Onde tô:** início — nada feito ainda
**Próximo passo:** <primeiro passo concreto>
**Última decisão:** —
**Bloqueio atual:** nenhum
**Se retomar, ler:** main.md desta SPEC

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | <fase> | pendente | 2026-09-17 12:07 |

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

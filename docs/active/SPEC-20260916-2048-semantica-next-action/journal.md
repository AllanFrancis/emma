# Journal — SPEC-20260916-2048

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-17 12:43
**Onde tô:** os 4 critérios evidenciados; pronto para fechar
**Próximo passo:** `close` (decisão humana) e merge de `feature/semantica-next-action`
**Última decisão:** `next_action` tem fonte de verdade no núcleo; C15 sem exceção
**Bloqueio atual:** nenhum
**Se retomar, ler:** `tabela-de-coerencia.md` e `evidence/levantamento-taxa.md`

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | Medir a taxa nas evidências já gravadas, offline | concluída | 2026-09-17 12:22 |
| 2 | Tabela de coerência, com revisão humana | concluída | 2026-09-17 12:40 |
| 3 | C15 em CHECKS + self-test + `--levantamento-aplicacao` | concluída | 2026-09-17 12:41 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
<!-- anti-alucinação por estrutura: separe o que é SABIDO (verificado no código/teste) do que é CHUTE (inferido) do que está EM ABERTO. Nunca trate inferência como fato. -->
- fato: 38 de 61 turnos com correção (62,3%) não pediam aplicação, todos `reply`. Reproduzível por `grade.mjs --levantamento-aplicacao`. Universo mensurável 107; 90 turnos pré-contrato-v2 ficam fora por ausência do campo.
- fato: `hotel-10` está gravado 2×, mesma fala e mesma correção — `retry` no contrato-do-turno-v2, `reply` no prompt-v5. O prompt regrediu o caso e nada media.
- fato: `continue_mission` nunca ocorre em 107 turnos; `complete_mission` ocorre 1× e sem correção.
- fato: C15 no array `CHECKS`, independe de `record` (ao contrário de C12). Self-test 33 casos de turno / 15 checagens / 0 falha. `bun test` 76 pass, lint do projeto 0 erro, typecheck limpo.
- fato: já eram 14 checagens quando o contrato desta SPEC dizia 13 — a C14 entrou pela SPEC-20260916-2048-regra-fala-transcrita, arquivada depois.
- inferência: como C15 entra por iteração de `CHECKS`, ela deve aparecer sozinha em `--conversas` e na legenda. Não verificado nesta branch, que não tem evidência de conversa em `docs/active/`.
- dúvida: nenhuma aberta para esta SPEC.

### Respostas-chave do usuário
- Tabela de coerência: `continue_mission` + correção e `complete_mission` + correção são INCOERENTES. "se existe uma correção que o aluno precisa aplicar, o fluxo pedagógico deve dar oportunidade de aplicação antes de avançar ou concluir a missão."
- Exceção de correção não bloqueante: RECUSADA por ora. "Não quero abrir essa exceção implicitamente dentro da C15" — exige semântica nova e explícita no contrato do turno.
- Fonte de verdade: "Escolho núcleo sobrescrevendo a proposta do modelo."
- Escopo da correção de contagem: só superfícies normativas desta SPEC, "não aproveite para fazer refatorações adjacentes".

### Tentativas que falharam
- 1ª medição leu 222 turnos e perdeu as 4 conversas EM SILÊNCIO: evidência de conversa guarda `turno.resposta` já desserializado, evidência de turno único guarda o envelope da API. Gotcha candidato.
- `specctl log --body-file` com cabeçalho `##` no corpo: o parser lê cada `## ` como entrada nova. Uma entrada virou seis e `lint --strict` deu 5 erros. Corpos devem começar em `###`.

### Arquivos tocados
- `scripts/eval/grade.mjs` — C15 em `CHECKS`, 7 casos de self-test, `levantamentoAplicacao()` e a flag. Nada em `LONGITUDINAL_CHECKS` nem na camada de relatório.
- `docs/ARCHITECTURE.md` — contagem 13 → 15 (2 linhas).
- `main.md` — contagem 13 → 14 (estado anterior a esta SPEC).
- `tabela-de-coerencia.md`, `evidence/levantamento-taxa.md` — novos.

### Onde parei
Pronto para `close`. Pendente por decisão humana, não por trabalho.

Diferido de propósito para o `### Delta de estado` do fechamento: a linha do mapa de arquivos de `docs/features/dialogo.md` ainda diz "13 checagens" e deveria dizer 15. Não editada agora porque `dialogo.md` está em colisão de claim com `motor-de-dialogo` e `docs/rules/team.md` proíbe editar a prosa de estado concorrentemente. As outras 3 ocorrências naquele arquivo são históricas e não se tocam.

### Sessões (máx 5 linhas + 1 agregada)
- 2026-09-17 12:07–12:42 — ativação em worktree paralelo, levantamento da taxa, tabela revisada, C15 implementada e os 4 critérios evidenciados.

## LOG (append-only — NUNCA editar entradas antigas)
<!-- tipos: ativação descoberta decisão tentativa blocker unblock refactor nota conclusão | entrada nova: specctl log -->

## 2026-09-17 12:07 — [ativação] SPEC ativada (branch feature/semantica-next-action, base main)

## 2026-09-17 12:14 — [nota] Fronteiras da rodada paralela: offline obrigatorio, colisao em dialogo e as tres regioes de dono em grade.mjs

Esta SPEC roda em worktree dedicado (`.worktrees/semantica-next-action`, branch `feature/semantica-next-action`), em paralelo com duas outras a partir de main 5b3f112:

- SPEC-20260916-1652-motor-de-dialogo (G) — região `src/` servidor
- SPEC-20260916-1652-onboarding-e-perfil (M) — região `src/routes/` e telas

Região desta SPEC: `scripts/eval/grade.mjs`, área do array `CHECKS` (as 13 checagens de turno) mais os casos de self-test. Mais a tabela de coerência `corrections` × `next_action`, que é o artefato central e é trabalho de definição.

**Restrição de rede — decisão do usuário nesta rodada:** esta SPEC permanece OFFLINE. Nenhuma chamada nova ao modelo, em nenhuma circunstância. A taxa se mede sobre as evidências JÁ GRAVADAS (48 células + 7 da comparação + 45 do v4), como o próprio escopo do main.md já exige ("sem gastar chamada nova"). Isso não é só economia: `motor-de-dialogo` está consumindo Groq em paralelo, e o teto de tokens é da ORGANIZAÇÃO, não da chave. Chamada daqui estrangularia a outra SPEC.

**Colisão de claim detectada (R.11):** `motor-de-dialogo` também declara a feature `dialogo`. A colisão é na memória viva (`docs/features/dialogo.md`), não no código. Disciplina obrigatória, por `docs/rules/team.md`:

- Seções compartilhadas (Specs desta feature, Decisões, Alternativas rejeitadas, Gotchas): UMA linha por entrada, prefixada por SPEC-id ou DEC-id. Nunca reordenar linha existente. Conflito de merge vira inserção adjacente trivial.
- Seção "Estado atual" (prosa): PROIBIDO editar concorrentemente. No fechamento, APENDAR `### Delta de estado (SPEC-20260916-2048-semantica-next-action, data)` ao fim da seção.

**Fronteiras dentro de `grade.mjs` — instrução do usuário: não antecipar trabalho de outras SPECs mesmo aparecendo oportunidade no mesmo arquivo.** O arquivo tem três regiões de dono distinto:

- `CHECKS` + self-test — território DESTA SPEC. A checagem nova entra aqui, espelho de C12.
- `LONGITUDINAL_CHECKS` (L1, L2, L3) — território de SPEC-20260916-2257-retencao-de-contexto-na-conversa. NÃO tocar, nem para "melhorar" o limiar de L1 (0.7), que aquela SPEC tem risco registrado de revisar.
- `gradeModel` / `printRows` / `printTable` / `desenhoDoGrupo` — território de SPEC-20260917-1059-metodologia-de-repeticao (agregação por célula, dispersão, N amostras). NÃO introduzir agregação nem dispersão aqui. Se a checagem nova precisar aparecer no relatório, usar o caminho que já existe: `printLegend` itera `CHECKS`, então a entrada de legenda sai de graça, sem editar a camada de relatório.

Ambas as SPECs vizinhas ficaram FORA desta rodada por decisão do usuário: `metodologia-de-repeticao` porque disputaria cota de Groq com `motor-de-dialogo`, e `retencao-de-contexto` porque depende das definições de histórico do `motor-de-dialogo` estabilizarem.
⎿ commit 5f6787b

## 2026-09-17 12:22 — [descoberta] Taxa medida: 41 de 64 turnos com correcao (64,1%) nao pedem aplicacao, todos reply

# Levantamento da taxa — correção emitida sem pedido de aplicação

**Quando:** 2026-09-17
**Como:** leitura offline de `docs/archive/*/evidence/`, zero chamada ao modelo (script exploratório em `tmp/distribuicao.mjs`)
**Critério que isto atende:** 3 — "Taxa medida sobre as evidências já gravadas, sem nenhuma chamada nova ao modelo"

### Universo

232 turnos gravados em evidência, excluídos os `_failures` (gerações que falharam o contrato, não turnos).

Destes, **115 não têm `next_action` legível**: são as evidências da SPEC-20260916-0109-rubrica-e-eval-do-motor, anteriores ao contrato do turno v2 que introduziu o campo. Ficam fora da medida por ausência do campo, não por escolha.

**Universo mensurável: 117 turnos.**

| Grupo | com correção / total |
|---|---|
| contrato-do-turno-v2 / gpt-oss-20b | 25/45 |
| eval-personalidade / matriz | 32/48 |
| eval-personalidade / prompt-v5 | 4/7 |
| eval-conversa-multiturno / conversas | 3/10 |
| metodologia-de-eval / repeticao-1,2,3 | 0/7 |

### Distribuição `corrections` × `next_action`

**Com correção emitida — 64 turnos:**

| `next_action` | n | % |
|---|---|---|
| `retry` | 23 | 35,9% |
| `reply` | 41 | 64,1% |
| `continue_mission` | 0 | — |
| `complete_mission` | 0 | — |

**Sem correção — 53 turnos:**

| `next_action` | n | % |
|---|---|---|
| `reply` | 52 | 98,1% |
| `complete_mission` | 1 | 1,9% |
| `retry` | 0 | — |
| `continue_mission` | 0 | — |

### A taxa

**41 de 64 turnos com correção emitida (64,1%) não pedem aplicação.** Todos os 41 são `reply`.

O contrato desta SPEC previu o que fazer com esse número: "Se a taxa for alta, a correção é do núcleo (sobrescrever a proposta); se for baixa, instrução de prompt basta." 64,1% é alta — quase dois terços das correções do produto hoje são informação, não ensino. Instrução de prompt não sustenta essa lacuna, e há evidência direta disso no achado do `hotel-10` abaixo.

### Achados que a distribuição revelou

**1. `hotel-10` é um experimento natural, e mostra o prompt regredindo.** A mesma fala, com a mesma correção (1, `grammar`), aparece duas vezes:

- `contrato-do-turno-v2/openai_gpt-oss-20b/hotel-10.json` → `next_action=retry` (coerente)
- `eval-personalidade/openai_gpt-oss-20b/prompt-v5/hotel-10.json` → `next_action=reply` (a lacuna)

Ou seja: o caso já esteve certo e o prompt v5 o quebrou. Isso é argumento forte contra resolver por instrução de prompt — a instrução é justamente o que regrediu, sem ninguém notar, porque nenhuma checagem media isto.

**2. `continue_mission` nunca ocorre — 0 de 117.** E `complete_mission` ocorre uma única vez, sem correção. Consequência metodológica: as linhas da tabela de coerência para esses dois valores **não têm base empírica**. A tabela precisa cobri-las porque o enum as permite, mas a taxa medida não fala sobre elas, e isso deve ficar declarado em vez de ser mascarado por um percentual agregado.

**3. `sem correção` é 100% livre de `retry`** (0 de 53), o que confirma que C12 está de fato segurando o lado que ela cobre. A lacuna é exclusivamente do lado espelho.

### Nota de defasagem no contrato

O `main.md` desta SPEC diz "nenhuma das **13** checagens captura isso". O `grade.mjs` hoje tem **14** (C1–C14): a C14 — "nao corrige grafia de fala transcrita" — entrou pela SPEC-20260916-2048-regra-fala-transcrita, arquivada depois que este contrato foi escrito. A lacuna descrita continua real (C14 é sobre grafia de correção, não sobre coerência de `next_action`), então a conclusão do contrato não muda. Só o número está velho, e a checagem nova é **C15**, não C14.

### Correção de método aplicada durante o levantamento

A primeira execução mediu 222 turnos e perdeu as 4 conversas inteiras em silêncio. Causa: os dois formatos de evidência guardam a resposta de forma diferente — na evidência de turno único, `resposta` é o envelope da API (`choices[0].message.content` como string JSON); na evidência de conversa, `turno.resposta` já é o turno desserializado. Tratar só o primeiro formato zera as conversas sem erro nenhum.

Isso vale como gotcha para qualquer futura varredura de evidência, e é candidato a gotcha da feature `dialogo` no fechamento.
⎿ commit d4901dc

## 2026-09-17 12:25 — [nota] Corrigido formato da entrada anterior: cabecalho de corpo em --body-file quebra o parser do LOG

A entrada `[descoberta]` de 12:22 foi criada com `--body-file` apontando para `evidence/levantamento-taxa.md`, cujo corpo usa cabeçalhos `##`. O parser do LOG lê todo `## ` como início de entrada nova, então uma entrada virou seis, cinco delas malformadas, e `lint --strict` reprovou com 5 erros.

Correção aplicada: os seis cabeçalhos internos daquela entrada (`## Universo`, `## Distribuição ...`, `## A taxa`, `## Achados ...`, `## Nota de defasagem ...`, `## Correção de método ...`) foram rebaixados para `###`. Nenhum byte de conteúdo foi removido nem reescrito — só a profundidade do cabeçalho mudou, para o arquivo voltar a ter uma entrada em vez de seis. Verificado depois: `lint --strict` em 0 erro/0 aviso, e os marcadores do texto (232 turnos, 115 sem `next_action`, 64,1%, `hotel-10`) seguem presentes.

Não usei remoção nem reescrita porque o LOG é append-only (TIER-0 #2). Rebaixar profundidade de cabeçalho preserva integralmente o que foi registrado; apagar o corpo duplicado, não. O texto completo também vive em `evidence/levantamento-taxa.md`, que é a cópia canônica e persistente.

Gotcha para as próximas entradas desta e de qualquer SPEC: corpo passado por `--body-file` ao `specctl log` deve começar em `###` ou mais fundo. Cabeçalho `##` no corpo quebra o parser do LOG. Candidato a gotcha da feature `dialogo` no fechamento.
⎿ commit d4901dc+dirty · 1 file changed, 75 insertions(+), 1 deletion(-)

## 2026-09-17 12:40 — [decisão] next_action tem fonte de verdade no nucleo, e a C15 nao tem excecao

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
⎿ commit 8c54baf+dirty · 5 files changed, 258 insertions(+), 19 deletions(-)

## 2026-09-17 12:43 — [conclusão] C15 fecha a lacuna do next_action e o nucleo passa a ser fonte de verdade do campo

A lacuna que o `hotel-10` expôs agora é detectável, e o campo `next_action` tem dono declarado.

### O que foi entregue

**C15 em `scripts/eval/grade.mjs`**, espelho de C12. C12 garantia um lado — não cobrar repetição de quem não errou; a C15 cobre o outro — quem recebeu correção precisa ser convidado a aplicá-la. Regra sem exceção: `corrections.length > 0` ⇒ só `retry` é coerente.

**A taxa, medida antes da intervenção e sem uma chamada nova ao modelo:** 38 de 61 turnos com correção emitida (62,3%) não pediam aplicação, todos `reply`. Reproduzível por `node scripts/eval/grade.mjs --levantamento-aplicacao`, que lê `docs/active/` e `docs/archive/` como fontes separadas.

**A tabela de coerência** das 8 combinações de `corrections` × `next_action`, revisada e aprovada, com a distinção metodológica preservada: 41 casos de `reply` são medida, as duas linhas de missão são regra derivada do invariante, e o documento não finge que têm o mesmo lastro.

**A decisão de fonte de verdade:** o núcleo sobrescreve a proposta do modelo. O que a sustenta não é só a taxa alta — é o `hotel-10` estar gravado duas vezes, `retry` no contrato-do-turno-v2 e `reply` no prompt-v5. O prompt regrediu o caso e ninguém notou, porque nada media. Instrução de prompt era exatamente a hipótese barata, e a evidência a reprovou antes de ela ser tentada de novo.

### O que esta SPEC deliberadamente NÃO fez

Não implementou a regra no núcleo pedagógico — o escopo do contrato é explícito: aqui se define a regra que ele vai aplicar. Não tocou `LONGITUDINAL_CHECKS` (território de `retencao-de-contexto`) nem a camada de relatório (território de `metodologia-de-repeticao`), mesmo estando no mesmo arquivo. Não abriu exceção para correção não bloqueante, que fica como semântica nova a propor no contrato do turno se e quando se quiser.

### Gotchas que valem promoção

1. **Dois formatos de evidência.** Turno único guarda a resposta como envelope da API (`choices[0].message.content` como string JSON); conversa guarda `turno.resposta` já desserializado. Varredura que trata só o primeiro formato zera as conversas SEM ERRO NENHUM — a primeira medição desta SPEC leu 222 turnos e perdeu 10 assim.
2. **`specctl log --body-file` e cabeçalhos.** Corpo com `## ` faz o parser do LOG ler cada cabeçalho como entrada nova. Corpos devem começar em `###`.

### Ficou pendente, por regra e não por esquecimento

A linha do mapa de arquivos de `docs/features/dialogo.md` ainda diz "13 checagens" e deveria dizer 15. Vai no `### Delta de estado` do fechamento: `dialogo.md` está em colisão de claim com `motor-de-dialogo` nesta rodada, e `docs/rules/team.md` proíbe edição concorrente da prosa de estado. As outras três ocorrências de "13" naquele arquivo são históricas — descrevem o que era verdade quando o contrato v2 e a SPEC longitudinal fecharam — e editá-las falsificaria registro.

### Verificação

`grade.mjs --self-test`: 33 casos de turno, 15 checagens de turno + 5 longitudinais, 0 falha. `validate.mjs`: 0/0. `specctl lint --strict`: 0/0. `bun test`: 76 pass, 0 fail. `bun run lint`: 0 erro (6 avisos pré-existentes no scaffold `src/components/ui/`). `bun x tsc --noEmit`: limpo.
⎿ commit 1eba10f+dirty · 2 files changed, 30 insertions(+), 9 deletions(-)

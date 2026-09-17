# Levantamento da taxa — correção emitida sem pedido de aplicação

**Quando:** 2026-09-17
**Como:** leitura offline de `docs/archive/*/evidence/`, zero chamada ao modelo (script exploratório em `tmp/distribuicao.mjs`)
**Critério que isto atende:** 3 — "Taxa medida sobre as evidências já gravadas, sem nenhuma chamada nova ao modelo"

## Universo

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

## Distribuição `corrections` × `next_action`

> Esta seção usa a leitura MAIS ABRANGENTE, incluindo os 10 turnos de `conversas/`. A convenção oficial do harness exclui conversa e dá 61/38 — ver "Duas convenções" logo abaixo. As duas contagens estão aqui de propósito, porque a distribuição por valor do enum é o que fundamenta a tabela de coerência, e para isso quanto mais turno melhor.

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

## A taxa

**Número oficial, reproduzível pelo harness — 38 de 61 turnos com correção (62,3%) não pedem aplicação.** Todos os 38 são `reply`.

```
node scripts/eval/grade.mjs --levantamento-aplicacao
```

### Duas convenções, dois números, nenhum errado

O harness cobre **rodadas por turno** e exclui `conversas/`, porque conversa é um arquivo com vários turnos e tem caminho próprio (`--conversas`). Essa é a convenção que o levantamento de grafia da SPEC-20260916-2048-regra-fala-transcrita já usava, e mantê-la faz os dois levantamentos comparáveis.

| Convenção | com correção | não pedem aplicação | taxa |
|---|---|---|---|
| Rodadas por turno (harness, oficial) | 61 | 38 | **62,3%** |
| Incluindo os 10 turnos de `conversas/` | 64 | 41 | 64,1% |

As 4 conversas contribuem 3 turnos com correção, todos `reply`. A conclusão não muda em nenhuma das duas leituras: a taxa é alta e instrução de prompt não sustenta a invariante. O número citado em decisão é o de 62,3%, porque é o que um comando reproduz.

O harness também lê 197 turnos onde o script exploratório leu 222: a diferença são os 25 turnos de `_baseline-prompt-v1` e `_baseline-prompt-v2`, que `collectEvidenceTargets` ignora por convenção de prefixo `_`. Todos eram anteriores ao contrato v2 e não tinham `next_action`, então **o universo mensurável é idêntico nas duas contagens: 107 turnos.**

O contrato desta SPEC previu o que fazer com esse número: "Se a taxa for alta, a correção é do núcleo (sobrescrever a proposta); se for baixa, instrução de prompt basta." 62,3% é alta — quase dois terços das correções do produto hoje são informação, não ensino. Instrução de prompt não sustenta essa lacuna, e há evidência direta disso no achado do `hotel-10` abaixo.

## Achados que a distribuição revelou

**1. `hotel-10` é um experimento natural, e mostra o prompt regredindo.** A mesma fala, com a mesma correção (1, `grammar`), aparece duas vezes:

- `contrato-do-turno-v2/openai_gpt-oss-20b/hotel-10.json` → `next_action=retry` (coerente)
- `eval-personalidade/openai_gpt-oss-20b/prompt-v5/hotel-10.json` → `next_action=reply` (a lacuna)

Ou seja: o caso já esteve certo e o prompt v5 o quebrou. Isso é argumento forte contra resolver por instrução de prompt — a instrução é justamente o que regrediu, sem ninguém notar, porque nenhuma checagem media isto.

**2. `continue_mission` nunca ocorre — 0 de 117.** E `complete_mission` ocorre uma única vez, sem correção. Consequência metodológica: as linhas da tabela de coerência para esses dois valores **não têm base empírica**. A tabela precisa cobri-las porque o enum as permite, mas a taxa medida não fala sobre elas, e isso deve ficar declarado em vez de ser mascarado por um percentual agregado.

**3. `sem correção` é 100% livre de `retry`** (0 de 53), o que confirma que C12 está de fato segurando o lado que ela cobre. A lacuna é exclusivamente do lado espelho.

## Nota de defasagem no contrato

O `main.md` desta SPEC diz "nenhuma das **13** checagens captura isso". O `grade.mjs` hoje tem **14** (C1–C14): a C14 — "nao corrige grafia de fala transcrita" — entrou pela SPEC-20260916-2048-regra-fala-transcrita, arquivada depois que este contrato foi escrito. A lacuna descrita continua real (C14 é sobre grafia de correção, não sobre coerência de `next_action`), então a conclusão do contrato não muda. Só o número está velho, e a checagem nova é **C15**, não C14.

## Correção de método aplicada durante o levantamento

A primeira execução mediu 222 turnos e perdeu as 4 conversas inteiras em silêncio. Causa: os dois formatos de evidência guardam a resposta de forma diferente — na evidência de turno único, `resposta` é o envelope da API (`choices[0].message.content` como string JSON); na evidência de conversa, `turno.resposta` já é o turno desserializado. Tratar só o primeiro formato zera as conversas sem erro nenhum.

Isso vale como gotcha para qualquer futura varredura de evidência, e é candidato a gotcha da feature `dialogo` no fechamento.


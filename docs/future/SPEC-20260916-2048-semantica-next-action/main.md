# SPEC-20260916-2048: Semântica de next_action — correção emitida exige aplicação

**Status:** draft
**Porte:** P
**Owner:** @allan
**Criada:** 2026-09-16 20:48
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** next-action, retry, coerencia, nucleo, hotel-10
**Features:** pedagogia, dialogo
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 20:43 — "semântica de `next_action`, especialmente casos como `hotel-10`, em que existe correção mas o fluxo segue com `reply`"
**Resumo:** Define e valida a coerência entre emitir correção e pedir que o aluno a aplique, fechando a lacuna que nenhuma das 13 checagens mede.

## Objetivo

Na comparação controlada da SPEC-20260916-1652, `hotel-10` mudou `next_action` de `retry` para
`reply` mantendo a correção emitida. Pedagogicamente isso é pior: o aluno recebe a forma correta e
a conversa segue sem que ele a use. E **nenhuma das 13 checagens captura isso** — C12 só olha casos
de controle, verificando que não se pede repetição a quem não errou. Falta o espelho: quem recebeu
correção deveria ser convidado a aplicá-la. A métrica central da §20 é justamente "o aluno produziu
linguagem e tentou novamente após receber feedback".

## Escopo

**DENTRO:**
- Definição da semântica completa de `next_action` em relação a `corrections[]`: quando cada valor é coerente e quando é contradição
- Checagem nova, espelho de C12: houve correção e o fluxo não pediu aplicação
- Levantamento nas evidências JÁ GRAVADAS (48 células + 7 da comparação + 45 do v4) de quantos turnos emitem correção com `next_action` que não pede aplicação — sem gastar chamada nova
- Decisão sobre quem resolve: instrução de prompt, ou o núcleo pedagógico sobrescrevendo a proposta do modelo

**FORA:**
- Implementar o núcleo pedagógico (SPEC própria) — aqui se define a regra que ele vai aplicar
- Mudar o contrato do turno; `next_action` já existe e tem enum fechado
- Efeito do tom (SPEC própria)

## Invariantes

- SEMPRE que houver correção emitida, o turno deve convidar o aluno a aplicá-la; correção sem aplicação é informação, não ensino.
- NUNCA pedir repetição a quem não errou — C12 já garante e continua valendo.
- SEMPRE a decisão final de `next_action` é do núcleo pedagógico; o modelo propõe (DEC-20260916-1612).

## Implementação

Trabalho de definição e medição, quase todo offline sobre evidência existente.

- A tabela de coerência é o artefato central: para cada combinação de `corrections.length` e `next_action`, dizer se é coerente, e por quê.
- `retry` com correção é o caso canônico coerente. `reply` com correção é o caso de `hotel-10`. `complete_mission` com correção é suspeito. `continue_mission` com correção depende da etapa.
- A checagem nova roda sobre as ~100 evidências já gravadas, o que dá a taxa real antes de qualquer intervenção.
- Se a taxa for alta, a correção é do núcleo (sobrescrever a proposta); se for baixa, instrução de prompt basta.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| Nenhuma | a regra é política do núcleo; o contrato do turno não muda |

<!-- Alternativas consideradas e REJEITADAS:
  - Tratar como bug do prompt e corrigir por instrução sem medir: a taxa nas evidências existentes
    é gratuita de obter e diz se instrução resolve.
  - Endurecer o enum de next_action: o problema não é o valor disponível, é a coerência com corrections.
-->

## Riscos

- A regra pode ter exceção legítima: numa etapa final de missão talvez faça sentido corrigir e seguir — mitigação: a tabela de coerência é revisada por humano antes de virar checagem.

## Sinais de sucesso

- A lacuna deixa de existir: emitir correção sem pedir aplicação passa a ser detectável.
- O núcleo pedagógico nasce com a regra de coerência já definida, em vez de descobri-la em produção.

## Critério de aceite

- [ ] Tabela de coerência `corrections` × `next_action` escrita e revisada, com justificativa por combinação
- [ ] Checagem nova implementada, com casos de teste para coerente e incoerente
- [ ] Taxa medida sobre as evidências já gravadas, sem nenhuma chamada nova ao modelo
- [ ] Decisão registrada sobre resolver por prompt ou pelo núcleo, sustentada pela taxa medida | evidence: manual @allan

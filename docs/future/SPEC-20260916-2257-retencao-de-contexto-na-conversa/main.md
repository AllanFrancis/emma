# SPEC-20260916-2257: Retenção de contexto na conversa — a Emma não repete pergunta já feita

**Status:** draft
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 22:57
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** retencao, contexto, historico, pergunta-repetida, L1, L2
**Features:** dialogo, pedagogia
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 22:52 — "SPEC nova para corrigir o produto", aceitando o critério 3 da SPEC-20260916-1652 como incompleto
**Resumo:** Faz a Emma parar de repetir pergunta já feita e de pedir dado já fornecido, transformando em garantia o que a eval multiturno mediu e reprovou.

## Objetivo

A SPEC-20260916-1652 mediu retenção de contexto pela primeira vez e a Emma reprovou: **L1 5/6** —
uma pergunta repetida em seis oportunidades. Instrução de prompt não cobre isso, porque o v5 já
manda "nao abandone o objetivo da conversa" e a repetição aconteceu mesmo assim. Repetir pergunta
é o modo de falha mais visível para quem usa: é o que faz o aluno sentir que não foi ouvido.
Esta SPEC decide ONDE a garantia mora e a implementa.

## Escopo

**DENTRO:**
- Levantamento nas evidências JÁ GRAVADAS em `conversas/` de toda repetição de pergunta, sem gastar chamada nova
- Decisão sobre o ponto de aplicação: instrução de prompt, janela/sumarização do histórico, ou o núcleo pedagógico rejeitando a proposta do modelo
- Regra verificável de "dado já fornecido", que hoje só existe como `nao_pedir` no dataset de eval e não no produto
- A correção prova-se contra L1 e L2 — as mesmas checagens que acusaram a falha

**FORA:**
- Semântica de `next_action` (SPEC-20260916-2048-semantica-next-action)
- Construir o núcleo pedagógico (SPEC própria) — aqui se define a regra que ele vai aplicar
- Mudar o contrato do turno

## Invariantes

- SEMPRE a correção se prova contra L1/L2 da eval multiturno; regra sem checagem que a acuse não é garantia.
- NUNCA a Emma pede de novo um dado que o aluno já forneceu no histórico.

## Implementação

Ponto de partida barato: a evidência de `conv-cafe-01` e `conv-hotel-01` grava o histórico
COMPLETO enviado em cada turno (`mensagens_enviadas`). Dá para auditar o que o modelo tinha em
mãos quando repetiu, e isso separa duas causas que parecem uma só — o dado não estava no
histórico, ou estava e foi ignorado. A escolha do ponto de aplicação depende dessa separação.

<!-- Alternativas consideradas e REJEITADAS:
  - Ir direto ao prompt: é o caminho barato e já falhou uma vez aqui. Trate prompt como
    hipótese, não como solução.
-->

## Riscos

- Sumarizar histórico para caber no orçamento de tokens pode ELIMINAR justamente o dado que se quer reter — mitigação: medir L2 antes e depois da mudança.
- L1 compara palavras de conteúdo e tem limiar (0.7); endurecer a regra do produto contra uma checagem frouxa daria falsa vitória — mitigação: revisar os pares de self-test de L1 antes de usá-la como aceitação.

## Sinais de sucesso

- L1 e L2 em 100% numa rodada completa das 4 conversas.
- A regra de retenção existe no PRODUTO, e não apenas no dataset de eval.

## Critério de aceite

- [ ] Levantamento da taxa real de repetição nas evidências já gravadas, sem chamada nova
- [ ] Ponto de aplicação decidido e registrado como decisão ativa da feature `dialogo`
- [ ] L1 e L2 passam em rodada completa das 4 conversas

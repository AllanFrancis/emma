# SPEC-20260916-2048: Regra da fala transcrita — impedir correção de grafia por construção

**Status:** draft
**Porte:** P
**Owner:** @allan
**Criada:** 2026-09-16 20:48
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** fala-transcrita, maiuscula, grafia, livre-02, DEC-0312
**Features:** dialogo
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 20:43 — "violação da regra de não corrigir maiúscula/pontuação/grafia observada em `livre-02`"
**Resumo:** Transforma a DEC-20260916-0312 de instrução no prompt em garantia verificável, porque instrução explícita não impediu a violação.

## Objetivo

A DEC-20260916-0312 é decisão ativa: a entrada é fala transcrita, então maiúscula, pontuação e
grafia não existem e não se corrigem. O prompt v5 diz isso **na letra**. E ainda assim, em
`livre-02 n1 tranquila`, o modelo corrigiu `"english"` para `"English"` com explicação "Use
maiúscula em nomes de línguas" e `next_action: retry` — pedindo repetição a quem acabara de dizer
*"Sorry, my english is very bad"*. É a mesma falha que reprovou o `gpt-oss-120b` na
SPEC-20260916-0109. Instrução não bastou; a regra precisa ser verificável.

## Escopo

**DENTRO:**
- Checagem que detecta correção cuja única diferença entre `original` e `suggested` é caixa, pontuação ou acentuação
- Levantamento nas evidências JÁ GRAVADAS (~100 turnos) da taxa real dessa violação, sem chamada nova
- Decisão sobre o ponto de aplicação: rejeitar no validador do turno, filtrar no núcleo pedagógico, ou ambos
- Distinguir o caso legítimo: `"i'm agree"` para `"I agree"` muda estrutura e não é só caixa

**FORA:**
- Mudar o prompt — já foi tentado e não resolveu; esta SPEC existe porque instrução não é garantia
- Efeito do tom (SPEC própria), embora a violação observada tenha sido no tom `tranquila`
- STT e o que a transcrição real devolve (Fase 3)

## Invariantes

- NUNCA uma correção cuja única diferença seja caixa, pontuação ou acentuação chega ao aluno; é artefato de transcrição, não erro de inglês.
- SEMPRE a regra é verificada por código, não confiada ao modelo — a violação já ocorreu com a instrução presente no prompt.
- NUNCA pedir repetição por causa de grafia; somar `retry` a uma correção dessas é o pior caso, e foi o observado.

## Implementação

Comparação normalizada entre `original` e `suggested`: se as duas formas coincidem ao remover
caixa, pontuação e acentuação, a correção é de grafia e deve ser rejeitada.

- A normalização já existe em `turn-validator.mjs` (`normalizeForEvidence`), usada para validar evidência citada. É a mesma ferramenta, com outro propósito.
- Cuidado com o falso positivo: `"i'm agree"` para `"I agree"` difere por remoção de palavra, não por caixa. A checagem só dispara quando a diferença é EXCLUSIVAMENTE de superfície.
- Ponto de aplicação a decidir: rejeitar no validador é mais forte (a correção não existe); filtrar no núcleo é mais tolerante (o modelo propõe, o núcleo descarta). A DEC-20260916-1612 já estabelece que o núcleo decide.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| Nenhuma | é regra de validação sobre o contrato existente |

<!-- Alternativas consideradas e REJEITADAS:
  - Reforçar a instrução no prompt: já está explícita no v5 e a violação ocorreu de todo modo.
  - Proibir a categoria `register` ou similar: a violação usou `vocabulary`, e a categoria não é o
    sinal — a diferença de superfície é.
-->

## Riscos

- Falso positivo em correção legítima que por acaso só muda caixa (nomes próprios, siglas) — mitigação: a checagem roda sobre as ~100 evidências existentes antes de virar gate, e os casos são lidos por humano.

## Sinais de sucesso

- A DEC-20260916-0312 deixa de depender de obediência do modelo.
- O caso `livre-02` passa a ser impossível, não improvável.

## Critério de aceite

- [ ] Checagem implementada, disparando só quando a diferença entre `original` e `suggested` é exclusivamente de caixa, pontuação ou acentuação
- [ ] Casos de teste cobrindo o positivo (`english` para `English`) e o falso positivo (`i'm agree` para `I agree`)
- [ ] Taxa medida sobre as evidências já gravadas, sem chamada nova ao modelo
- [ ] Ponto de aplicação decidido e registrado como decisão arquitetural | evidence: manual @allan

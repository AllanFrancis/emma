# Relatório comparativo — motor de diálogo da Emma

> SPEC-20260916-0109 · Fase 0 · 2026-09-16
> Evidências: `evidence/openai_gpt-oss-20b/` e `evidence/openai_gpt-oss-120b/` — 45 turnos cada.
> Baselines de prompts anteriores preservadas em `evidence/_baseline-prompt-v1|v2/`.

## O que foi medido, e o que não foi

45 falas de aluno brasileiro em 4 contextos (café 12, hotel 12, small-talk 12, conversa livre 9),
das quais **17 são casos de controle** — falas sem nada a corrigir. São elas que medem
sobre-correção, o modo de falha nº 1 deste produto.

Cada fala foi enviada uma vez a cada modelo, com o mesmo system prompt (v3) e o mesmo contrato
de turno em JSON Schema (`strict: true`).

**Limites que este relatório não esconde:**
- Uma amostra por fala. Sem repetição, não há medida de variância — um modelo pode ter tido sorte.
- Turno isolado, sem histórico. Nada aqui mede coerência ao longo de uma conversa real.
- Os níveis esperados e os rótulos de "deve corrigir" são julgamento do autor do dataset,
  aplicando `rubric.md`. Outra pessoa rotularia diferente em alguns casos de fronteira.
- As checagens mecânicas cobrem 5 dos 9 critérios. **Os outros 4 exigem leitura humana.**

## Resultado mecânico

| Checagem | 20b | 120b |
|---|---|---|
| C1 contrato de 8 campos | 100% | 100% |
| C2 termina com pergunta | 98% | 100% |
| C3 teto de 3 correções | 100% | 100% |
| **C4 não corrige caso de controle** | **88%** | 71% |
| **C5 corrige quando há o que corrigir** | 86% | **96%** |
| C6 instrução presente | 100% | 100% |
| C7 instrução em português | 89% | **93%** |
| C8 comprimento compatível com o nível | 84% | 84% |
| C9 sem metalinguagem no inglês | 100% | 100% |
| C10 oferece resposta modelo | 100% | 100% |

Trade-off limpo: **o 20b peca por omissão, o 120b por excesso.**

## Por que a tabela engana

O 120b ganha em C5 e C7, e perderia feio numa leitura só de números. Mas o **conteúdo** das
falhas dele é pior para este produto:

| Fala do aluno | O que o 120b fez |
|---|---|
| "Sorry, my english is very bad" | corrigiu a **maiúscula** de "english" |
| "I don't know how to say this in english" | corrigiu a **maiúscula** de "english" |
| "Sorry, can you repeat please? I didn't understand." | corrigiu para "could you repeat that" |
| "What time is the breakfast?" | removeu o artigo — preciosismo defensável |

Dois problemas graves aí. **Correção de maiúscula não existe em conversa falada** — é convenção de
escrita, e o produto é de fala. E corrigir a grafia de alguém que acabou de dizer que tem vergonha
do próprio inglês é o oposto exato de "fluência antes de perfeição; se a mensagem chegou,
reconheça isso antes de corrigir".

As omissões do 20b são falhas de ensino, não de tato:

| Fala do aluno | O que o 20b deixou passar |
|---|---|
| "What you do in your free time?" | auxiliar ausente — erro estrutural sistemático |
| "My name is Allan and I work with marketing" | "work with" → "work in" |
| "I have a doubt about what you said" | falso cognato: "doubt" soa desconfiança |
| "I want a coffee" | pragmática do pedido → "I'd like" |

Um aluno que não é corrigido aprende devagar. Um aluno corrigido na hora errada desiste.

## Confiabilidade

**`json_validate_failed`: 2 ocorrências no 120b (`cafe-01`, `talk-01`), zero no 20b.**

O `strict mode` do Groq não é garantia absoluta: quando o modelo não consegue produzir JSON
conforme o schema, a API devolve **HTTP 400**, não uma resposta reparada. Em produção, cada
ocorrência é um turno que morre na cara do aluno.

## Recomendação

**`openai/gpt-oss-20b` para a Fase 1**, por três razões:

1. **Erra para o lado certo.** Num produto cujo público tem vergonha de falar, omitir uma correção
   custa menos que corrigir quem não errou.
2. **Não falhou nenhuma vez** em 45 chamadas, contra 2 falhas de contrato do 120b.
3. **Mais barato e mais rápido**, e sofre menos com o teto de tokens por minuto do tier gratuito.

O déficit do 20b (C5 86%) é o mais fácil de atacar por prompt, e a própria evolução v1→v2→v3
mostrou que mover esse número é questão de instrução, não de capacidade do modelo.

**Esta recomendação não fecha o assunto.** Ela vale para a Fase 1, onde o objetivo é provar que a
Emma gera hábito. Se a leitura humana das evidências apontar que o 20b soa raso na conversa, o
120b volta à mesa — com um prompt que o proíba de corrigir grafia e um fallback para o 400.

## O que isto obriga na Fase 1

1. **Fallback para `json_validate_failed`.** Um retry e, se falhar de novo, cair no `scriptedTurn()`
   roteirizado do protótipo — que já existe e não gasta API. Turno nunca pode morrer na tela.
2. **O prompt precisa dizer que a entrada é fala transcrita.** Sem isso, o modelo corrige
   maiúscula e pontuação, que não existem em conversa.
3. **Cota:** o TPM do tier gratuito rendeu de 3 a 13 chamadas por ciclo. Com 8 turnos/dia por
   usuário, o tier gratuito não sustenta mais que um punhado de usuários simultâneos.

## O que só você pode julgar

As checagens não alcançam estes 4 critérios. Leia alguns turnos em `evidence/` e decida:

- [ ] responde primeiro ao **significado**, antes de qualquer correção
- [ ] a conversa soa **natural**, não uma aula com roupa de conversa
- [ ] a **personalidade** (tranquila) se sustenta ao longo dos turnos
- [ ] o resultado faz **você querer responder de novo** em inglês

Sugestão de amostra para essa leitura: `cafe-11` (fala longa com muitos erros), `livre-09`
(produção longa), `talk-01` ("Yes." — a Emma consegue puxar conversa?), `livre-01` (aluno
recorre ao português) e `hotel-12` (aluno nível 5 — a Emma acompanha?).

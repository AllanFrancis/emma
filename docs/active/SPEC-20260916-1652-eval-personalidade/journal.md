# Journal — SPEC-20260916-1652

## SNAPSHOT (sobrescrever — DEVE caber nas primeiras 60 linhas do arquivo)

**Última atualização:** 2026-09-16 17:05
**Onde tô:** SPEC aberta, contrato concretizado com 9 critérios (os 8 primeiros com `verify:`). Nada implementado.
**Próximo passo:** fase 1 — declarar o subconjunto da matriz (`matriz.jsonl`) e a validação offline dele.
**Última decisão:** a comparação v4→v5 é cirúrgica nas 7 falas que já falharam, em vez de nova rodada de 45.
**Bloqueio atual:** nenhum. `GROQ_API_KEY` disponível em `.env.local` (ignorado pelo git).
**Se retomar, ler:** `main.md` desta SPEC e a entrada `[unblock]` de 16:30 no journal arquivado da SPEC-20260916-1450, que traz os números do v4.

### Fases
| # | Descrição | Status | Atualizado |
|---|---|---|---|
| 1 | `matriz.jsonl` — subconjunto declarado + `validate.mjs --matriz` | pendente | 2026-09-16 17:05 |
| 2 | Prompt v5 — precedência da via (b) e `explanation_pt` amarrada ao português | pendente | 2026-09-16 17:05 |
| 3 | `run.mjs --matriz` — 4 células por fala, evidência por nível e tom | pendente | 2026-09-16 17:05 |
| 4 | `grade.mjs --matriz` — asserções de completude, invariância, diferença e teto | pendente | 2026-09-16 17:05 |
| 5 | Rodada da matriz (48 chamadas) | pendente | 2026-09-16 17:05 |
| 6 | `--comparar-prompt` — as 7 falas do v4 contra o v5 (7 chamadas) | pendente | 2026-09-16 17:05 |
| 7 | Leitura humana: troca C5×C4 e diferença percebida entre os tons | pendente | 2026-09-16 17:05 |

### Fatos confirmados / Inferências prováveis / Dúvidas em aberto
- fato: o contrato do turno v2 está fechado e medido (45/45, zero falha) — esta SPEC NÃO o altera.
- fato: as 4 omissões do v4 são `cafe-02` ("I want a coffee"), `cafe-08` ("Do you have some vegetarian option?"), `talk-06` ("It's very hot today, no?") e `talk-10` ("I have a doubt about what you said"); em todas o modelo pôs a forma correta em `suggestion_en` em vez de `corrections[]`.
- fato: as 3 explicações em inglês do v4 são `hotel-05`, `hotel-07` e `hotel-10`; a de `hotel-10` usa metalinguagem gramatical em inglês para aluno de nível baixo.
- fato: duas dessas omissões são casos que o prompt v4 NOMEIA LITERALMENTE na via (b) — "I want a coffee" num balcão e o falso cognato "doubt". Instrução nomeando o exemplo não bastou.
- fato: baseline do v4 nas 13 checagens (45 falas, tom tranquila, nível do dataset): C4 94% · C5 86% · C7 93% · C8 82% · C11 100% · C12 100% · C13 88%, resto 100%.
- fato: o teto do tier gratuito é de TOKENS/min (~1065 por turno); o `run.mjs` já tem backoff de 20s e pausa pelo header de tokens.
- inferência: dar PRECEDÊNCIA explícita à via (b) sobre a (c) deve mover C5, porque a evolução v1→v3 provou que esse número responde a instrução. Mas pode custar C4 — corrigir mais também é corrigir o que não devia.
- dúvida: os dois tons vão sair mensuravelmente diferentes? Se o modelo ignorar o tom, a personalidade é decorativa e a asserção de DIFERENÇA reprova — e isso é achado, não bug do teste.
- dúvida: a invariância vai se sustentar quando o tom estiver no prompt? Esta SPEC mede com o tom AINDA dentro do prompt; se falhar, é o argumento empírico para a camada pós-LLM da SPEC de camada-de-personalidade.

### Respostas-chave do usuário
- "Siga para a abertura da sua recomendação eval-personalidade" (2026-09-16 17:05) — autoriza abrir esta SPEC.
- Contrato do draft foi escrito por mim e commitado em `c5643d7` sem revisão linha a linha; os critérios ganharam `verify:` na ativação.

### Tentativas que falharam
—

### Arquivos tocados
—

### Onde parei
SPEC aberta na branch `feature/eval-personalidade`, contrato com 9 critérios. Implementação não começou.

### Sessões (máx 5 linhas + 1 agregada)

## LOG (append-only — NUNCA editar entradas antigas)
<!-- tipos: ativação descoberta decisão tentativa blocker unblock refactor nota conclusão | entrada nova: specctl log -->

## 2026-09-16 17:05 — [ativação] SPEC ativada (branch feature/eval-personalidade, base main)

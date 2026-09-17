# SPEC-20260916-1652: Eval de personalidade — mesma pedagogia, estilos diferentes

**Status:** done
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** 2026-09-16 17:05
**Concluída:** 2026-09-16 20:56
**Pausada em:** —
**Commit final:** `c5cddbb`
**Keywords:** personalidade, eval, matriz, tom, invariancia
**Features:** dialogo, personalidade
**Branch:** feature/eval-personalidade
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 16:52
**Resumo:** Prova com dados que Paciente e Direta mudam o estilo sem mudar a correção, e ataca por prompt as duas falhas de calibração que a SPEC-20260916-1450 mediu.

## Objetivo

A §22.5 do PROMPT DE DESENVOLVIMENTO define como critério de sucesso do MVP que "personalidades
diferentes mantenham a mesma qualidade pedagógica". Isso nunca foi medido: a eval anterior rodou um
único tom. Esta SPEC executa a matriz da §26 — mesma entrada × 2 níveis × 2 personalidades — e
afirma a invariância como asserção, não como esperança. De carona, ataca por prompt os dois
déficits que a rodada do contrato v2 expôs, porque ambos são de calibração e não de contrato.

## Escopo

**DENTRO:**
- Matriz de 4 células por fala: {nível 1, nível 4} × {tranquila, direta}, sobre um subconjunto do dataset
- Asserção de invariância: `corrections[].suggested`, `category` e `focus` idênticos nas 4 células da mesma fala; `reply_en` e `explanation_pt` mensuravelmente diferentes entre tons
- Prompt v5 atacando as 4 omissões de C5: o modelo hoje roteia a correção para `suggestion_en` mesmo nos casos que o prompt nomeia literalmente na via (b)
- Prompt v5 atacando C13: 3 de 33 `explanation_pt` saíram em inglês
- Comparação v4→v5 CIRÚRGICA: as 7 falas que falharam na rodada anterior (`cafe-02`, `cafe-08`, `talk-06`, `talk-10` por omissão; `hotel-05`, `hotel-07`, `hotel-10` por explicação em inglês), re-rodadas com o v5 e confrontadas com a evidência arquivada do v4 para as mesmas falas

**FORA:**
- Terceiro estilo de personalidade — a extensibilidade é da arquitetura (SPEC de camada-de-personalidade), não desta medição
- Mudança no contrato do turno; o v2 está fechado e medido
- Qualquer código de produto: continua tudo em `scripts/eval/`
- Conversa multiturno (SPEC de eval-conversa-multiturno)

## Invariantes

- SEMPRE a correção pedagógica é idêntica entre personalidades para a mesma fala e o mesmo nível; se divergir, a falha é de arquitetura e não de tom.
- NUNCA o tom "direta" corrige MAIS itens que o "tranquila" — mais correções não é mais rigor, é outra pedagogia.
- NUNCA afirmar ganho de prompt sem mostrar as duas rodadas lado a lado sobre o mesmo dataset.
- NUNCA commitar chave de API — `GROQ_API_KEY` vive em variável de ambiente da sessão.
- SEMPRE separar VALIDADE FINAL DO CONTRATO de CONFIABILIDADE DA GERAÇÃO. Falha recuperada não reprova o contrato, e nunca é apagada da contagem: `valid_first_attempt`, `recovered_after_retry` e `unrecovered_contract_failure` são reportados juntos, para que "o desenho passou" e "houve 1 falha de geração" possam ser ditos na mesma frase.
- NUNCA confundir rate limit ou erro de infraestrutura com falha semântica do modelo; são dimensões distintas e contadas à parte.

## Implementação

Estende `scripts/eval/` sem tocar no app. O runner já aceita `--tom`; falta cruzar tom com nível e
comparar as células entre si em vez de agregar tudo numa média.

- `run.mjs` ganha a matriz: para cada fala do subconjunto, 4 chamadas (2 níveis × 2 tons), com o nível vindo da matriz e não do `nivel_esperado` do dataset.
- `grade.mjs` ganha um modo de comparação por célula: agrupa as 4 saídas da mesma fala e reporta o que ficou igual e o que ficou diferente, em vez de uma linha por modelo.
- O prompt v5 mexe em duas instruções cirúrgicas, mantendo as três vias: reforça que a via (b) tem PRECEDÊNCIA sobre a (c) quando há padrão sistemático, e amarra `explanation_pt` ao português de forma inequívoca.
- Subconjunto do dataset, não as 45: a matriz multiplica por 4 e o teto do tier é de TOKENS por minuto. 12 falas bem escolhidas × 4 células = 48 chamadas, na mesma ordem de grandeza da rodada anterior.
- A comparação de prompt é cirúrgica em vez de nova rodada completa: as 7 falas que JÁ falharam com o v4 estão identificadas e a evidência do v4 está arquivada. Re-rodar essas 7 com o v5 custa 7 chamadas e isola o efeito do prompt exatamente onde ele importa. Rodar 45 de novo custaria 45 chamadas para medir o que não estava quebrado.

**Por que a invariância é asserção e não relatório.** Se `corrections[].suggested` diferir entre
tons, o produto tem duas pedagogias e não duas personalidades — é o modo de falha que a §3 e a §6
existem para impedir. Um número num relatório se justifica; uma asserção que falha, não.

**Classificação de falha de geração (decisão do usuário em 2026-09-16 20:43).** O gate separa duas
dimensões que estavam colapsadas. A tabela abaixo é a semântica exigida, e cada linha tem caso de
teste correspondente:

| situação | validade do contrato | métrica de confiabilidade |
|---|---|---|
| resposta válida na 1ª tentativa | PASS | `valid_first_attempt` |
| `json_validate_failed` + tentativa posterior válida | **PASS** | `recovered_after_retry` |
| retries esgotados sem resposta válida | FAIL | `unrecovered_contract_failure` |
| erro de contrato não recuperável | FAIL | `unrecovered_contract_failure` |
| rate limit / infraestrutura | não afeta | contado à parte, nunca como falha semântica |

A base é a DEC-20260916-0311, que já prevê retry e fallback para `json_validate_failed` — a regra
aplica essa decisão ao gate, em vez de abrir exceção para acomodar um resultado. Falha recuperada
**não é apagada**: ela aparece no relatório do gate junto com o PASS.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| Evidência | ganha `nivel` e `tom` como eixos do nome do arquivo, para as 4 células coexistirem |
| `dataset.jsonl` | sem mudança — a matriz é dimensão de execução, não de dado |

<!-- Alternativas consideradas e REJEITADAS:
  - Rodar a matriz sobre as 45 falas: 180 chamadas sob teto de TOKENS/min, sem ganho de sinal
    proporcional. 12 falas cobrindo os 4 contextos e os dois modos de falha bastam.
  - Medir diferença de tom por julgamento humano apenas: o ponto é justamente automatizar a
    invariância; o humano julga o que mudou, a máquina garante o que não pode mudar.
-->

## Riscos

- O modelo pode manter o tom idêntico entre "tranquila" e "direta", tornando a personalidade decorativa — mitigação: a asserção de DIFERENÇA em `reply_en` reprova esse caso; personalidade que não muda nada também é falha.
- Prompt v5 pode consertar C5 e piorar C4 (corrigir mais também significa corrigir o que não devia) — mitigação: os 17 casos de controle medem exatamente essa troca, e a decisão de aceitar ou não é humana.
- A matriz quadruplica o custo por fala sob teto de TOKENS/min — mitigação: subconjunto e o backoff já implementado no `run.mjs`.

## Sinais de sucesso

- Fica provado por asserção, não por opinião, que trocar de personalidade não troca a correção.
- C5 sobe sem C4 cair, ou fica registrado que a troca existe e qual foi a escolha humana.
- A SPEC de camada-de-personalidade nasce com uma suíte que já reprova a regressão que ela mais teme.

## Critério de aceite

- [x] O comparador de matriz se comporta como especificado: reconhece invariância violada, diferença ausente e desequilíbrio de teto entre tons, em casos de teste sem gastar API (2026-09-16 17:15, commit `c3ecccf`, verify: exit 0) | verify: `node scripts/eval/grade.mjs --self-test`
- [x] O subconjunto da matriz é declarado como dado versionado, cobre os 4 contextos e inclui casos de controle, validado sem gastar API (2026-09-16 17:15, commit `c3ecccf`, verify: exit 0) | verify: `node scripts/eval/validate.mjs --matriz`
- [x] Matriz executada: cada fala do subconjunto tem as 4 células {nível 1, nível 4} × {tranquila, direta} com evidência persistida (2026-09-16 17:52, commit `0e870ef`, verify: exit 0) | verify: `node scripts/eval/grade.mjs --matriz --assert-completo`
- [ ] Invariância pedagógica: `corrections[].suggested`, `category` e `focus` idênticos nas 4 células da mesma fala | verify: `node scripts/eval/grade.mjs --matriz --assert-invariancia` [aceito-incompleto: "separar os problemas restantes em trabalhos próprios, porque são questões diferentes da alteração v4 → v5 ... divergências pedagógicas reais entre tons" 2026-09-16 20:43]
- [x] Diferença de estilo: `reply_en` e `explanation_pt` mensuravelmente distintos entre tranquila e direta (2026-09-16 17:52, commit `0e870ef`, verify: exit 0) | verify: `node scripts/eval/grade.mjs --matriz --assert-diferenca`
- [ ] Nenhum tom corrige mais itens que o outro para a mesma fala e o mesmo nível | verify: `node scripts/eval/grade.mjs --matriz --assert-teto` [aceito-incompleto: "separar os problemas restantes em trabalhos próprios, porque são questões diferentes da alteração v4 → v5 ... divergências pedagógicas reais entre tons" 2026-09-16 20:43]
- [x] O gate classifica falha de geração conforme a decisão de 2026-09-16 20:43: válida na 1ª tentativa PASSA, `json_validate_failed` recuperada PASSA com ocorrência registrada, retries esgotados REPROVA, erro não recuperável REPROVA, e rate limit é contado à parte — com caso de teste para cada linha (2026-09-16 20:47, commit `e4ecf53`, verify: exit 0) | verify: `node scripts/eval/grade.mjs --self-test`
- [x] As 13 checagens do contrato v2 seguem verdes sobre as saídas da matriz e da comparação, e o gate reporta `valid_first_attempt` / `recovered_after_retry` / `unrecovered_contract_failure` sem apagar nenhuma ocorrência (2026-09-16 20:47, commit `e4ecf53`, verify: exit 0) | verify: `node scripts/eval/grade.mjs --assert-contract`
- [x] Comparação v4→v5 nas 7 falas que falharam, com as duas evidências lado a lado e o veredito de cada caso (2026-09-16 20:47, commit `e4ecf53`, verify: exit 0) | verify: `node scripts/eval/grade.mjs --comparar-prompt`
- [x] Leitura humana decide se a troca entre C5 e C4 (se houver) é aceitável, e se os dois tons soam de fato diferentes | evidence: manual @allan (2026-09-16 20:51, commit `e4ecf53`, evidence: v5 MANTIDO. Usuario leu a comparacao controlada 7/7 (5 melhora, 2 equivalencia, 0 regressao) e o efeito do tom, e decidiu: nao reverter e nao alterar o prompt nesta SPEC)

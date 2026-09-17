# SPEC-20260917-1059: Metodologia de repetição — comparabilidade sem depender de seed

**Status:** draft
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-17 10:59
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** repeticao, variancia, comparabilidade, n-amostras, seed, dispersao
**Features:** avaliacao, dialogo
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-17 — escolha "3. SPEC nova para a metodologia de repetição, e este critério migra para ela", em resposta ao fluxo R.6.2 sobre o critério 6 da SPEC-20260916-2048-metodologia-de-eval
**Resumo:** Constrói a comparabilidade entre rodadas sobre repetição e medida agregada, porque a SPEC-20260916-2048 mediu que `seed` não reproduz no Groq.

## Objetivo

A SPEC-20260916-2048-metodologia-de-eval fixou e gravou os parâmetros de amostragem, e com isso pôde
medir o que antes era só ressalva: **duas execuções da mesma condição, com `temperature: 1`, `seed:
20260916`, `seed_efetivo` confirmado e `system_fingerprint` IDÊNTICO (`fp_84bb35977d`), divergiram em
7 dos 9 campos do turno**, com +8,4% de token. A doc do Groq avisa que `seed` é "best effort" e manda
observar o fingerprint; aqui o fingerprint era o mesmo e divergiu de todo modo.

A consequência não é pequena: comparabilidade entre rodadas NÃO pode se apoiar em seed. Uma célula
medida uma vez não sustenta conclusão sobre diferença entre condições — que é exatamente a limitação
"diferença isolada não atribuível" registrada na SPEC-20260916-1652. Fixar o seed não a removeu.
Esta SPEC entrega o instrumento que remove: repetição com N conhecido e medida agregada com dispersão.

## Escopo

**DENTRO:**
- Execução repetida da mesma condição com N configurável e seeds derivados de forma determinística, para cada repetição ser reproduzível individualmente mesmo que o conjunto não seja
- Agregação por CÉLULA em vez de por execução: a unidade de conclusão passa a ser "célula com N amostras", não "célula"
- Medida de dispersão que o relatório reporta junto de qualquer percentual, para percentual sem dispersão deixar de ser afirmável
- Critério explícito de quando N é suficiente para afirmar diferença entre duas condições, e o que reportar quando não é
- A dispersão medida com `temperature: 0` (1e-8 no Groq) comparada à de `temperature: 1`, respondendo se decodificação quase gulosa reduz variância o bastante para valer a perda de naturalidade na medição
- Orçamento: o custo de N repetições contra o teto de tokens por minuto da ORGANIZAÇÃO, que já devolveu `retry-after` de 502s numa rodada de 3 falas

**FORA:**
- A pergunta sobre tom (SPEC-20260916-2048-tom-versus-pedagogia) — esta SPEC entrega o instrumento que aquela usa, como a SPEC-20260916-2048-metodologia-de-eval fez antes
- Mudar prompt, contrato do turno ou qualquer coisa do produto: é tudo `scripts/eval/`
- Painel ou visualização de métricas (Fase 4)
- Trocar de modelo ou de provedor para buscar determinismo

## Invariantes

- NUNCA afirmar diferença entre condições a partir de uma amostra por célula; sem N e sem dispersão, o número não é conclusão.
- SEMPRE reportar a dispersão junto do percentual, no mesmo lugar e na mesma linha de leitura.
- SEMPRE gravar o N e os seeds usados na evidência; repetição sem registro de quantas e quais não é repetição, é ruído.
- NUNCA descartar a repetição que divergiu para "limpar" o resultado — a divergência É a medida.

## Implementação

Tudo em `scripts/eval/`, sobre o instrumento que a SPEC-20260916-2048 já entregou: `AMOSTRAGEM`
resolvida uma vez por rodada, `amostragem` gravada na evidência com pedido e efetivo, e falha
identificada por célula.

- Os seeds de N repetições saem de uma função do seed base (ex.: `seed + i`), não de aleatório: o
  conjunto não é reproduzível, mas cada repetição é, e é isso que permite reexecutar exatamente a
  amostra que divergiu.
- A subpasta por repetição é o desenho que já funciona: `evidence/<modelo>/repeticao-N/` virou alvo
  próprio no grader sem nenhuma mudança, porque `findEvidenceTargets` já trata subgrupo como alvo.
  Foi assim que a medição da SPEC anterior foi feita, à mão. Aqui isso deixa de ser manual.
- A agregação precisa decidir o que fazer com campo de texto livre: `reply_en` diverge quase sempre,
  e comparar string não diz nada. O que se agrega é o resultado das CHECAGENS por repetição, não o
  texto — a dispersão é sobre "C5 passou em quantas das N".

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| Evidência | ganha `repeticao` (índice) e o seed daquela repetição |
| Relatório | percentual passa a vir acompanhado de N e de dispersão por checagem |

<!-- Alternativas consideradas e REJEITADAS:
  - Insistir em `seed` para obter reprodutibilidade: MEDIDO e reprovado na
    SPEC-20260916-2048-metodologia-de-eval, com fingerprint idêntico. Não é hipótese aberta.
  - Comparar o texto das repetições campo a campo: `reply_en` diverge quase sempre e isso não
    responde nada sobre pedagogia. O que interessa é a estabilidade das checagens.
  - Aumentar N até a dispersão desaparecer: ela não desaparece, e o teto de tokens da organização
    torna N grande caro. O critério é N suficiente para a afirmação, não N que zera variância.
-->

## Riscos

- O custo em tokens cresce linearmente com N e o teto é da organização, não da chave — mitigação: medir o custo por célula antes de escolher N, e usar o `retry-after` observado (até 502s) no planejamento da rodada.
- N insuficiente dá falsa segurança: dispersão medida sobre 2 amostras é quase informação nenhuma — mitigação: o critério de suficiência é entregável desta SPEC, não detalhe de implementação.
- `temperature: 0` pode reduzir a variância e ao mesmo tempo tornar a medição menos representativa da produção — mitigação: as duas condições são medidas e comparadas; a escolha fica registrada como decisão, não implícita no código.

## Sinais de sucesso

- "efeito real ou variância" deixa de ser ressalva obrigatória, e passa a ser pergunta com resposta numérica.
- Uma diferença entre condições só é afirmada quando N e dispersão sustentam.
- A SPEC-20260916-2048-tom-versus-pedagogia consegue rodar seu desenho sem inventar metodologia própria.

## Critério de aceite

- [ ] Execução repetida da mesma condição com N configurável e seeds derivados de forma determinística, gravados na evidência
- [ ] Agregação por célula com N amostras, e nenhum percentual reportado sem sua dispersão
- [ ] Critério de suficiência de N escrito e justificado, com o que reportar quando N é insuficiente
- [ ] Dispersão com `temperature: 0` medida e comparada à de `temperature: 1`, com a escolha para medição registrada como decisão | evidence: manual @allan
- [ ] Custo por célula medido e o planejamento de rodada longa levando em conta o teto por minuto da organização

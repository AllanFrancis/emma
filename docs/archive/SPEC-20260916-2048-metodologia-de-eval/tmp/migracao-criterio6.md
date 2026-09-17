Mudança de CONTRATO no critério 6, com validação humana explícita. O usuário escolheu, no
fluxo R.6.2, a opção "3. SPEC nova para a metodologia de repetição, e este critério migra
para ela" — resposta literal: "3", às três opções que eu apresentei em 2026-09-17:

  1. Aceitar o gap (marcador [aceito-incompleto: ...])
  2. Medir mais antes (--temperature 0 e N>2)
  3. SPEC nova para a metodologia de repetição, e este critério migra para ela

ANTES:
  - [ ] Duas execuções da mesma condição, com parâmetros fixados, produzem resultado
        comparável — e a dispersão residual é reportada | evidence: manual @allan

DEPOIS:
  - [ ] Duas execuções da mesma condição, com parâmetros fixados, têm a dispersão residual
        MEDIDA e reportada — a comparabilidade em si migrou para a
        SPEC-20260917-1059-metodologia-de-repeticao | evidence: manual @allan

O que mudou, exatamente: o critério tinha DUAS metades e só uma foi entregue.

  (a) "a dispersão residual é reportada" — ENTREGUE. Duas execuções de `cafe-01` com
      temperature 1, seed 20260916, seed_efetivo confirmado e system_fingerprint idêntico
      (fp_84bb35977d): 7 dos 9 campos divergiram, +8,4% de token. Está medido, documentado
      na entrada [descoberta] deste journal e registrado como gotcha em
      docs/features/avaliacao.md.
  (b) "produzem resultado comparável" — NÃO entregue, e agora se sabe POR QUE: `seed` não
      reproduz no Groq. Isso não é lacuna de execução desta SPEC, é achado dela. Construir
      comparabilidade sobre repetição e medida agregada é trabalho próprio, com N,
      critério de suficiência e orçamento de tokens — e virou a
      SPEC-20260917-1059-metodologia-de-repeticao, criada em future/ e no DAG do programa
      emma.

O que esta SPEC continua devendo, e é o que o critério pede agora: nada além do que já
está no disco. A dispersão está medida e reportada. Por isso o critério pode ser
evidenciado sem redução silenciosa de escopo — a parte não entregue saiu do contrato POR
DECISÃO DO USUÁRIO e tem endereço, não sumiu.

Efeito colateral no DAG, registrado no commit 9e8bd72 em main:
`SPEC-20260916-2048-tom-versus-pedagogia` passou a depender da SPEC nova em vez desta,
porque a condição de controle por repetição deixou de ser refinamento e passou a ser o
único caminho para o desenho dela. É uma aresta reversível em uma linha.

R.6.2 respeitado: nenhum critério foi aceito incompleto, e nenhuma redução de escopo
partiu de mim.

Material extra, preservado como `repeticao-3/`, e um detalhe que reforça o achado.

Origem: a rodada `--limit 3` que eu havia abortado por tempo continuou viva como processo
órfão e terminou de gravar antes de eu matá-la. São 3 turnos válidos e completos, com o
mesmo `seed: 20260916` e `seed_efetivo` confirmado. Não apaguei: é amostra legítima da
mesma condição, e a invariante desta SPEC proíbe descartar ocorrência gravada. Mas também
NÃO refiz a análise de dispersão em cima dela — o critério já estava medido e reportado, e
refazer no fechamento seria mudar o número de referência na última hora. Fica como
material para a SPEC-20260917-1059-metodologia-de-repeticao.

O detalhe novo: o `system_fingerprint` NÃO é estável entre chamadas.

  repeticao-1/cafe-01 -> fp_84bb35977d
  repeticao-1/cafe-02 -> fp_1074f9ce08
  repeticao-1/cafe-03 -> fp_e23fc997ca
  repeticao-2/cafe-01 -> fp_84bb35977d
  repeticao-3/cafe-01 -> fp_a4315eb300
  repeticao-3/cafe-02 -> fp_24bfb4a850
  repeticao-3/cafe-03 -> fp_4f7e7dc26e

Sete chamadas, seis fingerprints distintos. O backend roda por requisição, não por rodada.

Isso não enfraquece a medição da dispersão — fortalece. O par que sustentou o achado
(`repeticao-1/cafe-01` e `repeticao-2/cafe-01`) caiu, por sorte, no MESMO fingerprint
`fp_84bb35977d`. Ou seja: mesmo seed, mesmo backend, e a saída divergiu em 7 dos 9 campos.
A causa "o backend mudou" foi eliminada por evidência naquele par específico, e é
justamente por isso que a variância de amostragem pôde ser afirmada.

E acrescenta uma consequência prática para a SPEC nova: a estratégia que a doc do Groq
sugere — acompanhar `system_fingerprint` para saber quando o determinismo deixou de valer —
não é utilizável como controle aqui, porque o fingerprint muda quase sempre. Esperar por
"mesmo fingerprint" para comparar duas rodadas significaria descartar a maior parte das
amostras.

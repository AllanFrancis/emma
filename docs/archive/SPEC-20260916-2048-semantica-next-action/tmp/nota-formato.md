A entrada `[descoberta]` de 12:22 foi criada com `--body-file` apontando para `evidence/levantamento-taxa.md`, cujo corpo usa cabeçalhos `##`. O parser do LOG lê todo `## ` como início de entrada nova, então uma entrada virou seis, cinco delas malformadas, e `lint --strict` reprovou com 5 erros.

Correção aplicada: os seis cabeçalhos internos daquela entrada (`## Universo`, `## Distribuição ...`, `## A taxa`, `## Achados ...`, `## Nota de defasagem ...`, `## Correção de método ...`) foram rebaixados para `###`. Nenhum byte de conteúdo foi removido nem reescrito — só a profundidade do cabeçalho mudou, para o arquivo voltar a ter uma entrada em vez de seis. Verificado depois: `lint --strict` em 0 erro/0 aviso, e os marcadores do texto (232 turnos, 115 sem `next_action`, 64,1%, `hotel-10`) seguem presentes.

Não usei remoção nem reescrita porque o LOG é append-only (TIER-0 #2). Rebaixar profundidade de cabeçalho preserva integralmente o que foi registrado; apagar o corpo duplicado, não. O texto completo também vive em `evidence/levantamento-taxa.md`, que é a cópia canônica e persistente.

Gotcha para as próximas entradas desta e de qualquer SPEC: corpo passado por `--body-file` ao `specctl log` deve começar em `###` ou mais fundo. Cabeçalho `##` no corpo quebra o parser do LOG. Candidato a gotcha da feature `dialogo` no fechamento.

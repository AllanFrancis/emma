Porte MANTIDO em P. O `audit --deps` emitiu aviso não-bloqueante ("porte P com 4
critérios — sinais de porte M"), e a decisão é não escalar.

Regra normativa aplicada — `docs/rules/verification.md`, seção "Porte P — leve por
design": "NÃO crie suíte nem script novo só para dar `verify:` num P — é ajuste
pontual. Se de fato precisa de teste dedicado, o porte virou M". O gatilho normativo
de P→M é a necessidade de suíte/script NOVO, não a contagem de critérios.

Escopo real medido contra esse gatilho:
- A checagem nova entra no array `CHECKS` que já existe em `scripts/eval/grade.mjs`.
- Os casos de teste entram no harness de self-test que já existe (`buildSelfTestCases`
  / `runSelfTest`), acionado por `grade.mjs --self-test`. Nenhuma suíte nova, nenhum
  script novo, nenhuma dependência nova.
- O levantamento roda offline sobre evidência já gravada, sem chamada ao modelo.
- Sem mudança de contrato do turno (`turn-schema.json` intocado) e sem entidade nova
  no modelo de dados — o próprio main.md declara "Nenhuma".

Os 4 critérios fecham por `specctl check` com carimbo de timestamp+commit, que é
exatamente a rota de porte P; nenhum critério carrega `| verify:` (o lint recusaria).

Citação do usuário em 2026-09-16: "Se o único motivo para escalar é o aviso automático
por ter 4 critérios, avalie o escopo real. Se continua sendo uma alteração pequena,
localizada em `grade.mjs`, sem mudança arquitetural ou aumento relevante de risco, pode
permanecer P. Não quero aumentar porte apenas para silenciar um warning não bloqueante.
Se houver regra normativa que obrigue M nesse caso, aí faça o `escalate`."

Ressalva registrada: o critério 4 pede "ponto de aplicação decidido e registrado como
decisão arquitetural". Isso é uma DECISÃO documentada, não uma refatoração — se a
decisão escolher aplicar a rejeição dentro de `turn-validator.mjs` (mudando o
comportamento do validador de contrato), o porte é reavaliado ali e o `escalate` volta
à mesa antes de tocar o arquivo.

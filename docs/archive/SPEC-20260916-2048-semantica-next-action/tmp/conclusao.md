A lacuna que o `hotel-10` expôs agora é detectável, e o campo `next_action` tem dono declarado.

### O que foi entregue

**C15 em `scripts/eval/grade.mjs`**, espelho de C12. C12 garantia um lado — não cobrar repetição de quem não errou; a C15 cobre o outro — quem recebeu correção precisa ser convidado a aplicá-la. Regra sem exceção: `corrections.length > 0` ⇒ só `retry` é coerente.

**A taxa, medida antes da intervenção e sem uma chamada nova ao modelo:** 38 de 61 turnos com correção emitida (62,3%) não pediam aplicação, todos `reply`. Reproduzível por `node scripts/eval/grade.mjs --levantamento-aplicacao`, que lê `docs/active/` e `docs/archive/` como fontes separadas.

**A tabela de coerência** das 8 combinações de `corrections` × `next_action`, revisada e aprovada, com a distinção metodológica preservada: 41 casos de `reply` são medida, as duas linhas de missão são regra derivada do invariante, e o documento não finge que têm o mesmo lastro.

**A decisão de fonte de verdade:** o núcleo sobrescreve a proposta do modelo. O que a sustenta não é só a taxa alta — é o `hotel-10` estar gravado duas vezes, `retry` no contrato-do-turno-v2 e `reply` no prompt-v5. O prompt regrediu o caso e ninguém notou, porque nada media. Instrução de prompt era exatamente a hipótese barata, e a evidência a reprovou antes de ela ser tentada de novo.

### O que esta SPEC deliberadamente NÃO fez

Não implementou a regra no núcleo pedagógico — o escopo do contrato é explícito: aqui se define a regra que ele vai aplicar. Não tocou `LONGITUDINAL_CHECKS` (território de `retencao-de-contexto`) nem a camada de relatório (território de `metodologia-de-repeticao`), mesmo estando no mesmo arquivo. Não abriu exceção para correção não bloqueante, que fica como semântica nova a propor no contrato do turno se e quando se quiser.

### Gotchas que valem promoção

1. **Dois formatos de evidência.** Turno único guarda a resposta como envelope da API (`choices[0].message.content` como string JSON); conversa guarda `turno.resposta` já desserializado. Varredura que trata só o primeiro formato zera as conversas SEM ERRO NENHUM — a primeira medição desta SPEC leu 222 turnos e perdeu 10 assim.
2. **`specctl log --body-file` e cabeçalhos.** Corpo com `## ` faz o parser do LOG ler cada cabeçalho como entrada nova. Corpos devem começar em `###`.

### Ficou pendente, por regra e não por esquecimento

A linha do mapa de arquivos de `docs/features/dialogo.md` ainda diz "13 checagens" e deveria dizer 15. Vai no `### Delta de estado` do fechamento: `dialogo.md` está em colisão de claim com `motor-de-dialogo` nesta rodada, e `docs/rules/team.md` proíbe edição concorrente da prosa de estado. As outras três ocorrências de "13" naquele arquivo são históricas — descrevem o que era verdade quando o contrato v2 e a SPEC longitudinal fecharam — e editá-las falsificaria registro.

### Verificação

`grade.mjs --self-test`: 33 casos de turno, 15 checagens de turno + 5 longitudinais, 0 falha. `validate.mjs`: 0/0. `specctl lint --strict`: 0/0. `bun test`: 76 pass, 0 fail. `bun run lint`: 0 erro (6 avisos pré-existentes no scaffold `src/components/ui/`). `bun x tsc --noEmit`: limpo.

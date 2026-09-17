A regra aprovada hoje CONTRADIZ o núcleo pedagógico já arquivado e já em código. Descoberto ao ler `src/domain/` no worktree do `motor-de-dialogo`, depois de os 4 critérios desta SPEC estarem marcados.

### O conflito, em uma linha

`src/domain/next-action.ts`, na `decidirNextAction`:

```js
// 2. Correção emitida exige aplicação. Vence a proposta do modelo, mas NÃO vence o
//    fechamento de missão: cobrar repetição depois de o objetivo ter sido cumprido
//    transformaria a vitória do aluno em mais uma tarefa.
if (temCorrecao && transition !== "complete") {
```

O `transition !== "complete"` é exatamente a exceção que o usuário RECUSOU hoje. O núcleo, na última etapa da missão, emite `complete_mission` mesmo com correção aceita. A C15 classifica isso como incoerente.

E não é acidente nem código morto: `src/domain/next-action.test.ts` tem teste nomeado para o caso.

```js
test("mas fechar a missao vence a cobranca de repeticao", () => {
  // Cobrar repeticao depois de o objetivo ter sido cumprido transformaria a vitoria do
  // aluno em mais uma tarefa.
  const decisao = decidirNextAction({
    mission: missao, stepIndex: 3, transition: "complete",
    acceptedCorrections: [correcao()], proposed: "complete_mission",
  });
  expect(decisao.action).toBe("complete_mission");
});
```

### Por que isso importa mais do que parece

O argumento no comentário do núcleo é quase palavra por palavra o que esta SPEC levantou como tensão da linha `complete_mission` + correção, e que o usuário decidiu contra. A diferença é que o núcleo não é hipótese: é política implementada, testada e arquivada, com justificativa pedagógica escrita.

Consequência prática: assim que o motor de diálogo passar a produzir turnos pelo núcleo, a C15 vai acusar todo fechamento de missão que carregue correção. Não por defeito do núcleo nem por bug da C15 — por divergência de política entre duas SPECs, uma arquivada e uma sendo fechada agora.

Observação que reduz o escopo do conflito: para `continue_mission` NÃO há divergência. O núcleo força `retry` em toda transição que não seja `complete`, então `continue_mission` com correção não sai do núcleo. O conflito é exclusivamente na linha `complete_mission`.

### O que NÃO fiz, de propósito

Não afrouxei a C15 para acomodar o núcleo: isso reverteria uma decisão explícita do usuário, tomada hoje, e ele foi específico — "Não quero abrir essa exceção implicitamente dentro da C15".

Não alterei `src/domain/next-action.ts` nem seu teste: o núcleo está ARQUIVADO, esta SPEC declara no escopo que implementar o núcleo é FORA, e mudar política de SPEC arquivada exige rota própria (`reopen`, ou SPEC nova).

Não marquei nem desmarquei critério por conta disso. Os 4 seguem evidenciados: a tabela foi escrita e revisada, a C15 existe com self-test, a taxa foi medida e a decisão de fonte de verdade está registrada. O que está em aberto não é um critério desta SPEC — é a compatibilidade entre a regra que ela definiu e a política que o núcleo já aplica.

### As três saídas, para decisão do usuário

1. **A C15 fica estrita e o núcleo se alinha.** A linha `transition !== "complete"` sai, e o teste "fechar a missao vence a cobranca de repeticao" inverte. Exige SPEC nova (ou `reopen` do núcleo), porque é política de SPEC arquivada. Custo: o aluno pode receber pedido de repetição no momento da vitória, que é justamente o que o núcleo evitou de propósito.

2. **A exceção de fechamento é legitimada, e entra no contrato — não na C15.** É o caminho que o próprio usuário desenhou hoje: "se futuramente quisermos permitir observações no fechamento da missão sem exigir nova tentativa, isso deve entrar como uma semântica nova e explícita no contrato". Ou seja, distinguir correção bloqueante de informativa no `turn-schema.json`, e a C15 passa a exigir `retry` só para as bloqueantes. Custo: mexe no contrato do turno, que esta SPEC declara FORA do escopo.

3. **Fica registrado como divergência conhecida e a C15 entra medindo.** A C15 é instrumento de medição antes de ser gate; ela acusaria os fechamentos com correção e a taxa real diria quantas vezes isso acontece de fato. Hoje são 0 de 107, então o alarme é teórico. Custo: aceitar uma checagem que se sabe que vai acusar comportamento deliberado do núcleo.

Recomendação: **3 agora, 2 depois.** A C15 não é gate de CI ainda, e 0 ocorrências em 107 turnos significa que a divergência não tem custo imediato; deixá-la visível é melhor que escondê-la. E quando o motor começar a fechar missões de verdade, a taxa dirá se a exceção do núcleo é frequente o bastante para merecer a semântica nova do caminho 2. O caminho 1 é o único que eu não recomendaria sem mais evidência, porque descarta uma decisão pedagógica que foi tomada com justificativa e teste.

Existe pela primeira vez código de produto neste repositório, e ele é pedagogia — não
tela, não prompt, não integração. A §11 do prompt de desenvolvimento deixou de ser
intenção: as regras que estavam dentro de um texto agora são dados e funções com teste.

O que ficou de pé, política por política:

- NÍVEL. Mediana dos critérios pontuados, nunca média. O teste que importa é o do perfil
  que o produto existe para consertar: [5,5,5,5,1] dá média 4,2 e a média não vê problema
  nenhum; a mediana dá 5 e o teto por sustentação derruba para 4. Histerese assimétrica —
  2 avaliações para subir, 3 para descer, 1 degrau por vez — porque dia ruim não pode
  rebaixar quem está aprendendo. Nota sem citação sai da conta como se fosse `null`.
- SUPORTE pt-BR. Tabela por nível (1 → 0,75 → 0,5 → 0,25 → 0,1). A preferência da
  professora desloca ±0,15 mas não inverte: um N1 com suporte mínimo ainda recebe mais
  apoio que um N4 com suporte alto. Nível é evidência, preferência é gosto, evidência ganha.
- CORREÇÃO. Evidência literal obrigatória, teto de 3 e truncagem por prioridade de
  categoria. O teste que prova a ordem é o que mais vale: com teto 1, uma lista que chega
  como [register, grammar, false_friend] sai como [false_friend] — por ordem de chegada
  sairia `register`, mantendo o detalhe e descartando o erro que inverte o sentido.
- MISSÃO. Tabela de transição em que `complete` só existe na última etapa. Isso torna
  `complete_mission` na etapa 2 de 4 estruturalmente impossível, em vez de proibido por um
  `if` que alguém esquece.
- NEXT_ACTION. A proposta do modelo é entrada, não comando (DEC-20260916-1612). Recusa
  `complete_mission` prematuro, recusa `continue_mission` sem etapa seguinte, recusa
  `retry` sem correção, e força `retry` quando houve correção — com uma exceção: fechar a
  missão vence a cobrança de repetição, porque cobrar repetição depois da vitória
  transforma a vitória em tarefa.
- OVERRIDES. Merge em objeto novo, e a sessão nunca escreve no perfil. `undefined` num
  override significa "não mexi nisso", não "apague".

Sobre o contrato do turno: os tipos são GERADOS de `scripts/eval/turn-schema.json`. O
schema é a fonte porque é ele que o strict mode do Groq consome, e o `--check` do gerador
reprova arquivo desatualizado — com um teste que roda esse `--check`. Mudar o schema sem
regenerar reprova a suíte, que é o único jeito de o dual-write não nascer sem ninguém ver.
`maxItems: 3` não é expressável em tipo TypeScript, então o teto virou regra de runtime e
há um teste que amarra as duas coisas.

Números: 76 testes, 269 asserções, `tsc --noEmit` limpo com `noUncheckedIndexedAccess` e
`exactOptionalPropertyTypes` ligados, lint sem erro. O teste mais útil da suíte é o que LÊ
os arquivos do próprio módulo e reprova se aparecer `fetch(`, import de `scripts/eval` ou
de qualquer SDK — a invariante "sem rede" passou a ser verificada, não prometida.

O que NÃO entrou, de propósito: motor de diálogo, telas, camada de personalidade,
catálogo real de missões e persistência. Nada de `semantica-next-action` nem de retenção de
contexto, por instrução do usuário. O filtro de correção de grafia decidido pela
SPEC-20260916-2048-regra-fala-transcrita (DEC-20260916-2332) tampouco entrou: ela roda em
paralelo em outro worktree e a decisão de lá previu que a aplicação seria da SPEC seguinte
do núcleo, não desta — puxá-la aqui seria antecipar trabalho de branch que ainda não
mergeou.

Duas escolhas minhas que não estavam especificadas e ficam à revisão: o teto de correção
por nível (1 no N1, 2 nos N2–N3, 3 do N4 em diante) e o critério de fechamento de etapa por
`expectedWords`. Nenhuma contradiz invariante declarada, e as duas são dado, não código.

Duas execuções da MESMA condição, com os parâmetros fixados, e o resultado contraria a
leitura otimista do critério 6: a saída NÃO é reproduzível.

Condição idêntica nas duas repetições, verificada na própria evidência:
  temperature .......... 1 e 1
  seed pedido .......... 20260916 e 20260916
  seed EFETIVO ......... 20260916 e 20260916   (o Groq confirmou que usou o que pedimos)
  system_fingerprint ... fp_84bb35977d nas duas (mesmo backend)
  prompt ............... v5, mesma fala (`cafe-01`)

Dispersão residual: **7 dos 9 campos do turno divergiram.**

  reply_en        "Sure thing! Are you looking for a black coffee or something like a
                   latte?"  vs  "Sure! Would you like milk or sugar with your coffee?"
  reply_pt        idem, traduzido
  instruction_pt  "Escolha o tipo de café que deseja." vs "Como você gostaria de preparar
                   o café?"
  suggestion_en   "Black coffee, please." vs "I would like a coffee, please."
  suggestion_pt   idem
  words           ["black coffee","latte","espresso"] vs ["would you like","a coffee",
                   "please"]
  focus           "" vs "Use 'please' to make a polite request."

Só `corrections` e `next_action` bateram — e `corrections` bateu porque estava vazio nas
duas, o que é coincidência de caso de controle, não estabilidade demonstrada.

Custo também variou: 1.993 vs 2.161 tokens (completion 461 vs 629), ou seja +8,4% de
token na mesma condição.

O QUE ISSO SIGNIFICA, e é o achado que muda desenho:

A doc do Groq diz que `seed` é "best effort" e manda observar o `system_fingerprint` para
saber quando o determinismo deixou de valer. Aqui o fingerprint é IDÊNTICO e a saída
divergiu de todo modo. Então, para `openai/gpt-oss-20b` no Groq, seed não entrega
reprodutibilidade — nem com backend estável. A ressalva da doc não é teórica.

Consequência prática, e ela não é pequena: comparabilidade entre rodadas NÃO pode se
apoiar em seed. Ela tem de vir de REPETIÇÃO e medida agregada. Uma célula medida uma vez
não sustenta conclusão sobre diferença entre condições — foi exatamente a limitação que a
SPEC-20260916-1652 registrou como "diferença isolada não atribuível", e o instrumento novo
mostra que fixar o seed não a remove.

Isso afeta o desenho da SPEC-20260916-2048-tom-versus-pedagogia: a condição de controle por
repetição deixa de ser refinamento e passa a ser o único caminho. Não implementei nada
daquela SPEC aqui — só registro que a premissa mudou.

O que o instrumento DE FATO entregou, e vale:
- os parâmetros agora são conhecidos, fixados e gravados; "não sabíamos os parâmetros"
  deixou de ser ressalva possível;
- `seed_efetivo` e `system_fingerprint` na evidência permitem separar três causas que antes
  se confundiam numa só: parâmetro diferente, backend diferente, ou variância de
  amostragem. Nesta medição as duas primeiras foram ELIMINADAS por evidência, e é por isso
  que a terceira pôde ser afirmada.

R.6.2: NÃO marquei o critério 6. Ele pede "duas execuções da mesma condição, com
parâmetros fixados, produzem resultado comparável — e a dispersão residual é reportada". A
segunda metade está cumprida e documentada. A primeira depende de como o usuário lê
"comparável": comparável no sentido de que a comparação passou a ser possível e as causas
espúrias foram eliminadas, SIM; comparável no sentido de saída parecida, NÃO. A leitura é
dele, não minha.

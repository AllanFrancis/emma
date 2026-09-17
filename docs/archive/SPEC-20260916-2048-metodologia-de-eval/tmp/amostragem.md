`temperature` FIXADA EM 1 e `seed` FIXADO EM 20260916, ambos explícitos no payload e
gravados na evidência. Overrides por `--temperature` e `--seed`.

Por que 1 e não 0, que seria o reflexo automático de "quero medir sem variância":

1. É o default da API, e portanto o regime sob o qual as 215 evidências já arquivadas
   foram geradas. Fixar em 1 torna rodada nova comparável com todo o histórico. Fixar em 0
   criaria uma quebra e jogaria fora a comparabilidade com o que já foi medido — o oposto
   do objetivo desta SPEC.
2. O próprio main.md registra o risco: temperatura baixa degrada a naturalidade da
   conversa, que é qualidade de produto. O parâmetro controlado vale para MEDIÇÃO, e o
   valor de PRODUÇÃO segue sendo decisão separada e ainda não tomada.
3. Na API do Groq, temperature 0 nem é 0: é convertida para 1e-8 (doc de compatibilidade
   OpenAI). Escolher 0 seria escolher um número que a API troca por outro.

Quem quiser decodificação quase gulosa passa `--temperature 0`. A flag existe e o valor
usado vai para a evidência, então a escolha nunca fica implícita.

Por que o seed é fixo E variável por flag: fixo, duas rodadas da mesma condição são
comparáveis (é o critério 6). Variável de propósito, N repetições com N seeds conhecidos
medem a variância residual sem perder reprodutibilidade de nenhuma delas. É o instrumento
que a SPEC-20260916-2048-tom-versus-pedagogia vai usar; esta SPEC entrega a flag e não
implementa nada daquela.

`configurarAmostragem` roda UMA vez no início e vale para a rodada inteira — dataset,
matriz, comparação e conversa. Deixar cada caminho escolher a sua daria evidência com
parâmetros diferentes dentro da mesma rodada, que é o defeito original.

Gravação: `amostragem.temperature`, `amostragem.seed` (pedidos),
`amostragem.seed_efetivo` (o `x_groq.seed` devolvido) e `amostragem.system_fingerprint`.
Os quatro juntos, porque a doc do Groq diz que o determinismo do seed morre quando o
fingerprint muda — sem ele, uma divergência entre rodadas fica sem explicação possível.
No caminho de conversa a amostragem é gravada POR TURNO, já que uma conversa pode
atravessar uma troca de backend no meio.

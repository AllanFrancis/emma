# SPEC-20260916-1652: Camada de personalidade — estilo depois do LLM, não dentro dele

**Status:** draft
**Porte:** M
**Owner:** @allan
**Criada:** 2026-09-16 16:52
**Ativada:** —
**Concluída:** —
**Pausada em:** —
**Commit final:** —
**Keywords:** personalidade, estilo, invariancia, teacher-preferences, tom
**Features:** personalidade
**Branch:** —
**Programa:** emma
**Workspace:** —
**Origem:** usuário em 2026-09-16 16:52
**Resumo:** Aplica tom e intensidade como camada posterior ao motor, com contrato que torna impossível a personalidade alterar a correção pedagógica.

## Objetivo

A §6 do PROMPT DE DESENVOLVIMENTO exige que nenhuma personalidade prejudique a didática nem altere
a dificuldade, e a §3 exige que personalidade não modifique a verdade pedagógica. Se o estilo entra
no prompt, essa exigência depende de o modelo obedecer — e a evidência já mostrou que ele não
obedece de forma confiável: o 120b "mais rigoroso" corrigiu a maiúscula de "english" na fala de um
aluno que acabara de dizer ter vergonha do próprio inglês. Esta SPEC move o estilo para DEPOIS da
geração, onde a invariância deixa de ser pedido e passa a ser propriedade estrutural.

## Escopo

**DENTRO:**
- `TeacherPreferences` como conceito extensível: `style` em enum aberto, `intensity` numérica, `supportLevel`, `speechRate` — nunca `patient: boolean`
- Camada de estilo com assinatura restrita: `(TurnOutput, TeacherPreferences) -> TurnOutput`
- Verificação em runtime de que `corrections[].original`, `.suggested`, `.category`, `focus` e `next_action` saem idênticos ao que entraram; divergência é erro, não aviso
- Os dois estilos da Fase 1: tranquila e direta, com os 15 limites globais da §13 valendo para ambos
- Expressão visual do estilo (`mood` do rosto), que o protótipo já faz por `isDirect()`
- Suíte que reprova a regressão: a matriz de invariância da SPEC de eval-personalidade rodando sobre esta camada

**FORA:**
- Terceiro estilo — a arquitetura tem de aceitar, mas a Fase 1 entrega dois
- Controle de override de personalidade na interface: o domínio resolve por merge desde já, mas a tela é de outra fase
- Qualquer política pedagógica (SPEC de nucleo-pedagogico)
- Voz, velocidade de fala aplicada em TTS (Fase 3) — aqui `speechRate` só existe como preferência

## Invariantes

- NUNCA a camada de estilo altera `corrections[]`, `focus` ou `next_action`; ela recebe um objeto pronto e só reescreve campos de texto de fala.
- NUNCA a personalidade altera a dificuldade: `targetLevel` e `supportRatio` são do núcleo e chegam decididos.
- NUNCA nenhum estilo humilha, ofende ou usa palavrão, e nenhum reduz a didática — os limites da §13 são globais e a personalidade não os sobrescreve.
- SEMPRE adicionar um estilo novo é acrescentar valor de enum e bloco de tom; se exigir mudança no núcleo, a arquitetura falhou.
- NUNCA a sessão escreve preferência no perfil; override é temporário por definição.

## Implementação

Três mecanismos em ordem crescente de força, porque um só não basta.

1. **Arquitetural** — `corrections[]` é produzido antes da camada de estilo. A personalidade recebe o que não pode mudar, então não tem como mudar.
2. **Contratual** — a função de estilo compara entrada e saída nos campos protegidos e falha explicitamente na divergência. Verificação em runtime, não confiança.
3. **Empírico** — a matriz da eval de personalidade roda contra esta camada: mesma fala, dois tons, `suggested` idêntico e `reply_en` diferente.

O estilo é dado, não código: cada `style` é um bloco de instrução de tom mais parâmetros de
intensidade. É isso que torna "adicionar um estilo" uma entrada de tabela.

### Modelo de dados

| Entidade | Campos / mudança |
|---|---|
| `TeacherPreferences` | `style` (enum aberto), `intensity` (numérico), `supportLevel`, `speechRate` |
| `Session.overrides` | subconjunto temporário de `TeacherPreferences`, resolvido por merge e descartado no fim |
| Catálogo de estilos | dado: por `style`, o bloco de tom e os parâmetros de intensidade |

<!-- Alternativas consideradas e REJEITADAS:
  - Estilo dentro do prompt: torna a invariância dependente de obediência do modelo, e a evidência
    do eval mostra que o tom contamina a quantidade de correção.
  - `patient: boolean`: a §6 proíbe explicitamente, e um booleano não acomoda intensidade nem um
    terceiro estilo.
  - Confiar na assinatura de tipos para garantir a invariância: tipo não impede reescrever o
    conteúdo de um campo permitido; a verificação em runtime impede.
-->

## Riscos

- O modelo pode produzir `reply_en` já enviesado pelo tom antes da camada agir, se o tom vazar para o prompt por descuido — mitigação: o prompt vem do `Intent`, que não carrega estilo; qualquer campo de tom no `Intent` é bug.
- Reescrever texto depois da geração pode soar artificial ou quebrar a pergunta final obrigatória — mitigação: C2 (termina com pergunta) roda sobre a saída da camada, não só sobre a do modelo.
- Dois estilos podem sair indistinguíveis, tornando a escolha do onboarding decorativa — mitigação: a asserção de DIFERENÇA na eval reprova esse caso.

## Sinais de sucesso

- Trocar de personalidade muda o que o aluno sente e não muda o que ele aprende, e isso é verificável por asserção.
- Um terceiro estilo entra sem tocar o núcleo pedagógico.
- A escolha de personalidade no onboarding tem efeito perceptível na conversa.

## Critério de aceite

- [ ] `TeacherPreferences` tem `style` em enum aberto, `intensity`, `supportLevel` e `speechRate`; nenhum booleano de personalidade no domínio
- [ ] A camada de estilo verifica em runtime que `corrections[].original`, `.suggested`, `.category`, `focus` e `next_action` são idênticos na entrada e na saída, e falha na divergência
- [ ] Tranquila e direta produzem `reply_en` e `explanation_pt` mensuravelmente diferentes para a mesma entrada
- [ ] Nenhum estilo altera `targetLevel` nem `supportRatio`
- [ ] Adicionar um terceiro estilo de teste não requer alteração em nenhum arquivo do núcleo pedagógico
- [ ] Os 15 limites globais da §13 valem nos dois estilos, com teste para "nunca se apresentar como humana" e "nunca afirmar ser escola credenciada"
- [ ] `Session.overrides` resolve por merge e o perfil permanece intacto ao fim da sessão
- [ ] A matriz de invariância da eval de personalidade passa contra esta camada

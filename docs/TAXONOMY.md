# TAXONOMY.md — vocabulário canônico de áreas

> Orçamento-alvo: ≤1.600 bytes. Toda feature de `docs/features/` DEVE corresponder a uma área daqui (R.4).
> Área nova = confirmação explícita do usuário (R.13). Namespaces com `/` (ex.: `api/auth`).
> Formato por linha: `- <area> — definição 1 linha (aliases proibidos: x→area)`

## Áreas

- dialogo — motor de conversa da Emma: system prompt, contrato do turno e catálogo de missões (aliases proibidos: chat→dialogo, conversa→dialogo, motor→dialogo)
- avaliacao — estimativa e evolução do nível de proficiência do aluno por rubrica auditável (aliases proibidos: nivel→avaliacao, diagnostico→avaliacao, rubrica→avaliacao)
- pedagogia — decide O QUE ensinar: políticas de nível, suporte em pt-BR e correção, máquina de missão e o PedagogicalIntent (aliases proibidos: nucleo→pedagogia, intent→pedagogia, politica→pedagogia)
- personalidade — decide COMO comunicar: tom, intensidade e encorajamento, sem nunca alterar a verdade pedagógica (aliases proibidos: tom→personalidade, estilo→personalidade, persona→personalidade)
- onboarding — primeira experiência: telas de entrada, captura do perfil pedagógico e primeira vitória concreta (aliases proibidos: cadastro→onboarding, perguntas→onboarding, setup→onboarding)
- progresso — sessões, sequência de dias, palavras praticadas, resumo de lição e a instrumentação da métrica central (aliases proibidos: metricas→progresso, streak→progresso, ofensiva→progresso, resumo→progresso)

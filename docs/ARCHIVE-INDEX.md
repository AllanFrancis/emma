# ARCHIVE-INDEX

> GERADO — specctl index — NÃO EDITAR

SPEC-20260916-0109-rubrica-e-eval-do-motor | done | dialogo, avaliacao | rubrica, eval, nivel, groq, contrato-do-turno | Define a rubrica de avaliação de nível e mede com dados se um modelo aberto do Groq sustenta a conversa pedagógica da Emma.
SPEC-20260916-1450-contrato-do-turno-v2 | done | dialogo | contrato-do-turno, corrections, next-action, schema, eval | Migra o contrato do turno de `correction_pt` string para `corrections[]` estruturado com `next_action`, e revalida o dataset de 45 falas sob o novo contrato.
SPEC-20260916-1652-eval-conversa-multiturno | done | dialogo | multiturno, coerencia, missao, next-action, contexto | Mede o que turno isolado não mede — retenção de contexto, avanço de missão e coerência de `next_action` ao longo de uma conversa inteira.
SPEC-20260916-1652-eval-personalidade | done | dialogo, personalidade | personalidade, eval, matriz, tom, invariancia | Prova com dados que Paciente e Direta mudam o estilo sem mudar a correção, e ataca por prompt as duas falhas de calibração que a SPEC-20260916-1450 mediu.
SPEC-20260916-1652-motor-de-dialogo | done | dialogo | motor, server-function, groq, strict-json, fallback, prompt | Transforma `PedagogicalIntent` em turno de conversa por server function no Groq, com schema estrito, retry e fallback roteirizado — e a chave de API nunca no cliente.
SPEC-20260916-1652-nucleo-pedagogico | done | pedagogia, avaliacao | pedagogia, intent, politica, nivel, missao, rubrica | Implementa em TypeScript puro as decisões pedagógicas que hoje moram no prompt — nível, suporte em pt-BR, priorização de correção e máquina de missão — expondo-as como `PedagogicalIntent`.
SPEC-20260916-1652-onboarding-e-perfil | done | onboarding | onboarding, perfil, telas, uma-decisao, progresso | Constrói as telas de entrada e as 6 perguntas que realmente alimentam o motor, gravando o perfil pedagógico que o núcleo consome.
SPEC-20260916-2048-metodologia-de-eval | done | dialogo, avaliacao | metodologia, temperature, seed, retry, confiabilidade, timeout | Fecha as lacunas metodológicas que limitaram a força das conclusões: parâmetros de amostragem não controlados, retry não implementado e requisição sem timeout.
SPEC-20260916-2048-regra-fala-transcrita | done | dialogo | fala-transcrita, maiuscula, grafia, livre-02, DEC-0312 | Transforma a DEC-20260916-0312 de instrução no prompt em garantia verificável, porque instrução explícita não impediu a violação.
SPEC-20260916-2048-semantica-next-action | done | pedagogia, dialogo | next-action, retry, coerencia, nucleo, hotel-10 | Define e valida a coerência entre emitir correção e pedir que o aluno a aplique, fechando a lacuna que nenhuma das 14 checagens de turno media.

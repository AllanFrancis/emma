# Programa: emma

**Owner:** @allan

- SPEC-20260916-0109-rubrica-e-eval-do-motor | depende de: —
- SPEC-20260916-1450-contrato-do-turno-v2 | depende de: SPEC-20260916-0109-rubrica-e-eval-do-motor
- SPEC-20260916-1652-eval-personalidade | depende de: SPEC-20260916-1450-contrato-do-turno-v2
- SPEC-20260916-1652-eval-conversa-multiturno | depende de: SPEC-20260916-1450-contrato-do-turno-v2
- SPEC-20260916-1652-nucleo-pedagogico | depende de: SPEC-20260916-1450-contrato-do-turno-v2, SPEC-20260916-1652-eval-conversa-multiturno
- SPEC-20260916-1652-motor-de-dialogo | depende de: SPEC-20260916-1652-nucleo-pedagogico
- SPEC-20260916-1652-camada-de-personalidade | depende de: SPEC-20260916-1652-motor-de-dialogo, SPEC-20260916-1652-eval-personalidade
- SPEC-20260916-1652-onboarding-e-perfil | depende de: SPEC-20260916-1652-nucleo-pedagogico
- SPEC-20260916-1652-diagnostico-inicial | depende de: SPEC-20260916-1652-motor-de-dialogo, SPEC-20260916-1652-onboarding-e-perfil
- SPEC-20260916-1652-conversa-e-missoes | depende de: SPEC-20260916-1652-camada-de-personalidade
- SPEC-20260916-1652-fecho-de-licao | depende de: SPEC-20260916-1652-conversa-e-missoes
- SPEC-20260916-1652-instrumentacao-minima | depende de: SPEC-20260916-1652-conversa-e-missoes

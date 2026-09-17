# Programa: emma

**Owner:** @allan

- SPEC-20260916-0109-rubrica-e-eval-do-motor | depende de: —
- SPEC-20260916-1450-contrato-do-turno-v2 | depende de: SPEC-20260916-0109-rubrica-e-eval-do-motor
- SPEC-20260916-1652-eval-personalidade | depende de: SPEC-20260916-1450-contrato-do-turno-v2
- SPEC-20260916-1652-eval-conversa-multiturno | depende de: SPEC-20260916-1450-contrato-do-turno-v2
- SPEC-20260916-2257-retencao-de-contexto-na-conversa | depende de: SPEC-20260916-1652-eval-conversa-multiturno
- SPEC-20260916-1652-nucleo-pedagogico | depende de: SPEC-20260916-1450-contrato-do-turno-v2, SPEC-20260916-1652-eval-conversa-multiturno
- SPEC-20260916-1652-motor-de-dialogo | depende de: SPEC-20260916-1652-nucleo-pedagogico
- SPEC-20260916-2048-metodologia-de-eval | depende de: SPEC-20260916-1652-eval-personalidade
- SPEC-20260917-1059-metodologia-de-repeticao | depende de: SPEC-20260916-2048-metodologia-de-eval
- SPEC-20260916-2048-tom-versus-pedagogia | depende de: SPEC-20260917-1059-metodologia-de-repeticao
- SPEC-20260916-2048-semantica-next-action | depende de: SPEC-20260916-1652-eval-personalidade
- SPEC-20260917-1259-contrato-de-correcoes | depende de: SPEC-20260916-2048-semantica-next-action
- SPEC-20260916-2048-regra-fala-transcrita | depende de: SPEC-20260916-1652-eval-personalidade
- SPEC-20260916-1652-camada-de-personalidade | depende de: SPEC-20260916-1652-motor-de-dialogo, SPEC-20260916-2048-tom-versus-pedagogia
- SPEC-20260916-1652-onboarding-e-perfil | depende de: SPEC-20260916-1652-nucleo-pedagogico
- SPEC-20260916-1652-diagnostico-inicial | depende de: SPEC-20260916-1652-motor-de-dialogo, SPEC-20260916-1652-onboarding-e-perfil
- SPEC-20260916-1652-conversa-e-missoes | depende de: SPEC-20260916-1652-motor-de-dialogo
- SPEC-20260916-1652-fecho-de-licao | depende de: SPEC-20260916-1652-conversa-e-missoes
- SPEC-20260916-1652-instrumentacao-minima | depende de: SPEC-20260916-1652-conversa-e-missoes

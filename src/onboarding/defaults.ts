/**
 * Defaults de `TeacherPreferences` que o onboarding NÃO pergunta
 * (SPEC-20260916-1652-onboarding-e-perfil).
 *
 * `TeacherPreferences` exige quatro campos e as seis perguntas contratadas cobrem dois:
 * `style` vem de `personalidade` e `supportLevel` vem de `audio`. Sobram `intensity` e
 * `speechRate`, e `preferenciasEfetivas` no núcleo exige o objeto COMPLETO — não há default
 * lá, e o merge de overrides pressupõe as persistentes inteiras.
 *
 * Decisão do usuário em 2026-09-17: adotar defaults, sem criar pergunta nova nesta SPEC.
 * "Esses defaults devem ficar explícitos e centralizados, não espalhados pelas telas ou
 * criados implicitamente durante a persistência."
 *
 * Este arquivo é esse lugar único. Nenhuma tela e nenhuma função de persistência inventa
 * valor para estes campos: quem precisa, importa daqui.
 *
 * Por que estes valores: são o MEIO de cada enum, que é o neutro defensável quando não há
 * pergunta. E `speechRate` só tem efeito no TTS, que é Fase 3 — na Fase 1 ele é inerte.
 *
 * Se um dia intensidade ou velocidade de fala virarem configuráveis no onboarding, isso é
 * evolução própria e não uma exceção enfiada aqui.
 */
import type { TeacherPreferences } from "../domain";

/** Campos de `TeacherPreferences` que o onboarding não pergunta. */
export const PREFERENCIAS_NAO_PERGUNTADAS = {
  intensity: "media",
  speechRate: "normal",
} as const satisfies Partial<TeacherPreferences>;

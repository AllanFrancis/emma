import { createFileRoute, redirect } from "@tanstack/react-router";

import { PERCURSO } from "../onboarding/questions";

/**
 * `/onboarding` não tem tela própria: manda para a primeira do percurso.
 *
 * Redirecionar em vez de renderizar mantém uma URL por tela, que é o que faz deep link e o
 * voltar do navegador funcionarem de graça.
 */
export const Route = createFileRoute("/onboarding/")({
  beforeLoad: () => {
    throw redirect({ to: "/onboarding/$tela", params: { tela: PERCURSO[0] } });
  },
});

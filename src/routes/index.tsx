import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blank Project" },
      { name: "description", content: "A clean blank canvas to start building." },
      { property: "og:title", content: "Blank Project" },
      { property: "og:description", content: "A clean blank canvas to start building." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Projeto em branco
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Comece a construir a partir deste canvas limpo.
        </p>
      </div>
    </main>
  );
}

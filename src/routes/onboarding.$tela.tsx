import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { MOMENTOS, NOTA_DE_NIVEL } from "../onboarding/momentos";
import type { Respostas } from "../onboarding/perfil";
import {
  PERCURSO,
  PERGUNTAS,
  progressoDa,
  telaSeguinte,
  type ChaveDePergunta,
  type TelaDoPercurso,
} from "../onboarding/questions";
import { concluirOnboarding, gravarResposta, lerRespostas } from "../onboarding/storage";

/**
 * Uma tela do onboarding, endereçada por rota (SPEC-20260916-1652-onboarding-e-perfil).
 *
 * O passo é PARÂMETRO DE ROTA, não índice em estado global. O protótipo usava índice, o que
 * custava deep link, voltar do navegador e retomada — três coisas que vêm de graça com
 * router, e que o contrato exige.
 */
export const Route = createFileRoute("/onboarding/$tela")({
  params: {
    parse: ({ tela }) => {
      if (!(PERCURSO as readonly string[]).includes(tela)) throw notFound();
      return { tela: tela as TelaDoPercurso };
    },
    stringify: ({ tela }) => ({ tela }),
  },
  component: TelaDeOnboarding,
});

function ehPergunta(tela: TelaDoPercurso): tela is ChaveDePergunta {
  return tela in PERGUNTAS;
}

function TelaDeOnboarding() {
  const { tela } = Route.useParams();
  const navigate = useNavigate();
  const [respostas, setRespostas] = useState<Respostas>({});

  // As respostas vivem no cliente. Ler no efeito, e não na renderização, mantém o HTML do
  // servidor igual ao da primeira renderização do cliente.
  useEffect(() => setRespostas(lerRespostas()), [tela]);

  const avancar = useCallback(() => {
    const proxima = telaSeguinte(tela);
    if (proxima) {
      void navigate({ to: "/onboarding/$tela", params: { tela: proxima } });
      return;
    }
    // Fim do percurso: monta e grava o perfil. O diagnóstico é de outra SPEC, então por ora
    // o destino é a raiz.
    concluirOnboarding();
    void navigate({ to: "/" });
  }, [navigate, tela]);

  const escolher = useCallback((chave: ChaveDePergunta, label: string) => {
    setRespostas(gravarResposta(chave, label));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-5 py-8">
      <BarraDeProgresso tela={tela} />
      {ehPergunta(tela) ? (
        <Pergunta
          chave={tela}
          escolhido={respostas[tela]}
          onEscolher={escolher}
          onAvancar={avancar}
        />
      ) : (
        <Momento tela={tela} onAvancar={avancar} />
      )}
    </main>
  );
}

function BarraDeProgresso({ tela }: { tela: TelaDoPercurso }) {
  const pct = Math.round(progressoDa(tela) * 100);
  const passo = PERCURSO.indexOf(tela) + 1;
  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Passo ${passo} de ${PERCURSO.length}`}
        className="h-1 w-full overflow-hidden rounded bg-muted"
      >
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        Passo {passo} de {PERCURSO.length}
      </p>
    </div>
  );
}

function Momento({ tela, onAvancar }: { tela: "entrada" | "promessa"; onAvancar: () => void }) {
  const m = MOMENTOS[tela];
  return (
    <div className="flex flex-1 flex-col justify-between gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{m.kicker}</p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
          {m.title}
        </h1>
        <p className="text-sm text-muted-foreground">{m.body}</p>
      </div>
      {/* Uma decisão principal por tela: aqui a decisão é seguir. */}
      <button
        type="button"
        onClick={onAvancar}
        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {m.cta}
      </button>
    </div>
  );
}

function Pergunta({
  chave,
  escolhido,
  onEscolher,
  onAvancar,
}: {
  chave: ChaveDePergunta;
  escolhido: string | undefined;
  onEscolher: (chave: ChaveDePergunta, label: string) => void;
  onAvancar: () => void;
}) {
  const q = PERGUNTAS[chave];
  const nome = `pergunta-${chave}`;
  return (
    <div className="flex flex-1 flex-col justify-between gap-8">
      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
          {q.prompt}
        </legend>
        {/* A autoavaliação é ponto de partida, nunca classificação — invariante do contrato. */}
        {chave === "nivel" ? (
          <p className="text-sm text-muted-foreground">{NOTA_DE_NIVEL}</p>
        ) : null}
        {q.note ? <p className="text-sm text-muted-foreground">{q.note}</p> : null}

        <div className="flex flex-col gap-2">
          {q.options.map((o) => {
            const marcado = escolhido === o.label;
            return (
              <label
                key={o.label}
                className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors ${
                  marcado ? "border-primary bg-primary/5" : "border-input hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name={nome}
                  value={o.label}
                  checked={marcado}
                  onChange={() => onEscolher(chave, o.label)}
                  className="mt-1 flex-none"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-base leading-tight text-foreground">{o.label}</span>
                  {o.sub ? (
                    <span className="text-[13px] text-muted-foreground">{o.sub}</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Ação clara de continuação, desabilitada até haver decisão. Sem microfone, sem
          áudio e sem permissão de navegador em nenhum ponto do percurso. */}
      <button
        type="button"
        onClick={onAvancar}
        disabled={!escolhido}
        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continuar
      </button>
    </div>
  );
}

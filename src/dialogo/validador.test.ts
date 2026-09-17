import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { criarValidador } from "./validador";

/** O schema REAL, da fonte única. Validar contra um schema de mentira não provaria nada. */
const SCHEMA = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dir, "..", "..", "scripts", "eval", "turn-schema.json"),
    "utf8",
  ),
) as Parameters<typeof criarValidador>[0];

const validador = criarValidador(SCHEMA);

const FALA = "I want a coffee please";

function turno(over: Record<string, unknown> = {}) {
  return {
    reply_en: "Nice choice! Small or large?",
    reply_pt: "Boa escolha! Pequeno ou grande?",
    instruction_pt: "Agora diga o tamanho.",
    corrections: [
      {
        original: "I want a coffee",
        suggested: "I'd like a coffee",
        explanation_pt: "Num pedido, 'I'd like' soa mais natural.",
        category: "register",
      },
    ],
    suggestion_en: "A small one, please.",
    suggestion_pt: "Um pequeno, por favor.",
    words: ["I'd like"],
    focus: "pedidos",
    next_action: "retry",
    ...over,
  };
}

describe("validação de schema contra a fonte única", () => {
  test("o schema carregado é o do contrato do turno", () => {
    expect(SCHEMA.schema.required).toContain("next_action");
    expect(SCHEMA.schema.required).toContain("corrections");
  });

  test("turno válido passa", () => {
    expect(validador.validarSchema(turno())).toEqual([]);
  });

  test("campo obrigatório ausente reprova", () => {
    const t: Record<string, unknown> = turno();
    delete t["reply_en"];
    expect(validador.validarSchema(t).join(" ")).toContain("reply_en");
  });

  test("campo desconhecido reprova (additionalProperties: false)", () => {
    expect(validador.validarSchema(turno({ extra: true })).join(" ")).toContain("extra");
  });

  test("tipo errado reprova", () => {
    expect(validador.validarSchema(turno({ words: "coffee" })).join(" ")).toContain("words");
  });

  test("next_action fora do enum reprova", () => {
    expect(validador.validarSchema(turno({ next_action: "advance" })).join(" ")).toContain(
      "next_action",
    );
  });

  test("teto de 3 correções é respeitado", () => {
    const quatro = Array.from({ length: 4 }, () => turno().corrections[0]);
    expect(validador.validarSchema(turno({ corrections: quatro })).join(" ")).toContain("teto");
  });

  test("teto de 3 words é respeitado", () => {
    expect(validador.validarSchema(turno({ words: ["a", "b", "c", "d"] })).join(" ")).toContain(
      "teto",
    );
  });

  test("category fora do enum reprova dentro do item de correção", () => {
    const t = turno({
      corrections: [{ ...turno().corrections[0]!, category: "inventada" }],
    });
    expect(validador.validarSchema(t).join(" ")).toContain("category");
  });

  test("contrato v1 (correction_pt) não passa mais", () => {
    expect(validador.validarSchema(turno({ correction_pt: "..." })).join(" ")).toContain(
      "correction_pt",
    );
  });
});

describe("validação de evidência citada", () => {
  test("original que ocorre na fala passa", () => {
    expect(validador.validarEvidencia(turno(), FALA)).toEqual([]);
  });

  test("original que NÃO ocorre na fala reprova", () => {
    const t = turno({
      corrections: [{ ...turno().corrections[0]!, original: "eu nunca disse isso" }],
    });
    expect(validador.validarEvidencia(t, FALA).join(" ")).toContain("nao ocorre na fala");
  });

  test("ignora caixa, porque a entrada é fala transcrita", () => {
    // DEC-20260916-0312: maiúscula não existe na fala, então exigir caixa idêntica
    // reprovaria correção legítima.
    const t = turno({
      corrections: [{ ...turno().corrections[0]!, original: "i WANT a Coffee" }],
    });
    expect(validador.validarEvidencia(t, FALA)).toEqual([]);
  });

  test("original vazio reprova", () => {
    const t = turno({ corrections: [{ ...turno().corrections[0]!, original: "  " }] });
    expect(validador.validarEvidencia(t, FALA).join(" ")).toContain("vazio");
  });

  test("sem correção não há evidência a conferir", () => {
    expect(validador.validarEvidencia(turno({ corrections: [] }), FALA)).toEqual([]);
  });
});

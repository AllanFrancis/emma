import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// `fileURLToPath` e nao `new URL(...).pathname`: o caminho deste repo tem espaco, e o
// pathname devolve `%20`, que o `fs` nao resolve.
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("o tipo do turno deriva do schema, sem segunda definicao do contrato", () => {
  test("o arquivo gerado esta em dia com o turn-schema.json", () => {
    // `--check` regenera em memoria e compara. Mudar o schema sem rodar o gerador reprova
    // aqui — e é o que impede o dual-write de nascer sem ninguem notar.
    const saida = execFileSync(process.execPath, ["scripts/gen-turn-types.mjs", "--check"], {
      cwd: RAIZ,
      encoding: "utf8",
    });
    expect(saida).toContain("em dia com o turn-schema.json");
  });

  test("o arquivo gerado se declara gerado, para ninguem editar a mao", () => {
    const gerado = fs.readFileSync(
      path.join(RAIZ, "src", "domain", "turn-contract.generated.ts"),
      "utf8",
    );
    expect(gerado).toContain("GERADO por scripts/gen-turn-types.mjs");
    expect(gerado).toContain("NAO EDITAR A MAO");
  });

  test("nenhum arquivo do dominio redefine os campos do turno a mao", () => {
    const dir = path.join(RAIZ, "src", "domain");
    const camposDoTurno = ["reply_en", "reply_pt", "instruction_pt", "suggestion_en"];
    const arquivos = fs
      .readdirSync(dir)
      .filter(
        (n) => n.endsWith(".ts") && !n.endsWith(".test.ts") && n !== "turn-contract.generated.ts",
      );
    for (const arquivo of arquivos) {
      const conteudo = fs.readFileSync(path.join(dir, arquivo), "utf8");
      for (const campo of camposDoTurno) {
        // Declaracao de campo (`reply_en:`) é dual-write; mencionar o nome em comentario, não.
        const declaracao = new RegExp(`^\\s*(readonly\\s+)?${campo}\\??:`, "m");
        expect(declaracao.test(conteudo), `${arquivo} redeclara ${campo}`).toBe(false);
      }
    }
  });

  test("os enums do tipo gerado batem com os enums do schema", () => {
    const schema = JSON.parse(
      fs.readFileSync(path.join(RAIZ, "scripts", "eval", "turn-schema.json"), "utf8"),
    );
    const gerado = fs.readFileSync(
      path.join(RAIZ, "src", "domain", "turn-contract.generated.ts"),
      "utf8",
    );
    const props = schema.schema.properties;
    for (const valor of props.next_action.enum) {
      expect(gerado).toContain(`"${valor}"`);
    }
    for (const valor of props.corrections.items.properties.category.enum) {
      expect(gerado).toContain(`"${valor}"`);
    }
  });

  test("o teto de 3 do schema tem regra executavel no nucleo", () => {
    // `maxItems` nao e expressavel em tipo TypeScript, entao a garantia e de runtime.
    const schema = JSON.parse(
      fs.readFileSync(path.join(RAIZ, "scripts", "eval", "turn-schema.json"), "utf8"),
    );
    const politica = fs.readFileSync(
      path.join(RAIZ, "src", "domain", "correction-policy.ts"),
      "utf8",
    );
    expect(schema.schema.properties.corrections.maxItems).toBe(3);
    expect(politica).toContain("export const MAX_CORRECTIONS = 3;");
  });
});

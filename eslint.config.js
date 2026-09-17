import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `.scratch` e `.tanstack` guardam artefato descartavel e gerado — inclusive bundles
  // de terceiros com megabytes de JS minificado. O eslint nao le o .gitignore sozinho, e
  // sem estas entradas o `eslint .` tenta formatar esses arquivos e trava a rodada.
  // `turn-contract.generated.ts` entra na mesma lista dos gerados: o `--check` do gerador
  // compara byte a byte com a saida dele, e o prettier reformatando o arquivo faria o teste
  // de dual-write reprovar por formatacao em vez de por divergencia de contrato.
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      ".scratch",
      ".tanstack",
      "src/routeTree.gen.ts",
      "src/domain/turn-contract.generated.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintPluginPrettier,
);

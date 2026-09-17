#!/usr/bin/env node
// Gera os tipos TypeScript do contrato do turno A PARTIR de scripts/eval/turn-schema.json.
//
// Existe para cumprir a invariante "SEMPRE o tipo do turno deriva do turn-schema.json;
// duas definicoes do mesmo contrato e dual-write" (SPEC-20260916-1652-nucleo-pedagogico).
// Escrever os tipos a mao ao lado do schema seria manter dois contratos que divergem no
// primeiro campo novo — e o schema e consumido pelo strict mode do Groq, entao ele e a
// fonte, nao o TypeScript.
//
// Uso:
//   node scripts/gen-turn-types.mjs            escreve o arquivo
//   node scripts/gen-turn-types.mjs --check    falha se o arquivo estiver desatualizado
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = path.join(RAIZ, "scripts", "eval", "turn-schema.json");
const DESTINO = path.join(RAIZ, "src", "domain", "turn-contract.generated.ts");

const INDENT = "  ";

function nomeDoTipo(chave) {
  // corrections -> Correction (o item do array e que ganha nome proprio)
  const singular = chave.endsWith("s") ? chave.slice(0, -1) : chave;
  return singular.replace(/(^|_)([a-z])/g, (_m, _s, letra) => letra.toUpperCase());
}

function comentario(descricao, nivel) {
  if (!descricao) return "";
  const prefixo = INDENT.repeat(nivel);
  // A descricao do schema E a documentacao do campo: repeti-la em JSDoc a mao seria a
  // mesma duplicacao que este gerador existe para evitar.
  const linhas = [];
  let atual = "";
  for (const palavra of descricao.split(/\s+/)) {
    if ((atual + " " + palavra).trim().length > 92) {
      linhas.push(atual.trim());
      atual = palavra;
    } else {
      atual = `${atual} ${palavra}`;
    }
  }
  if (atual.trim() !== "") linhas.push(atual.trim());
  return [`${prefixo}/**`, ...linhas.map((l) => `${prefixo} * ${l}`), `${prefixo} */`, ""].join(
    "\n",
  );
}

const tiposAuxiliares = [];

function tipoDe(chave, definicao, nivel) {
  if (Array.isArray(definicao.enum)) {
    const nome = nomeDoTipo(chave);
    tiposAuxiliares.push(
      `${comentario(definicao.description, 0)}export type ${nome} = ${definicao.enum
        .map((v) => JSON.stringify(v))
        .join(" | ")};`,
    );
    return nome;
  }
  if (definicao.type === "array") {
    const item = definicao.items ?? {};
    if (item.type === "object") {
      const nome = nomeDoTipo(chave);
      tiposAuxiliares.push(objetoParaInterface(nome, item, item.description));
      return `readonly ${nome}[]`;
    }
    return `readonly ${tipoDe(chave, item, nivel)}[]`;
  }
  if (definicao.type === "object") {
    const nome = nomeDoTipo(chave);
    tiposAuxiliares.push(objetoParaInterface(nome, definicao, definicao.description));
    return nome;
  }
  if (definicao.type === "string") return "string";
  if (definicao.type === "integer" || definicao.type === "number") return "number";
  if (definicao.type === "boolean") return "boolean";
  throw new Error(`tipo nao suportado pelo gerador em '${chave}': ${JSON.stringify(definicao)}`);
}

function objetoParaInterface(nome, definicao, descricao) {
  const obrigatorios = new Set(definicao.required ?? []);
  const campos = Object.entries(definicao.properties ?? {}).map(([chave, sub]) => {
    const opcional = obrigatorios.has(chave) ? "" : "?";
    const tipo = tipoDe(chave, sub, 1);
    return `${comentario(sub.description, 1)}${INDENT}readonly ${chave}${opcional}: ${tipo};`;
  });
  return `${comentario(descricao, 0)}export interface ${nome} {\n${campos.join("\n")}\n}`;
}

function gerar() {
  const documento = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));
  const schema = documento.schema ?? documento;
  tiposAuxiliares.length = 0;
  const principal = objetoParaInterface("TurnOutput", schema, undefined);
  const cabecalho = [
    "// GERADO por scripts/gen-turn-types.mjs a partir de scripts/eval/turn-schema.json.",
    "// NAO EDITAR A MAO: edite o schema e rode `bun run gen:turn-types`.",
    "// O schema e a fonte porque e ele que o strict mode do Groq consome.",
    `// Contrato: ${documento.name ?? "turno"}${documento.strict ? " (strict)" : ""}`,
    "",
  ].join("\n");
  const corpo = [...tiposAuxiliares, principal].join("\n\n");
  return `${cabecalho}${corpo}\n`;
}

const conteudo = gerar();

if (process.argv.includes("--check")) {
  const atual = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, "utf8") : "";
  if (atual !== conteudo) {
    console.error(
      "turn-contract.generated.ts esta DESATUALIZADO em relacao ao turn-schema.json.\n" +
        "rode: bun run gen:turn-types",
    );
    process.exitCode = 1;
  } else {
    console.log("turn-contract.generated.ts em dia com o turn-schema.json");
  }
} else {
  fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
  fs.writeFileSync(DESTINO, conteudo);
  console.log(`gerado: ${path.relative(RAIZ, DESTINO)}`);
}

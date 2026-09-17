/**
 * Invariantes de fronteira de confiança, verificadas por INSPEÇÃO (task 6.0).
 *
 * Decisão do usuário em 2026-09-17: "a proteção da chave/API e demais fronteiras de confiança
 * devem ser verificadas por testes/inspeção, não por gate humano adicional."
 *
 * Então elas moram aqui, e falham a suíte. Nenhuma delas depende de alguém lembrar de olhar.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dir, "..", "..");
const DOMINIO = path.join(RAIZ, "src", "domain");
const DIST_CLIENTE = path.join(RAIZ, "dist", "client");

function arquivosDeCodigo(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const saida: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) saida.push(...arquivosDeCodigo(p));
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) saida.push(p);
  }
  return saida;
}

function arquivosDoBundle(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const saida: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) saida.push(...arquivosDoBundle(p));
    else if (/\.(js|mjs|html|css|map)$/.test(e.name)) saida.push(p);
  }
  return saida;
}

/** Garante que o bundle do cliente existe, construindo se preciso. */
function garantirBundleDoCliente(): string[] {
  let arquivos = arquivosDoBundle(DIST_CLIENTE);
  if (arquivos.length > 0) return arquivos;
  const r = Bun.spawnSync(["bun", "run", "build"], { cwd: RAIZ, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) {
    throw new Error(`build falhou, impossivel inspecionar o bundle:\n${r.stderr.toString()}`);
  }
  arquivos = arquivosDoBundle(DIST_CLIENTE);
  if (arquivos.length === 0) throw new Error(`build nao produziu nada em ${DIST_CLIENTE}`);
  return arquivos;
}

describe("o nucleo pedagogico nao conhece rede nem provedor", () => {
  test("nenhum arquivo de src/domain/ importa rede, adapter ou o motor", () => {
    // Invariante do proprio nucleo: "nada neste modulo faz rede, conhece provedor de LLM ou
    // importa de scripts/eval/". Se alguem quebrar isso, a troca de provedor deixa de ser
    // isolada e a politica pedagogica passa a depender de infraestrutura.
    const proibidos = [
      /from\s+["'][^"']*\/dialogo\//,
      /from\s+["']\.\.\/dialogo/,
      /\bfetch\s*\(/,
      /from\s+["']node:https?["']/,
      /from\s+["']axios["']/,
      /GROQ_API_KEY/,
      /api\.groq\.com/,
    ];
    const violacoes: string[] = [];
    for (const arquivo of arquivosDeCodigo(DOMINIO)) {
      const conteudo = fs.readFileSync(arquivo, "utf8");
      for (const padrao of proibidos) {
        if (padrao.test(conteudo)) {
          violacoes.push(`${path.relative(RAIZ, arquivo)} casa ${padrao}`);
        }
      }
    }
    expect(violacoes).toEqual([]);
  });

  test("src/domain/ tem codigo de verdade — o teste acima nao passa por pasta vazia", () => {
    // Sem isto, apagar src/domain/ faria a invariante acima "passar".
    expect(arquivosDeCodigo(DOMINIO).length).toBeGreaterThan(5);
  });
});

describe("a chave de API nao chega ao bundle do cliente", () => {
  const arquivos = garantirBundleDoCliente();

  test("o bundle do cliente existe e foi inspecionado", () => {
    expect(arquivos.length).toBeGreaterThan(0);
  });

  test("nenhum artefato do cliente menciona GROQ_API_KEY", () => {
    // Nem o VALOR nem o NOME da variavel: o nome vazando ja indica que a leitura do ambiente
    // foi parar do lado errado da fronteira.
    const vazando = arquivos.filter((f) => fs.readFileSync(f, "utf8").includes("GROQ_API_KEY"));
    expect(vazando.map((f) => path.relative(RAIZ, f))).toEqual([]);
  });

  test("nenhum artefato do cliente carrega o endpoint do provedor", () => {
    // O cliente nao tem por que conhecer o endereco do provedor. Se conhece, alguem importou
    // o adapter de um caminho alcancavel pelo cliente.
    const vazando = arquivos.filter((f) => fs.readFileSync(f, "utf8").includes("api.groq.com"));
    expect(vazando.map((f) => path.relative(RAIZ, f))).toEqual([]);
  });

  test("nenhum artefato do cliente traz algo com forma de chave da Groq", () => {
    // Chaves da Groq comecam com `gsk_`. Este teste pega o caso de alguem ter colado uma
    // chave literal no codigo, que a checagem por nome de variavel nao pegaria.
    const vazando = arquivos.filter((f) => /gsk_[A-Za-z0-9]{10,}/.test(fs.readFileSync(f, "utf8")));
    expect(vazando.map((f) => path.relative(RAIZ, f))).toEqual([]);
  });
});

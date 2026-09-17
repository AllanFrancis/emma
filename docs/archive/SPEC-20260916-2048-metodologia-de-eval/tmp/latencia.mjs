// Descartavel: mede a latencia REAL gravada nas evidencias arquivadas para derivar o
// timeout do custo medido, em vez de arbitrar um numero.
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve("docs/archive");
const amostras = [];

function varrer(dir) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) varrer(p);
    else if (entrada.name.endsWith(".json")) {
      try {
        const j = JSON.parse(fs.readFileSync(p, "utf8"));
        const u = j?.resposta?.usage;
        if (!u || typeof u.total_time !== "number") continue;
        amostras.push({
          arquivo: path.relative(raiz, p),
          queue: u.queue_time ?? 0,
          total: u.total_time,
          parede: (u.queue_time ?? 0) + u.total_time,
          tokens: u.total_tokens ?? 0,
          completion: u.completion_tokens ?? 0,
        });
      } catch {
        /* ignora */
      }
    }
  }
}

varrer(raiz);
amostras.sort((a, b) => a.parede - b.parede);
const q = (p) => amostras[Math.min(amostras.length - 1, Math.floor(amostras.length * p))].parede;
const soma = (k) => amostras.reduce((acc, a) => acc + a[k], 0);

console.log(`amostras com usage: ${amostras.length}`);
console.log(`tokens/turno  media: ${(soma("tokens") / amostras.length).toFixed(0)}`);
console.log(`completion    media: ${(soma("completion") / amostras.length).toFixed(0)}`);
console.log(`parede (queue+total) em segundos:`);
console.log(`  p50 ${q(0.5).toFixed(2)} · p90 ${q(0.9).toFixed(2)} · p99 ${q(0.99).toFixed(2)}`);
console.log(`  max ${amostras.at(-1).parede.toFixed(2)}  (${amostras.at(-1).arquivo})`);
const tokensMax = Math.max(...amostras.map((a) => a.tokens));
const throughput = amostras.map((a) => a.completion / a.total).sort((x, y) => x - y);
console.log(`tokens max em um turno: ${tokensMax}`);
console.log(
  `throughput de completion (tok/s): p1 ${throughput[Math.floor(throughput.length * 0.01)].toFixed(0)} · p50 ${throughput[Math.floor(throughput.length * 0.5)].toFixed(0)}`,
);

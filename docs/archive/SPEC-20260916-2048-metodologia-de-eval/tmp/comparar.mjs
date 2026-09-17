// Descartavel: compara duas repeticoes da MESMA condicao, com os parametros fixados, e
// reporta a dispersao residual. Criterio 6 da SPEC-20260916-2048-metodologia-de-eval.
import fs from "node:fs";
import path from "node:path";

const base = "docs/active/SPEC-20260916-2048-metodologia-de-eval/evidence/openai_gpt-oss-20b";
const ler = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const turno = (e) => JSON.parse(e.resposta.choices[0].message.content);

const pares = fs
  .readdirSync(path.join(base, "repeticao-1"))
  .filter((n) => n.endsWith(".json"))
  .filter((n) => fs.existsSync(path.join(base, "repeticao-2", n)));

if (pares.length === 0) {
  console.log("nenhuma fala presente nas DUAS repeticoes — nada a comparar.");
  process.exitCode = 1;
}

for (const nome of pares) {
  const a = ler(path.join(base, "repeticao-1", nome));
  const b = ler(path.join(base, "repeticao-2", nome));
  const ta = turno(a);
  const tb = turno(b);

  console.log(`\n=== ${nome} ===`);
  console.log("amostragem pedida  r1:", JSON.stringify(a.amostragem));
  console.log("amostragem pedida  r2:", JSON.stringify(b.amostragem));

  const campos = Object.keys(ta);
  const divergentes = campos.filter((c) => JSON.stringify(ta[c]) !== JSON.stringify(tb[c]));

  console.log(`campos do turno: ${campos.length} · divergentes: ${divergentes.length}`);
  if (divergentes.length === 0) {
    console.log("SAIDA IDENTICA campo a campo.");
  } else {
    for (const campo of divergentes) {
      console.log(`  ~ ${campo}`);
      console.log(`      r1: ${JSON.stringify(ta[campo])}`);
      console.log(`      r2: ${JSON.stringify(tb[campo])}`);
    }
  }

  const ua = a.resposta.usage;
  const ub = b.resposta.usage;
  console.log(
    `tokens r1=${ua.total_tokens} r2=${ub.total_tokens} · completion r1=${ua.completion_tokens} r2=${ub.completion_tokens}`,
  );
  console.log(
    `fingerprint r1=${a.resposta.system_fingerprint} r2=${b.resposta.system_fingerprint} · igual=${a.resposta.system_fingerprint === b.resposta.system_fingerprint}`,
  );
  console.log(
    `seed efetivo r1=${a.amostragem?.seed_efetivo} r2=${b.amostragem?.seed_efetivo} · igual=${a.amostragem?.seed_efetivo === b.amostragem?.seed_efetivo}`,
  );
}

#!/usr/bin/env node
// Validacao estrutural do dataset e do schema do turno. Nao gasta chamada de API.
//   node scripts/eval/validate.mjs            -> valida dataset.jsonl
//   node scripts/eval/validate.mjs --schema   -> valida turn-schema.json
//   node scripts/eval/validate.mjs --all      -> ambos
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATASET = path.join(HERE, 'dataset.jsonl');
const SCHEMA = path.join(HERE, 'turn-schema.json');

const CONTEXTOS = new Set(['cafe', 'hotel', 'small-talk', 'livre']);
const TIPOS_ERRO = new Set(['gramatical', 'interferencia', 'pragmatico', 'lexical', 'multiplo', 'nenhum']);
const CRITERIOS = new Set(['vocabulario', 'gramatica', 'construcao', 'compreensao', 'sustentacao']);
const CAMPOS = ['id', 'contexto', 'aluno', 'nivel_esperado', 'criterios_observaveis', 'deve_corrigir', 'nao_deve_corrigir', 'tipo_erro', 'nota'];
const MINIMO = 40;
const TETO_CORRECOES = 3; // regra do contrato: no maximo 3 pontos por turno

const erros = [];
const avisos = [];

function validarDataset() {
  const linhas = fs.readFileSync(DATASET, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
  const vistos = new Set();
  const porContexto = {};
  let semCorrecao = 0;

  linhas.forEach((linha, i) => {
    const n = i + 1;
    let r;
    try {
      r = JSON.parse(linha);
    } catch (e) {
      erros.push(`linha ${n}: JSON invalido — ${e.message}`);
      return;
    }

    for (const campo of CAMPOS) {
      if (!(campo in r)) erros.push(`linha ${n}: falta o campo '${campo}'`);
    }
    for (const campo of Object.keys(r)) {
      if (!CAMPOS.includes(campo)) erros.push(`linha ${n}: campo desconhecido '${campo}'`);
    }

    if (vistos.has(r.id)) erros.push(`linha ${n}: id duplicado '${r.id}'`);
    vistos.add(r.id);

    if (!CONTEXTOS.has(r.contexto)) {
      erros.push(`linha ${n}: contexto '${r.contexto}' fora de {${[...CONTEXTOS].join(', ')}}`);
    } else {
      porContexto[r.contexto] = (porContexto[r.contexto] || 0) + 1;
    }

    if (!TIPOS_ERRO.has(r.tipo_erro)) {
      erros.push(`linha ${n}: tipo_erro '${r.tipo_erro}' fora de {${[...TIPOS_ERRO].join(', ')}}`);
    }

    if (!Number.isInteger(r.nivel_esperado) || r.nivel_esperado < 1 || r.nivel_esperado > 5) {
      erros.push(`linha ${n}: nivel_esperado deve ser inteiro de 1 a 5 (recebido: ${r.nivel_esperado})`);
    }

    if (typeof r.aluno !== 'string' || r.aluno.trim() === '') {
      erros.push(`linha ${n}: 'aluno' vazio`);
    }

    const co = r.criterios_observaveis;
    if (typeof co !== 'object' || co === null || Array.isArray(co)) {
      erros.push(`linha ${n}: criterios_observaveis deve ser objeto`);
    } else {
      if (Object.keys(co).length === 0) erros.push(`linha ${n}: criterios_observaveis vazio — toda fala evidencia ao menos um criterio`);
      for (const [k, v] of Object.entries(co)) {
        if (!CRITERIOS.has(k)) erros.push(`linha ${n}: criterio desconhecido '${k}'`);
        if (!Number.isInteger(v) || v < 1 || v > 5) erros.push(`linha ${n}: criterio '${k}' deve ser inteiro de 1 a 5 (recebido: ${v})`);
      }
    }

    for (const campo of ['deve_corrigir', 'nao_deve_corrigir']) {
      if (!Array.isArray(r[campo])) {
        erros.push(`linha ${n}: '${campo}' deve ser array`);
      } else if (r[campo].some((x) => typeof x !== 'string')) {
        erros.push(`linha ${n}: '${campo}' deve conter apenas strings`);
      }
    }

    if (Array.isArray(r.deve_corrigir)) {
      if (r.deve_corrigir.length > TETO_CORRECOES) {
        erros.push(`linha ${n}: deve_corrigir tem ${r.deve_corrigir.length} itens — o contrato limita a ${TETO_CORRECOES} por turno`);
      }
      if (r.deve_corrigir.length === 0) semCorrecao++;
    }

    // Coerencia: nada a corrigir mas tipo_erro diz que ha erro, e vice-versa.
    if (Array.isArray(r.deve_corrigir)) {
      if (r.deve_corrigir.length === 0 && r.tipo_erro !== 'nenhum') {
        erros.push(`linha ${n}: deve_corrigir vazio mas tipo_erro='${r.tipo_erro}' — incoerente`);
      }
      if (r.deve_corrigir.length > 0 && r.tipo_erro === 'nenhum') {
        erros.push(`linha ${n}: ha correcoes previstas mas tipo_erro='nenhum' — incoerente`);
      }
    }
  });

  if (linhas.length < MINIMO) {
    erros.push(`dataset tem ${linhas.length} falas — o criterio de aceite exige ao menos ${MINIMO}`);
  }

  // O dataset so mede sobre-correcao se tiver casos que NAO devem ser corrigidos.
  const pctControle = linhas.length ? (semCorrecao / linhas.length) * 100 : 0;
  if (pctControle < 20) {
    avisos.push(`apenas ${pctControle.toFixed(0)}% das falas sao casos de controle (sem correcao) — abaixo de 20%, o eval mede mal a sobre-correcao`);
  }

  for (const ctx of CONTEXTOS) {
    if (!porContexto[ctx]) avisos.push(`nenhuma fala no contexto '${ctx}'`);
  }

  console.log(`dataset: ${linhas.length} falas · ${semCorrecao} casos de controle (${pctControle.toFixed(0)}%)`);
  console.log(`  por contexto: ${Object.entries(porContexto).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
}

function validarSchema() {
  let s;
  try {
    s = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));
  } catch (e) {
    erros.push(`turn-schema.json: JSON invalido — ${e.message}`);
    return;
  }

  if (s.strict !== true) erros.push(`turn-schema.json: 'strict' deve ser true`);
  if (!s.name) erros.push(`turn-schema.json: falta 'name'`);

  const sc = s.schema;
  if (!sc) {
    erros.push(`turn-schema.json: falta 'schema'`);
    return;
  }
  if (sc.additionalProperties !== false) {
    erros.push(`turn-schema.json: additionalProperties deve ser false (exigido pelo strict mode)`);
  }

  const props = Object.keys(sc.properties || {});
  const req = sc.required || [];
  const ESPERADOS = ['reply_en', 'reply_pt', 'instruction_pt', 'correction_pt', 'suggestion_en', 'suggestion_pt', 'words', 'focus'];

  for (const campo of ESPERADOS) {
    if (!props.includes(campo)) erros.push(`turn-schema.json: falta a propriedade '${campo}'`);
    if (!req.includes(campo)) erros.push(`turn-schema.json: '${campo}' deveria ser required`);
  }
  for (const campo of props) {
    if (!ESPERADOS.includes(campo)) erros.push(`turn-schema.json: propriedade inesperada '${campo}'`);
  }
  for (const campo of req) {
    if (!props.includes(campo)) erros.push(`turn-schema.json: '${campo}' em required sem propriedade correspondente`);
  }

  console.log(`turn-schema: ${props.length} campos · strict=${s.strict} · additionalProperties=${sc.additionalProperties}`);
}

const args = process.argv.slice(2);
const soSchema = args.includes('--schema');
const tudo = args.includes('--all');

if (soSchema || tudo) validarSchema();
if (!soSchema || tudo) validarDataset();

console.log('');
for (const a of avisos) console.log(`AVISO  ${a}`);
for (const e of erros) console.log(`ERRO   ${e}`);
console.log(`\nvalidate: ${erros.length} erro(s), ${avisos.length} aviso(s)`);
process.exit(erros.length > 0 ? 1 : 0);

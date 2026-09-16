#!/usr/bin/env node
// Checagens mecanicas dos 9 criterios de qualidade de conversa + tabela comparativa.
//
//   node scripts/eval/grade.mjs --self-test    valida as checagens contra fixtures conhecidas
//   node scripts/eval/grade.mjs                aplica as checagens as evidencias gravadas
//
// METADE DOS 9 CRITERIOS NAO E MECANIZAVEL. Este script cobre a metade que e; o resto
// vai para julgamento humano no relatorio. Um modelo aprovado aqui NAO esta aprovado —
// esta apenas elegivel para a leitura humana.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '..', '..');
const DATASET = path.join(HERE, 'dataset.jsonl');

// Faixa de palavras da fala principal por nivel do aluno — proxy de "adapta a dificuldade".
const TETO_PALAVRAS = { 1: 15, 2: 18, 3: 26, 4: 36, 5: 48 };
// Metalinguagem na fala EM INGLES denuncia aula de gramatica no lugar de conversa.
const METALINGUAGEM = /\b(grammar|grammatical|mistake|error|correction|conjugat|tense|verb form)\b/i;
const MARCAS_PT = /[áàâãéêíóôõúç]|\b(voce|você|em vez de|diga|agora|porque|quando|isso|para)\b/i;

const CHECAGENS = [
  {
    id: 'C1',
    nome: 'contrato: 8 campos presentes',
    criterio: 'base — sem isso nada mais e mensuravel',
    fn: (t) => ['reply_en', 'reply_pt', 'instruction_pt', 'correction_pt', 'suggestion_en', 'suggestion_pt', 'words', 'focus'].every((k) => k in t),
  },
  {
    id: 'C2',
    nome: 'termina com pergunta',
    criterio: 'faz a pessoa continuar falando ingles',
    fn: (t) => typeof t.reply_en === 'string' && t.reply_en.trim().endsWith('?'),
  },
  {
    id: 'C3',
    nome: 'teto de 3 correcoes',
    criterio: 'corrige somente o que importa',
    fn: (t) => contarCorrecoes(t.correction_pt) <= 3,
  },
  {
    id: 'C4',
    nome: 'nao corrige caso de controle',
    criterio: 'nao vira aula de gramatica',
    fn: (t, r) => (r.tipo_erro !== 'nenhum' ? null : (t.correction_pt || '').trim() === ''),
  },
  {
    id: 'C5',
    nome: 'corrige quando ha o que corrigir',
    criterio: 'ensina de fato',
    fn: (t, r) => (r.deve_corrigir.length === 0 ? null : (t.correction_pt || '').trim() !== ''),
  },
  {
    id: 'C6',
    nome: 'instrucao presente',
    criterio: 'diz o que fazer agora',
    fn: (t) => typeof t.instruction_pt === 'string' && t.instruction_pt.trim() !== '',
  },
  {
    id: 'C7',
    nome: 'instrucao em portugues',
    criterio: 'explica em portugues quando necessario',
    fn: (t) => MARCAS_PT.test(t.instruction_pt || ''),
  },
  {
    id: 'C8',
    nome: 'comprimento compativel com o nivel',
    criterio: 'adapta a dificuldade',
    fn: (t, r) => contarPalavras(t.reply_en) <= TETO_PALAVRAS[r.nivel_esperado],
  },
  {
    id: 'C9',
    nome: 'sem metalinguagem na fala em ingles',
    criterio: 'ensina sem soar artificial',
    fn: (t) => !METALINGUAGEM.test(t.reply_en || ''),
  },
  {
    id: 'C10',
    nome: 'oferece resposta modelo',
    criterio: 'destrava quem nao sabe o que dizer',
    fn: (t) => typeof t.suggestion_en === 'string' && t.suggestion_en.trim() !== '',
  },
];

const contarPalavras = (s) => (typeof s === 'string' ? s.trim().split(/\s+/).filter(Boolean).length : 0);

function contarCorrecoes(c) {
  if (typeof c !== 'string' || c.trim() === '') return 0;
  const marcas = c.match(/em vez de/gi);
  return marcas ? marcas.length : 1;
}

function avaliar(turno, registro) {
  const res = {};
  for (const c of CHECAGENS) {
    let v;
    try {
      v = c.fn(turno, registro);
    } catch {
      v = false;
    }
    res[c.id] = v; // true | false | null (nao se aplica)
  }
  return res;
}

function carregarDataset() {
  const m = new Map();
  fs.readFileSync(DATASET, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .forEach((l) => {
      const r = JSON.parse(l);
      m.set(r.id, r);
    });
  return m;
}

// ----------------------------- self-test -----------------------------

function selfTest() {
  const registroComErro = { id: 'fx1', tipo_erro: 'gramatical', deve_corrigir: ['x'], nivel_esperado: 2 };
  const registroControle = { id: 'fx2', tipo_erro: 'nenhum', deve_corrigir: [], nivel_esperado: 3 };

  const turnoBom = {
    reply_en: 'Nice choice! Small or large?',
    reply_pt: 'Boa escolha! Pequeno ou grande?',
    instruction_pt: 'Agora diga o tamanho que você quer.',
    correction_pt: 'Em vez de "I want a coffee", diga "I\'d like a coffee" — soa mais natural.',
    suggestion_en: 'A small one, please.',
    suggestion_pt: 'Um pequeno, por favor.',
    words: ["I'd like"],
    focus: 'pedidos com I\'d like',
  };

  const turnoRuim = {
    reply_en: 'Your grammar has a mistake in the verb tense, you should study the correction carefully because this is a common error among learners and it matters.',
    reply_pt: '',
    instruction_pt: '',
    correction_pt: 'Em vez de A, diga B. Em vez de C, diga D. Em vez de E, diga F. Em vez de G, diga H.',
    suggestion_en: '',
    suggestion_pt: '',
    words: [],
    focus: '',
  };

  const turnoSobreCorrige = { ...turnoBom, correction_pt: 'Em vez de "X", diga "Y" — motivo.' };

  const casos = [
    { nome: 'turno bom x registro com erro', turno: turnoBom, registro: registroComErro, esperado: { C1: true, C2: true, C3: true, C4: null, C5: true, C6: true, C7: true, C8: true, C9: true, C10: true } },
    { nome: 'turno ruim x registro com erro', turno: turnoRuim, registro: registroComErro, esperado: { C1: true, C2: false, C3: false, C4: null, C5: true, C6: false, C7: false, C8: false, C9: false, C10: false } },
    { nome: 'sobre-correcao em caso de controle', turno: turnoSobreCorrige, registro: registroControle, esperado: { C4: false } },
    { nome: 'turno bom em caso de controle nao corrige', turno: { ...turnoBom, correction_pt: '' }, registro: registroControle, esperado: { C4: true, C5: null } },
    { nome: 'campo faltando quebra o contrato', turno: { reply_en: 'Hi?' }, registro: registroComErro, esperado: { C1: false } },
  ];

  let falhas = 0;
  for (const caso of casos) {
    const got = avaliar(caso.turno, caso.registro);
    for (const [k, esperado] of Object.entries(caso.esperado)) {
      const ok = got[k] === esperado;
      if (!ok) {
        falhas++;
        console.log(`FALHA  ${caso.nome} · ${k}: esperado ${esperado}, obtido ${got[k]}`);
      }
    }
  }

  console.log(`\nself-test: ${casos.length} casos · ${CHECAGENS.length} checagens · ${falhas} falha(s)`);
  if (falhas === 0) console.log('as checagens mecanicas se comportam como especificado.');
  process.exit(falhas > 0 ? 1 : 0);
}

// ----------------------------- tabela -----------------------------

function dirsEvidencia() {
  const ativo = path.join(RAIZ, 'docs', 'active');
  if (!fs.existsSync(ativo)) return [];
  const specs = fs.readdirSync(ativo).filter((d) => d.startsWith('SPEC-'));
  const saida = [];
  for (const s of specs) {
    const ev = path.join(ativo, s, 'evidence');
    if (!fs.existsSync(ev)) continue;
    for (const modelo of fs.readdirSync(ev)) {
      const dir = path.join(ev, modelo);
      if (fs.statSync(dir).isDirectory()) saida.push({ modelo, dir });
    }
  }
  return saida;
}

function extrairTurno(bruto) {
  const conteudo = bruto?.resposta?.choices?.[0]?.message?.content;
  if (typeof conteudo !== 'string') return null;
  try {
    return JSON.parse(conteudo);
  } catch {
    return null;
  }
}

function tabela() {
  const dataset = carregarDataset();
  const alvos = dirsEvidencia();

  if (alvos.length === 0) {
    console.log('nenhuma evidencia gravada ainda.');
    console.log('rode: node scripts/eval/run.mjs --model <id>   (com GROQ_API_KEY no ambiente)');
    console.log('\nAs checagens existem e estao verdes — veja: node scripts/eval/grade.mjs --self-test');
    return;
  }

  const linhas = [];
  for (const { modelo, dir } of alvos) {
    const arquivos = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const contagem = {};
    let ilegiveis = 0;

    for (const f of arquivos) {
      const bruto = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const registro = dataset.get(bruto.id);
      const turno = extrairTurno(bruto);
      if (!turno || !registro) {
        ilegiveis++;
        continue;
      }
      const res = avaliar(turno, registro);
      for (const [k, v] of Object.entries(res)) {
        if (v === null) continue;
        contagem[k] = contagem[k] || { ok: 0, total: 0 };
        contagem[k].total++;
        if (v) contagem[k].ok++;
      }
    }
    linhas.push({ modelo, n: arquivos.length, ilegiveis, contagem });
  }

  const larguraModelo = Math.max(...linhas.map((l) => l.modelo.length), 6);
  const cab = ['modelo'.padEnd(larguraModelo), 'n', ...CHECAGENS.map((c) => c.id.padStart(4))].join(' | ');
  console.log(cab);
  console.log('-'.repeat(cab.length));
  for (const l of linhas) {
    const celulas = CHECAGENS.map((c) => {
      const x = l.contagem[c.id];
      if (!x || x.total === 0) return '   —';
      return `${Math.round((x.ok / x.total) * 100)}%`.padStart(4);
    });
    console.log([l.modelo.padEnd(larguraModelo), String(l.n).padStart(2), ...celulas].join(' | '));
  }

  console.log('\nlegenda:');
  for (const c of CHECAGENS) console.log(`  ${c.id.padEnd(4)} ${c.nome} — ${c.criterio}`);

  const comIlegiveis = linhas.filter((l) => l.ilegiveis > 0);
  if (comIlegiveis.length) {
    console.log('\nrespostas ilegiveis (fora do contrato):');
    for (const l of comIlegiveis) console.log(`  ${l.modelo}: ${l.ilegiveis}`);
  }

  console.log('\nESTA TABELA NAO APROVA MODELO. Ela filtra quem nao atende o minimo mecanico.');
  console.log('Os criterios subjetivos — responde ao significado, conversa natural, corrige so o que');
  console.log('importa, personalidade consistente, nao soa artificial — exigem leitura humana das');
  console.log('evidencias antes de qualquer recomendacao.');
}

process.argv.includes('--self-test') ? selfTest() : tabela();

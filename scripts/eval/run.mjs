#!/usr/bin/env node
// Executa o dataset contra um modelo do Groq e persiste as saidas cruas.
//
//   node scripts/eval/run.mjs --dry                 monta os payloads sem gastar cota
//   node scripts/eval/run.mjs --model <id>          rodada real (exige GROQ_API_KEY)
//   node scripts/eval/run.mjs --model <id> --limit 5
//   node scripts/eval/run.mjs --model <id> --tom direta
//
// Retomavel: falas ja persistidas em evidence/<modelo>/ sao puladas.
// O tier gratuito e restricao de design — nada e re-executado so para reler resultado.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '..', '..');
const DATASET = path.join(HERE, 'dataset.jsonl');
const SCHEMA = path.join(HERE, 'turn-schema.json');
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Confirmados contra o catalogo vivo (GET /openai/v1/models) em 2026-09-16.
// O catalogo tinha 13 entradas; estas sao as conversacionais — o resto e TTS (orpheus),
// STT (whisper), classificador de seguranca (prompt-guard, gpt-oss-safeguard) ou foco
// em arabe (allam-2-7b). 'moonshotai/kimi-k2-instruct', que estava na doc, da 404 aqui.
const CANDIDATOS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

const CENARIOS = {
  cafe: {
    objetivo: 'Pedir um cafe',
    contexto: 'The student is at a coffee shop counter in London. You are the barista.',
  },
  hotel: {
    objetivo: 'Fazer check-in em um hotel',
    contexto: 'The student is at a hotel reception desk. You are the receptionist.',
  },
  'small-talk': {
    objetivo: 'Puxar conversa',
    contexto: 'You and the student are chatting casually, as two people who just met.',
  },
  livre: {
    objetivo: 'Conversa livre',
    contexto: 'Open conversation. Follow whatever the student brings up.',
  },
};

function args() {
  const a = process.argv.slice(2);
  const get = (flag, padrao = null) => {
    const i = a.indexOf(flag);
    return i >= 0 && a[i + 1] ? a[i + 1] : padrao;
  };
  return {
    dry: a.includes('--dry'),
    modelo: get('--model', CANDIDATOS[0]),
    limite: Number(get('--limit', '0')) || 0,
    tom: get('--tom', 'tranquila'),
  };
}

// Espelha o systemPrompt() do prototipo, que e normativo para comportamento.
function systemPrompt({ nivel, cenario, tom }) {
  const direta = tom === 'direta';
  return [
    'Voce e Emma, uma parceira de conversa em ingles para falantes de portugues do Brasil. Voce e software e nunca finge ser humana, escola credenciada ou certificadora.',
    `Nivel estimado do aluno (1 a 5): ${nivel}. Ajuste comprimento, vocabulario e ritmo.`,
    `Objetivo da conversa: ${cenario.objetivo}. Cenario: ${cenario.contexto}`,
    direta
      ? 'Tom: direta e sem rodeios. Cobra a repeticao. Nunca ofende, humilha nem usa palavrao.'
      : 'Tom: paciente e calorosa. Reconhece o que deu certo antes de corrigir.',
    'Regras: responda primeiro ao significado do que o aluno disse; a fala principal e em ingles; no maximo 3 pontos de correcao de alto valor por turno, so quando melhorarem a comunicacao; explique a correcao em uma frase curta em portugues; termine sempre com uma pergunta clara em ingles; nao abandone o objetivo da conversa; nunca invente notas precisas.',
    'Onde cada coisa vai, em tres vias. (a) ATRAPALHA a comunicacao ou soa errado a um falante nativo: corrija em correction_pt. (b) COMUNICA, mas revela um padrao sistematico de quem fala portugues — decalque ("do a check-in" em vez de "check in", "I have 25 years", "I am with hunger"), falso cognato ("pretend", "actually", "doubt"), estrutura ("people is", pergunta sem auxiliar) ou uso que soa rispido no contexto ("I want a coffee" num balcao): corrija TAMBEM, porque o aluno repetiria o padrao. (c) COMUNICA BEM e nao ha padrao por tras, e apenas uma forma mais idiomatica entre varias possiveis: deixe correction_pt vazia e ofereca em suggestion_en. Uma frase curta que resolve a situacao ("Coffee.", "Two coffees, please.") nao e erro: nao corrija.',
    'Responda no formato JSON definido pelo schema.',
  ].join('\n');
}

function carregarDataset() {
  return fs
    .readFileSync(DATASET, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l));
}

// evidence/ vive na pasta da SPEC (formats.md §9), nao em scripts/.
function dirEvidencia(modelo) {
  const ativo = path.join(RAIZ, 'docs', 'active');
  const specs = fs.existsSync(ativo)
    ? fs.readdirSync(ativo).filter((d) => d.startsWith('SPEC-'))
    : [];
  if (specs.length !== 1) {
    throw new Error(
      specs.length === 0
        ? 'nenhuma SPEC ativa em docs/active/ — evidence/ precisa de uma pasta de SPEC'
        : `mais de uma SPEC ativa (${specs.join(', ')}) — nao sei onde gravar evidence/`
    );
  }
  return path.join(ativo, specs[0], 'evidence', modelo.replace(/[/\\:]/g, '_'));
}

function montarPayload(registro, schema, modelo, tom) {
  const cenario = CENARIOS[registro.contexto];
  return {
    model: modelo,
    messages: [
      { role: 'system', content: systemPrompt({ nivel: registro.nivel_esperado, cenario, tom }) },
      { role: 'user', content: registro.aluno },
    ],
    response_format: { type: 'json_schema', json_schema: schema },
  };
}

async function chamar(payload, chave) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${chave}` },
    body: JSON.stringify(payload),
  });

  const limites = {
    req_restantes: res.headers.get('x-ratelimit-remaining-requests'),
    tok_restantes: res.headers.get('x-ratelimit-remaining-tokens'),
  };

  if (res.status === 429) {
    const espera = Number(res.headers.get('retry-after') || '30');
    return { erro: 'rate_limit', espera, limites };
  }
  if (!res.ok) {
    return { erro: `HTTP ${res.status}`, corpo: await res.text().catch(() => ''), limites };
  }
  return { dados: await res.json(), limites };
}

const dormir = (s) => new Promise((r) => setTimeout(r, s * 1000));

async function main() {
  const { dry, modelo, limite, tom } = args();
  const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));
  let registros = carregarDataset();
  if (limite) registros = registros.slice(0, limite);

  if (dry) {
    const exemplo = montarPayload(registros[0], schema, modelo, tom);
    console.log(`DRY RUN — nenhuma chamada de API, nenhuma cota gasta`);
    console.log(`modelo alvo: ${modelo} · tom: ${tom} · falas: ${registros.length}`);
    const contextos = {};
    for (const r of registros) {
      if (!CENARIOS[r.contexto]) {
        console.log(`ERRO: contexto '${r.contexto}' (${r.id}) sem cenario correspondente`);
        process.exit(1);
      }
      contextos[r.contexto] = (contextos[r.contexto] || 0) + 1;
      montarPayload(r, schema, modelo, tom); // falha alto se algum registro quebrar
    }
    console.log(`payloads montados: ${registros.length} · ${Object.entries(contextos).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
    console.log(`\n--- exemplo (${registros[0].id}) ---`);
    console.log(JSON.stringify(exemplo, null, 2).slice(0, 900) + '\n...');
    console.log(`\ndry: ok`);
    return;
  }

  const chave = process.env.GROQ_API_KEY;
  if (!chave) {
    console.error('GROQ_API_KEY nao definida no ambiente.');
    console.error('A chave NUNCA vai para o repositorio (invariante da SPEC). Defina na sessao:');
    console.error('  $env:GROQ_API_KEY = "..."    (PowerShell)');
    console.error('Sem chave, rode com --dry.');
    process.exit(1);
  }

  const destino = dirEvidencia(modelo);
  fs.mkdirSync(destino, { recursive: true });

  let feitos = 0;
  let pulados = 0;
  let falhas = 0;

  for (const r of registros) {
    const arquivo = path.join(destino, `${r.id}.json`);
    if (fs.existsSync(arquivo)) {
      pulados++;
      continue;
    }

    const payload = montarPayload(r, schema, modelo, tom);
    let resultado = await chamar(payload, chave);

    if (resultado.erro === 'rate_limit') {
      console.log(`  rate limit — aguardando ${resultado.espera}s (progresso preservado)`);
      await dormir(resultado.espera);
      resultado = await chamar(payload, chave);
    }

    if (resultado.erro) {
      falhas++;
      console.log(`FALHA ${r.id}: ${resultado.erro} ${resultado.corpo ? '· ' + resultado.corpo.slice(0, 200) : ''}`);
      if (resultado.erro === 'rate_limit') {
        console.log('cota esgotada — pare aqui e retome depois; o que ja foi gravado nao se perde.');
        break;
      }
      continue;
    }

    fs.writeFileSync(
      arquivo,
      JSON.stringify({ id: r.id, modelo, tom, executado_em: new Date().toISOString(), payload, resposta: resultado.dados }, null, 2)
    );
    feitos++;
    const rr = resultado.limites.req_restantes;
    console.log(`ok ${r.id}${rr ? ` · req restantes: ${rr}` : ''}`);
  }

  console.log(`\nrun: ${feitos} gravados · ${pulados} pulados (ja existiam) · ${falhas} falhas`);
  console.log(`evidencias em: ${path.relative(RAIZ, destino)}`);
}

main().catch((e) => {
  console.error(`erro: ${e.message}`);
  process.exit(1);
});

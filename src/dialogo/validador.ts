/**
 * Validação do turno no SERVIDOR (task 4.2 da SPEC-20260916-1652-motor-de-dialogo).
 *
 * Lê o contrato de `scripts/eval/turn-schema.json`, que é a FONTE ÚNICA — o mesmo arquivo que
 * o strict mode do Groq consome e do qual `turn-contract.generated.ts` é gerado. Não existe
 * segunda definição do contrato aqui.
 *
 * Por que não reusar `scripts/eval/turn-validator.mjs`: aquele validador existe para GRADUAR
 * evidência offline, e vive no harness. Acoplar o caminho de request do produto a `scripts/`
 * cruzaria a fronteira que o ARCHITECTURE mantém (harness não é produto). Duas
 * implementações lendo o MESMO schema não são dual-write do contrato — o contrato continua
 * num só lugar. Duas cópias do schema seriam.
 *
 * Validação deliberadamente restrita ao que o contrato do turno usa: `required`, `type`,
 * `enum`, `maxItems`, `additionalProperties: false` e itens de array. Não é um validador de
 * JSON Schema completo, e não deve virar um.
 */
import type { ValidadorDeTurno } from "./motor";

interface NoDeSchema {
  readonly type?: string;
  readonly required?: readonly string[];
  readonly properties?: Readonly<Record<string, NoDeSchema>>;
  readonly items?: NoDeSchema;
  readonly enum?: readonly string[];
  readonly maxItems?: number;
  readonly additionalProperties?: boolean;
}

function tipoDe(valor: unknown): string {
  if (Array.isArray(valor)) return "array";
  if (valor === null) return "null";
  return typeof valor;
}

function validarNo(valor: unknown, no: NoDeSchema, caminho: string): string[] {
  const problemas: string[] = [];

  if (no.type && tipoDe(valor) !== no.type) {
    problemas.push(`${caminho}: esperado ${no.type}, veio ${tipoDe(valor)}`);
    return problemas;
  }

  if (no.enum && !no.enum.includes(valor as string)) {
    problemas.push(`${caminho}: "${String(valor)}" fora do enum [${no.enum.join(", ")}]`);
  }

  if (no.type === "array" && Array.isArray(valor)) {
    if (no.maxItems !== undefined && valor.length > no.maxItems) {
      problemas.push(`${caminho}: ${valor.length} itens acima do teto de ${no.maxItems}`);
    }
    if (no.items) {
      valor.forEach((item, i) => problemas.push(...validarNo(item, no.items!, `${caminho}[${i}]`)));
    }
  }

  if (no.type === "object" && valor !== null && typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    for (const chave of no.required ?? []) {
      if (!(chave in obj)) problemas.push(`${caminho}: falta campo obrigatorio "${chave}"`);
    }
    if (no.additionalProperties === false && no.properties) {
      for (const chave of Object.keys(obj)) {
        if (!(chave in no.properties)) problemas.push(`${caminho}: campo desconhecido "${chave}"`);
      }
    }
    for (const [chave, sub] of Object.entries(no.properties ?? {})) {
      if (chave in obj) problemas.push(...validarNo(obj[chave], sub, `${caminho}.${chave}`));
    }
  }

  return problemas;
}

/**
 * Cria o validador a partir do schema carregado.
 *
 * O schema entra por parâmetro em vez de ser importado aqui, para o motor poder ser testado
 * com um schema de mentira e para a fonte única continuar sendo um arquivo só.
 */
export function criarValidador(schemaDoTurno: { readonly schema: NoDeSchema }): ValidadorDeTurno {
  return {
    validarSchema(turno) {
      return validarNo(turno, schemaDoTurno.schema, "turno");
    },

    /**
     * Evidência citada: cada `original` tem de ocorrer LITERALMENTE na fala do aluno.
     *
     * É a mesma regra que a C11 do harness mede. Sem ela, o modelo pode parafrasear a fala e
     * "corrigir" algo que o aluno não disse — correção sem evidência é invenção.
     *
     * A comparação ignora caixa porque a entrada é FALA TRANSCRITA (DEC-20260916-0312):
     * maiúscula não existe na fala, então exigir caixa idêntica reprovaria correção legítima.
     */
    validarEvidencia(turno, falaDoAluno) {
      if (turno === null || typeof turno !== "object") return ["turno nao e objeto"];
      const correcoes = (turno as { corrections?: unknown }).corrections;
      if (!Array.isArray(correcoes)) return [];
      const fala = falaDoAluno.toLowerCase();
      const problemas: string[] = [];
      correcoes.forEach((c, i) => {
        const original = (c as { original?: unknown })?.original;
        if (typeof original !== "string" || original.trim() === "") {
          problemas.push(`corrections[${i}]: original vazio`);
          return;
        }
        if (!fala.includes(original.toLowerCase())) {
          problemas.push(`corrections[${i}]: "${original}" nao ocorre na fala do aluno`);
        }
      });
      return problemas;
    },
  };
}

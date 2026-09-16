const TYPE_CHECKS = {
  array: Array.isArray,
  object: (value) => typeof value === "object" && value !== null && !Array.isArray(value),
  string: (value) => typeof value === "string",
};

function validateObject(value, schema, location) {
  const errors = [];
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];
  for (const field of required) {
    if (!(field in value)) errors.push(`${location}: missing required field '${field}'`);
  }
  if (schema.additionalProperties === false) {
    for (const field of Object.keys(value)) {
      if (!(field in properties)) errors.push(`${location}: unexpected field '${field}'`);
    }
  }
  for (const [field, fieldSchema] of Object.entries(properties)) {
    if (field in value) {
      errors.push(...validateAgainstSchema(value[field], fieldSchema, `${location}.${field}`));
    }
  }
  return errors;
}

function validateArray(value, schema, location) {
  const errors = [];
  if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) {
    errors.push(`${location}: expected at most ${schema.maxItems} items, received ${value.length}`);
  }
  if (schema.items) {
    value.forEach((item, index) => {
      errors.push(...validateAgainstSchema(item, schema.items, `${location}[${index}]`));
    });
  }
  return errors;
}

export function validateAgainstSchema(value, schema, location = "$") {
  const checkType = TYPE_CHECKS[schema.type];
  if (checkType && !checkType(value)) {
    return [`${location}: expected ${schema.type}`];
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return [`${location}: '${value}' outside enum {${schema.enum.join(", ")}}`];
  }
  if (schema.type === "object") return validateObject(value, schema, location);
  if (schema.type === "array") return validateArray(value, schema, location);
  return [];
}

export function validateTurn(turn, schemaDocument) {
  const schema = schemaDocument.schema ?? schemaDocument;
  return validateAgainstSchema(turn, schema);
}

// A fala do aluno vem de transcricao: maiuscula, pontuacao final e o tipo de apostrofo
// variam sem que nada mude no que foi dito. Normalizar isso evita reprovar uma correcao
// legitima por diferenca de grafia que a fala nao carrega.
function normalizeForEvidence(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function stripEdgePunctuation(text) {
  return text.replace(/^[\s"'.,!?;:]+/, "").replace(/[\s"'.,!?;:]+$/, "");
}

/**
 * Toda correcao tem de citar evidencia: `original` precisa ocorrer literalmente na fala
 * do aluno. Correcao sem evidencia e saida invalida, nao correcao fraca — o mesmo
 * principio que a rubrica de nivel ja aplica (DEC-20260916-0314).
 */
export function validateEvidence(turn, utterance) {
  const errors = [];
  const corrections = turn?.corrections;
  if (!Array.isArray(corrections)) return errors;
  const haystack = normalizeForEvidence(utterance);
  corrections.forEach((correction, index) => {
    const location = `$.corrections[${index}].original`;
    const needle = stripEdgePunctuation(normalizeForEvidence(correction?.original));
    if (needle === "") {
      errors.push(`${location}: vazio — correcao sem evidencia citada`);
      return;
    }
    if (!haystack.includes(needle)) {
      errors.push(`${location}: '${correction.original}' nao ocorre na fala do aluno`);
    }
  });
  return errors;
}

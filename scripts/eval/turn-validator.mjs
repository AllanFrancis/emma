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
  if (schema.type === "object") return validateObject(value, schema, location);
  if (schema.type === "array") return validateArray(value, schema, location);
  return [];
}

export function validateTurn(turn, schemaDocument) {
  const schema = schemaDocument.schema ?? schemaDocument;
  return validateAgainstSchema(turn, schema);
}

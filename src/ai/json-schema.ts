import type { ZodTypeAny } from 'zod';

/**
 * Minimal Zod → JSON Schema conversion.
 *
 * The flows describe their outputs with Zod, and every model provider wants a
 * JSON Schema (or at least a readable description of the expected shape). This
 * covers the constructs the flows actually use and keeps `.describe()` text,
 * which is what steers the model toward the right field contents.
 */

export interface JsonSchema {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  additionalProperties?: boolean | JsonSchema;
  anyOf?: JsonSchema[];
  const?: unknown;
}

type AnyDef = { typeName?: string; [key: string]: unknown };

function defOf(schema: ZodTypeAny): AnyDef {
  return (schema as unknown as { _def: AnyDef })._def ?? {};
}

export function toJsonSchema(schema: ZodTypeAny): JsonSchema {
  const def = defOf(schema);
  const description = (schema as { description?: string }).description;
  const withDescription = (result: JsonSchema): JsonSchema =>
    description ? { ...result, description } : result;

  switch (def.typeName) {
    case 'ZodString':
      return withDescription({ type: 'string' });
    case 'ZodNumber':
      return withDescription({ type: 'number' });
    case 'ZodBoolean':
      return withDescription({ type: 'boolean' });
    case 'ZodLiteral':
      return withDescription({ const: def.value });
    case 'ZodEnum':
      return withDescription({ type: 'string', enum: def.values as unknown[] });
    case 'ZodArray':
      return withDescription({ type: 'array', items: toJsonSchema(def.type as ZodTypeAny) });
    case 'ZodObject': {
      const shape = (def.shape as () => Record<string, ZodTypeAny>)();
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = toJsonSchema(value);
        if (!isOptional(value)) required.push(key);
      }
      return withDescription({
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
        additionalProperties: false,
      });
    }
    case 'ZodOptional':
    case 'ZodDefault':
      return withDescription(toJsonSchema(def.innerType as ZodTypeAny));
    case 'ZodNullable': {
      const inner = toJsonSchema(def.innerType as ZodTypeAny);
      return withDescription({
        ...inner,
        type: inner.type ? [inner.type as string, 'null'] : undefined,
      });
    }
    case 'ZodUnion':
      return withDescription({
        anyOf: (def.options as ZodTypeAny[]).map(option => toJsonSchema(option)),
      });
    case 'ZodRecord':
      return withDescription({
        type: 'object',
        additionalProperties: toJsonSchema(def.valueType as ZodTypeAny),
      });
    default:
      // Unknown constructs stay unconstrained rather than failing the request.
      return withDescription({});
  }
}

function isOptional(schema: ZodTypeAny): boolean {
  const typeName = defOf(schema).typeName;
  return typeName === 'ZodOptional' || typeName === 'ZodDefault';
}

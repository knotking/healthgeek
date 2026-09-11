import type { JsonSchema } from '@/ai/json-schema';
import { type GenerateRequest, type ModelProvider, promptText } from './types';

/**
 * Offline provider used when `AI_PROVIDER=mock` (the default).
 *
 * It synthesises a response that satisfies the requested output schema, so every
 * screen in the app is clickable with nothing installed and no API key. Values
 * are obviously placeholders — point `AI_PROVIDER` at a real model to get real
 * analysis.
 */

let warned = false;

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^./, character => character.toUpperCase());
}

/** Stable pseudo-random number so repeated runs produce the same sample. */
function seeded(key: string, min: number, max: number): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100000;
  }
  return min + (hash % Math.max(1, max - min + 1));
}

function sampleFor(schema: JsonSchema, key: string, depth = 0): unknown {
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  if (schema.const !== undefined) return schema.const;
  if (schema.anyOf && schema.anyOf.length > 0) return sampleFor(schema.anyOf[0], key, depth);

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  switch (type) {
    case 'number':
    case 'integer': {
      const name = key.toLowerCase();
      if (name.includes('calorie')) return seeded(key, 150, 650);
      if (name.includes('duration') || name.includes('minute')) return seeded(key, 10, 45);
      if (name.includes('rating') || name.includes('score')) return seeded(key, 1, 5);
      // Indexes have to point at something real, so keep them at the first slot.
      if (name.includes('index')) return 0;
      return seeded(key, 1, 100);
    }
    case 'boolean':
      return true;
    case 'array': {
      if (depth > 4 || !schema.items) return [];
      return [0, 1, 2].map(index => sampleFor(schema.items as JsonSchema, `${key} ${index + 1}`, depth + 1));
    }
    case 'object': {
      const out: Record<string, unknown> = {};
      for (const [property, child] of Object.entries(schema.properties ?? {})) {
        out[property] = sampleFor(child, property, depth + 1);
      }
      return out;
    }
    case 'string':
    default: {
      if (schema.properties) return sampleFor({ ...schema, type: 'object' }, key, depth);
      return `Sample ${humanize(key) || 'value'}`;
    }
  }
}

export function createMockProvider(): ModelProvider {
  return {
    id: 'mock',
    model: 'offline-sample-data',

    async generate(request: GenerateRequest): Promise<string> {
      if (!warned) {
        warned = true;
        console.warn(
          '[ai] AI_PROVIDER is "mock": returning placeholder data. ' +
            'Set AI_PROVIDER to ollama, openai, anthropic, or gemini for real responses.'
        );
      }

      if (!request.outputSchema) {
        return (
          'Sample response generated offline because no AI provider is configured.\n\n' +
          `Prompt received (${promptText(request.parts).length} characters).`
        );
      }
      return JSON.stringify(sampleFor(request.outputSchema, 'result'), null, 2);
    },
  };
}

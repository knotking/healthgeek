import type { JsonSchema } from '@/ai/json-schema';
import type { PromptPart } from '@/ai/template';

/** A single text generation request, independent of any particular vendor. */
export interface GenerateRequest {
  /** Ordered prompt content: text segments and media data URIs. */
  parts: PromptPart[];
  /** Instructions that belong in the system role, if the provider has one. */
  system?: string;
  /** Present when the caller needs JSON back in a particular shape. */
  outputSchema?: JsonSchema;
}

export interface ModelProvider {
  /** Provider id, e.g. `ollama`. Used in logs and error messages. */
  readonly id: string;
  /** The model this provider is configured to call. */
  readonly model: string;
  /** Returns the model's raw text response. */
  generate(request: GenerateRequest): Promise<string>;
}

export class ProviderError extends Error {
  constructor(
    readonly providerId: string,
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/** Splits a data URI into its MIME type and base64 payload. */
export function parseDataUri(uri: string): { mimeType: string; base64: string } | null {
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(uri);
  return match ? { mimeType: match[1], base64: match[2] } : null;
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/** Flattens the prompt's text segments, used by providers and for logging. */
export function promptText(parts: PromptPart[]): string {
  return parts
    .filter((part): part is Extract<PromptPart, { type: 'text' }> => part.type === 'text')
    .map(part => part.text)
    .join('\n');
}

/**
 * The instruction appended when a caller wants structured output. Every provider
 * uses it, on top of whatever native JSON mode it may also support.
 */
export function jsonInstruction(schema: JsonSchema): string {
  return [
    'Respond with a single JSON object and nothing else.',
    'Do not wrap it in markdown fences, and do not add commentary before or after it.',
    'The object must conform to this JSON Schema:',
    JSON.stringify(schema, null, 2),
  ].join('\n');
}

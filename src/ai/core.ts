import type { z, ZodTypeAny } from 'zod';

import { toJsonSchema } from './json-schema';
import { getProvider } from './providers';
import { renderTemplate } from './template';

/**
 * The prompt/flow runtime used by everything in `src/ai/flows`.
 *
 * It replaces Genkit with a thin, vendor-neutral layer: render the template,
 * ask whichever provider is configured, then validate the answer against the
 * flow's Zod output schema. The `definePrompt`/`defineFlow` surface is kept so
 * the flow files read the same as before.
 */

export class AiError extends Error {}

export interface PromptDefinition<Input extends ZodTypeAny, Output extends ZodTypeAny> {
  name: string;
  prompt: string;
  /** Extra instructions sent in the system role. */
  system?: string;
  input?: { schema: Input };
  output?: { schema: Output };
}

export interface PromptResult<Output> {
  /** Parsed, schema-validated output. `null` when the prompt declares no schema. */
  output: Output | null;
  /** The model's raw response text. */
  text: string;
}

export interface FlowDefinition<Input extends ZodTypeAny, Output extends ZodTypeAny> {
  name: string;
  inputSchema: Input;
  outputSchema: Output;
}

/** Pulls the JSON value out of a response that may carry fences or prose. */
export function extractJson(text: string): unknown {
  const withoutFences = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  const candidates = [withoutFences, sliceBalanced(withoutFences)].filter(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0
  );

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  throw new AiError('The model response did not contain valid JSON.');
}

/** Returns the first balanced `{…}` or `[…]` span, ignoring braces in strings. */
function sliceBalanced(text: string): string | null {
  const start = text.search(/[{[]/);
  if (start === -1) return null;

  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === open) depth += 1;
    else if (character === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

function definePrompt<Input extends ZodTypeAny, Output extends ZodTypeAny>(
  definition: PromptDefinition<Input, Output>
) {
  const outputSchema = definition.output?.schema;
  const jsonSchema = outputSchema ? toJsonSchema(outputSchema) : undefined;

  return async function run(rawInput: z.infer<Input>): Promise<PromptResult<z.infer<Output>>> {
    let input = rawInput;
    if (definition.input?.schema) {
      const parsed = definition.input.schema.safeParse(rawInput);
      if (!parsed.success) {
        throw new AiError(
          `Invalid input for prompt "${definition.name}" — ${describeIssues(parsed.error)}`
        );
      }
      input = parsed.data;
    }

    const provider = getProvider();
    const parts = renderTemplate(definition.prompt, input);

    let lastProblem = '';
    // One retry: small local models often need a nudge to return clean JSON.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const system = [definition.system, attempt === 0 ? null : repairHint(lastProblem)]
        .filter(Boolean)
        .join('\n\n');

      const text = await provider.generate({
        parts,
        system: system || undefined,
        outputSchema: jsonSchema,
      });

      if (!outputSchema) return { output: null, text };

      try {
        const parsed = outputSchema.safeParse(extractJson(text));
        if (parsed.success) return { output: parsed.data, text };
        lastProblem = describeIssues(parsed.error);
      } catch (error) {
        lastProblem = error instanceof Error ? error.message : String(error);
      }
    }

    throw new AiError(
      `Prompt "${definition.name}" did not return output matching its schema ` +
        `(provider: ${provider.id}, model: ${provider.model}) — ${lastProblem}`
    );
  };
}

function repairHint(problem: string): string {
  return (
    'Your previous response could not be used. ' +
    `Problem: ${problem}. ` +
    'Return only the corrected JSON object, with every required field present.'
  );
}

function defineFlow<Input extends ZodTypeAny, Output extends ZodTypeAny>(
  definition: FlowDefinition<Input, Output>,
  handler: (input: z.infer<Input>) => Promise<z.infer<Output>>
) {
  return async function run(rawInput: z.infer<Input>): Promise<z.infer<Output>> {
    const parsedInput = definition.inputSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      throw new AiError(
        `Invalid input for flow "${definition.name}" — ${describeIssues(parsedInput.error)}`
      );
    }

    const result = await handler(parsedInput.data);

    const parsedOutput = definition.outputSchema.safeParse(result);
    if (!parsedOutput.success) {
      throw new AiError(
        `Flow "${definition.name}" produced invalid output — ${describeIssues(parsedOutput.error)}`
      );
    }
    return parsedOutput.data;
  };
}

export const ai = { definePrompt, defineFlow };

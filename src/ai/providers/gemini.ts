import {
  type GenerateRequest,
  type ModelProvider,
  jsonInstruction,
  parseDataUri,
  ProviderError,
} from './types';

/**
 * Provider for the Google Generative Language (Gemini) API.
 *
 * Kept so that an existing `GEMINI_API_KEY` still works after the migration off
 * Genkit — it is now one option among several rather than the only path, and it
 * needs no Google Cloud project or SDK, just an API key.
 */

interface GeminiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

export function createGeminiProvider(config: GeminiConfig): ModelProvider {
  return {
    id: 'gemini',
    model: config.model,

    async generate(request: GenerateRequest): Promise<string> {
      const parts: Part[] = [];
      for (const part of request.parts) {
        if (part.type === 'text') {
          parts.push({ text: part.text });
          continue;
        }
        const media = parseDataUri(part.url);
        if (media) {
          parts.push({ inline_data: { mime_type: media.mimeType, data: media.base64 } });
        }
      }

      const system = [request.system, request.outputSchema ? jsonInstruction(request.outputSchema) : null]
        .filter(Boolean)
        .join('\n\n');

      const endpoint =
        `${config.baseUrl.replace(/\/+$/, '')}/v1beta/models/` +
        `${encodeURIComponent(config.model)}:generateContent`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          ...(request.outputSchema
            ? { generationConfig: { responseMimeType: 'application/json' } }
            : {}),
        }),
      }).catch((error: unknown) => {
        throw new ProviderError('gemini', `Could not reach ${endpoint} (${String(error)})`);
      });

      if (!response.ok) {
        throw new ProviderError(
          'gemini',
          `${endpoint} returned ${response.status}: ${await response.text()}`,
          response.status
        );
      }

      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = (payload.candidates?.[0]?.content?.parts ?? [])
        .map(part => part.text ?? '')
        .join('');

      if (!text) {
        throw new ProviderError('gemini', 'The response contained no text parts.');
      }
      return text;
    },
  };
}

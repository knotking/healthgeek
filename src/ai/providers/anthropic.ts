import {
  type GenerateRequest,
  type ModelProvider,
  isImage,
  jsonInstruction,
  parseDataUri,
  ProviderError,
} from './types';

/**
 * Provider for the Anthropic Messages API.
 *
 * Implemented over plain `fetch` rather than the Anthropic SDK so that adding a
 * vendor does not add a dependency — the point of this layer is that no single
 * provider is baked into the app.
 */

interface AnthropicConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

export function createAnthropicProvider(config: AnthropicConfig): ModelProvider {
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/v1/messages`;

  return {
    id: 'anthropic',
    model: config.model,

    async generate(request: GenerateRequest): Promise<string> {
      const content: ContentBlock[] = [];
      const unsupported: string[] = [];

      for (const part of request.parts) {
        if (part.type === 'text') {
          content.push({ type: 'text', text: part.text });
          continue;
        }
        const media = parseDataUri(part.url);
        if (media && isImage(media.mimeType)) {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: media.mimeType, data: media.base64 },
          });
        } else {
          unsupported.push(media?.mimeType ?? 'unknown media type');
        }
      }

      if (unsupported.length > 0) {
        content.push({
          type: 'text',
          text:
            `[The user attached ${unsupported.join(', ')}, which this provider cannot read. ` +
            'Answer from the other details provided and say that the attachment could not be reviewed.]',
        });
      }

      const system = [request.system, request.outputSchema ? jsonInstruction(request.outputSchema) : null]
        .filter(Boolean)
        .join('\n\n');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          ...(system ? { system } : {}),
          messages: [{ role: 'user', content }],
        }),
      }).catch((error: unknown) => {
        throw new ProviderError('anthropic', `Could not reach ${endpoint} (${String(error)})`);
      });

      if (!response.ok) {
        throw new ProviderError(
          'anthropic',
          `${endpoint} returned ${response.status}: ${await response.text()}`,
          response.status
        );
      }

      const payload = (await response.json()) as {
        content?: { type: string; text?: string }[];
        stop_reason?: string;
      };

      if (payload.stop_reason === 'refusal') {
        throw new ProviderError('anthropic', 'The model declined to answer this request.');
      }

      const text = (payload.content ?? [])
        .filter(block => block.type === 'text' && typeof block.text === 'string')
        .map(block => block.text as string)
        .join('');

      if (!text) {
        throw new ProviderError('anthropic', 'The response contained no text blocks.');
      }
      return text;
    },
  };
}

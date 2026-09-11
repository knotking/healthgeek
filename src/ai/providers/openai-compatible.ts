import {
  type GenerateRequest,
  type ModelProvider,
  isImage,
  jsonInstruction,
  parseDataUri,
  ProviderError,
} from './types';

/**
 * Provider for any endpoint that speaks the OpenAI chat-completions protocol.
 *
 * That covers local runtimes — Ollama (`http://localhost:11434/v1`), LM Studio,
 * llama.cpp, vLLM — as well as OpenAI itself and gateways such as LiteLLM. This
 * is the default for local development because it needs no hosted account.
 */

interface OpenAIConfig {
  id: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export function createOpenAICompatibleProvider(config: OpenAIConfig): ModelProvider {
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  return {
    id: config.id,
    model: config.model,

    async generate(request: GenerateRequest): Promise<string> {
      const content: ContentPart[] = [];
      const unsupported: string[] = [];

      for (const part of request.parts) {
        if (part.type === 'text') {
          content.push({ type: 'text', text: part.text });
          continue;
        }
        const media = parseDataUri(part.url);
        if (media && isImage(media.mimeType)) {
          content.push({ type: 'image_url', image_url: { url: part.url } });
        } else {
          unsupported.push(media?.mimeType ?? 'unknown media type');
        }
      }

      if (unsupported.length > 0) {
        // Be explicit rather than silently dropping the attachment.
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

      const body: Record<string, unknown> = {
        model: config.model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content },
        ],
      };
      if (request.outputSchema) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      }).catch((error: unknown) => {
        throw new ProviderError(
          config.id,
          `Could not reach ${endpoint}. Is the model server running? (${String(error)})`
        );
      });

      if (!response.ok) {
        throw new ProviderError(
          config.id,
          `${endpoint} returned ${response.status}: ${await response.text()}`,
          response.status
        );
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = payload.choices?.[0]?.message?.content;
      if (typeof text !== 'string') {
        throw new ProviderError(config.id, 'The response contained no message content.');
      }
      return text;
    },
  };
}

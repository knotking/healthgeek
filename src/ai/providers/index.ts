import { createAnthropicProvider } from './anthropic';
import { createGeminiProvider } from './gemini';
import { createMockProvider } from './mock';
import { createOpenAICompatibleProvider } from './openai-compatible';
import { type ModelProvider, ProviderError } from './types';

/**
 * Chooses the model provider from the environment.
 *
 *   AI_PROVIDER=mock       placeholder responses, no network (default)
 *   AI_PROVIDER=ollama     local Ollama daemon
 *   AI_PROVIDER=openai     OpenAI, or any OpenAI-compatible endpoint
 *   AI_PROVIDER=anthropic  Anthropic Messages API
 *   AI_PROVIDER=gemini     Google Generative Language API
 *
 * Nothing else in the app knows which one is in use.
 */

export type ProviderId = 'mock' | 'ollama' | 'openai' | 'anthropic' | 'gemini';

const DEFAULT_MODELS: Record<ProviderId, string> = {
  mock: 'offline-sample-data',
  ollama: 'llama3.2',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-opus-5',
  gemini: 'gemini-2.0-flash',
};

function requireEnv(name: string, providerId: ProviderId): string {
  const value = process.env[name];
  if (!value) {
    throw new ProviderError(
      providerId,
      `AI_PROVIDER is "${providerId}" but ${name} is not set. ` +
        'Set it in .env.local, or use AI_PROVIDER=mock to run without a model.'
    );
  }
  return value;
}

function build(providerId: ProviderId): ModelProvider {
  const model = process.env.AI_MODEL || DEFAULT_MODELS[providerId];

  switch (providerId) {
    case 'mock':
      return createMockProvider();

    case 'ollama':
      return createOpenAICompatibleProvider({
        id: 'ollama',
        // Ollama exposes an OpenAI-compatible surface at /v1.
        baseUrl: process.env.AI_BASE_URL || 'http://localhost:11434/v1',
        apiKey: process.env.AI_API_KEY || 'ollama',
        model,
      });

    case 'openai':
      return createOpenAICompatibleProvider({
        id: 'openai',
        baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
        apiKey: requireEnv('AI_API_KEY', 'openai'),
        model,
      });

    case 'anthropic':
      return createAnthropicProvider({
        baseUrl: process.env.AI_BASE_URL || 'https://api.anthropic.com',
        apiKey: requireEnv('AI_API_KEY', 'anthropic'),
        model,
        maxTokens: Number(process.env.AI_MAX_TOKENS || 8192),
      });

    case 'gemini':
      return createGeminiProvider({
        baseUrl: process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com',
        apiKey: requireEnv('AI_API_KEY', 'gemini'),
        model,
      });
  }
}

let cached: { id: ProviderId; provider: ModelProvider } | null = null;

export function resolveProviderId(): ProviderId {
  const raw = (process.env.AI_PROVIDER || 'mock').trim().toLowerCase();
  if (raw in DEFAULT_MODELS) return raw as ProviderId;
  throw new ProviderError(
    'mock',
    `Unknown AI_PROVIDER "${raw}". Expected one of: ${Object.keys(DEFAULT_MODELS).join(', ')}.`
  );
}

/** Returns the configured provider, building it on first use. */
export function getProvider(): ModelProvider {
  const id = resolveProviderId();
  if (!cached || cached.id !== id) {
    cached = { id, provider: build(id) };
  }
  return cached.provider;
}

export type { ModelProvider } from './types';
export { ProviderError } from './types';

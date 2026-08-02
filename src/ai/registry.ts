/**
 * Provider resolution.
 *
 * The single place that knows which implementations exist. Everything else asks
 * for a provider by id, or asks for "whatever is configured", and receives an
 * `AIProvider`.
 *
 * Resolution order is deliberate: an explicit argument beats the environment,
 * the environment beats the default, and the default is Ollama. A project that
 * defaults to a paid API is a project that bills you for running its tests.
 */

import {
  PROVIDER_IDS,
  PROVIDER_LABELS,
  type AIProvider,
  type ProviderConfig,
  type ProviderHealth,
  type ProviderId,
} from "./types.ts";
import { AnthropicProvider } from "./providers/anthropic.ts";
import { GeminiProvider } from "./providers/gemini.ts";
import { OllamaProvider } from "./providers/ollama.ts";
import { OpenAICompatibleProvider } from "./providers/openai-compatible.ts";

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.id) {
    case "ollama":
      return new OllamaProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    case "gemini":
      return new GeminiProvider(config);
    // OpenAI, OpenRouter and any other OpenAI-compatible endpoint share one
    // implementation, parameterised by base URL and preset.
    case "openai":
    case "openrouter":
    case "openai-compatible":
      return new OpenAICompatibleProvider(config);
  }
}

/** Read a provider's configuration from the environment. */
export function configFromEnv(id: ProviderId): ProviderConfig {
  const upper = id.toUpperCase().replace(/-/g, "_");
  const env = (suffix: string) => process.env[`SKITE_${upper}_${suffix}`];

  return {
    id,
    model: env("MODEL"),
    visionModel: env("VISION_MODEL"),
    baseUrl: env("BASE_URL"),
    apiKey: env("API_KEY"),
    timeoutMs: env("TIMEOUT_MS") ? Number(env("TIMEOUT_MS")) : undefined,
  };
}

/**
 * The provider the pipeline should use when the caller has no opinion.
 *
 * Defaults to Ollama whether or not it is running. Failing with "Ollama is not
 * reachable at localhost:11434" is a better outcome than silently reaching for a
 * paid API the developer did not ask for.
 */
export function resolveProvider(id?: ProviderId | string | null): AIProvider {
  const requested = id && (PROVIDER_IDS as readonly string[]).includes(id) ? (id as ProviderId) : null;
  const configured = process.env.SKITE_AI_PROVIDER;
  const fromEnv =
    configured && (PROVIDER_IDS as readonly string[]).includes(configured)
      ? (configured as ProviderId)
      : null;

  return createProvider(configFromEnv(requested ?? fromEnv ?? "ollama"));
}

/**
 * Probe every provider at once.
 *
 * Probes run in parallel and never reject: an unconfigured provider is a normal
 * state to be reported, not an exception. The Studio's picker renders this
 * directly, which is why the unhappy paths carry an actionable sentence rather
 * than a status code.
 */
export async function probeAll(): Promise<ProviderHealth[]> {
  return Promise.all(
    PROVIDER_IDS.map(async (id) => {
      try {
        return await createProvider(configFromEnv(id)).health();
      } catch (error) {
        return {
          id,
          label: PROVIDER_LABELS[id],
          ok: false,
          detail: error instanceof Error ? error.message : "Probe failed.",
          model: "unknown",
          capabilities: { vision: false, jsonSchema: false, streaming: false, contextWindow: 0 },
        } satisfies ProviderHealth;
      }
    }),
  );
}

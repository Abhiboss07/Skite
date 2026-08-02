/**
 * Every provider that speaks the OpenAI chat-completions wire format.
 *
 * ⚠️ UNVERIFIED AGAINST A LIVE ENDPOINT for the hosted variants — no API keys
 * exist in this project. Written against the documented format.
 *
 * One adapter, several identities. OpenAI, OpenRouter, Antigravity, LM Studio,
 * vLLM, Together, Groq, DeepSeek and most self-hosted servers all accept
 * `POST /v1/chat/completions` with the same body. Writing six near-identical
 * adapters would mean six places to fix the same bug, and would still not cover
 * whichever OpenAI-compatible service appears next — which is the more likely
 * event than any of these changing their format.
 *
 * Antigravity is worth a note: it is Google's agentic IDE rather than a hosted
 * inference API. If it exposes an OpenAI-compatible endpoint, pointing `baseUrl`
 * at it is all that is required and no code changes. If it does not, no adapter
 * would have helped.
 */

import {
  AIError,
  type Capabilities,
  type GenerateRequest,
  type GenerateResponse,
  type ProviderConfig,
  type ProviderHealth,
  type ProviderId,
  type VisionRequest,
} from "../types.ts";
import { BaseProvider } from "../base.ts";

type Preset = {
  label: string;
  baseUrl: string;
  defaultModel: string;
  defaultVisionModel: string;
  envKey: string;
  contextWindow: number;
  /** INR per million tokens, at roughly ₹88/USD. Zero when self-hosted. */
  inputInrPerMTok: number;
  outputInrPerMTok: number;
};

const PRESETS: Record<string, Preset> = {
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1",
    defaultVisionModel: "gpt-4.1",
    envKey: "OPENAI_API_KEY",
    contextWindow: 1_000_000,
    inputInrPerMTok: 2 * 88,
    outputInrPerMTok: 8 * 88,
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    // Pricing varies per model on OpenRouter, so cost is reported as zero
    // rather than guessed. A wrong number is worse than an absent one.
    defaultModel: "anthropic/claude-sonnet-4.5",
    defaultVisionModel: "anthropic/claude-sonnet-4.5",
    envKey: "OPENROUTER_API_KEY",
    contextWindow: 200_000,
    inputInrPerMTok: 0,
    outputInrPerMTok: 0,
  },
  "openai-compatible": {
    label: "OpenAI-compatible endpoint",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    defaultVisionModel: "local-model",
    envKey: "OPENAI_COMPATIBLE_API_KEY",
    contextWindow: 32_000,
    inputInrPerMTok: 0,
    outputInrPerMTok: 0,
  },
};

type ChatResponse = {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

type ModelsResponse = { data?: { id: string }[] };

export class OpenAICompatibleProvider extends BaseProvider {
  readonly id: ProviderId;
  readonly label: string;

  protected readonly defaultModel: string;
  protected readonly defaultVisionModel: string;

  private readonly preset: Preset;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.id = config.id;
    this.preset = PRESETS[config.id] ?? PRESETS["openai-compatible"];
    this.label = this.preset.label;
    this.defaultModel = this.preset.defaultModel;
    this.defaultVisionModel = this.preset.defaultVisionModel;
    this.baseUrl = (config.baseUrl ?? this.preset.baseUrl).replace(/\/+$/, "");
  }

  get capabilities(): Capabilities {
    return {
      // Assumed rather than detected: this adapter serves arbitrary endpoints,
      // and there is no portable way to ask one whether its model reads images.
      // A wrong answer surfaces as the endpoint's own error, which is clearer
      // than anything guessed from a model name here.
      vision: true,
      jsonSchema: true,
      streaming: true,
      contextWindow: this.preset.contextWindow,
    };
  }

  private get apiKey(): string | undefined {
    return this.config.apiKey ?? process.env[this.preset.envKey];
  }

  /** Self-hosted endpoints usually need no key; hosted ones always do. */
  private get requiresKey(): boolean {
    return this.id === "openai" || this.id === "openrouter";
  }

  async health(): Promise<ProviderHealth> {
    const base: Omit<ProviderHealth, "ok" | "detail"> = {
      id: this.id,
      label: this.label,
      model: this.model,
      capabilities: this.capabilities,
    };

    if (this.requiresKey && !this.apiKey) {
      return {
        ...base,
        ok: false,
        detail: `No ${this.preset.envKey}. Set one to enable ${this.label}; the pipeline runs without it.`,
      };
    }

    const started = Date.now();
    try {
      const data = (await this.fetchJson(`${this.baseUrl}/models`, {
        method: "GET",
        headers: this.headers(),
      })) as ModelsResponse;

      const available = (data.data ?? []).map((m) => m.id);
      return {
        ...base,
        ok: true,
        // Some endpoints list thousands of models; a full dump is not useful.
        availableModels: available.slice(0, 50),
        latencyMs: Date.now() - started,
        detail: `Ready. ${available.length} model(s) reachable at ${this.baseUrl}.`,
      };
    } catch (error) {
      const err = this.normalise(error);
      return {
        ...base,
        ok: false,
        detail:
          err.kind === "unreachable"
            ? `Nothing is listening at ${this.baseUrl}.`
            : err.message,
      };
    }
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    if (this.id === "openrouter") {
      // OpenRouter attributes usage to these; harmless elsewhere but sent only
      // where it is documented.
      headers["http-referer"] = "https://skite.design";
      headers["x-title"] = "SKITE";
    }
    return headers;
  }

  protected async complete(
    request: GenerateRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
  ) {
    return this.chat(request, resolved, []);
  }

  protected async completeVision(
    request: VisionRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
  ) {
    return this.chat(
      request,
      resolved,
      request.images.map((image) => ({
        type: "image_url" as const,
        image_url: { url: `data:${image.mediaType};base64,${image.data.toString("base64")}` },
      })),
    );
  }

  private async chat(
    request: GenerateRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
    imageParts: Record<string, unknown>[],
  ): Promise<Omit<GenerateResponse, "task" | "provider" | "ms">> {
    if (this.requiresKey && !this.apiKey) {
      throw new AIError("not-configured", `No ${this.preset.envKey} is set.`, this.id);
    }

    const messages: Record<string, unknown>[] = [];
    if (request.system) messages.push({ role: "system", content: request.system });
    for (const turn of request.history ?? []) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push({
      role: "user",
      content: imageParts.length
        ? [...imageParts, { type: "text", text: request.prompt }]
        : request.prompt,
    });

    const body: Record<string, unknown> = {
      model: resolved.model,
      messages,
      temperature: resolved.temperature,
      max_tokens: resolved.maxTokens,
      stream: false,
    };

    if (request.schema) {
      body.response_format = {
        type: "json_schema",
        json_schema: { name: request.schema.name, schema: request.schema.schema, strict: true },
      };
    }

    const data = (await this.fetchJson(
      `${this.baseUrl}/chat/completions`,
      { method: "POST", headers: this.headers(), body: JSON.stringify(body) },
      request.signal,
    )) as ChatResponse;

    const choice = data.choices?.[0];
    const refused = choice?.finish_reason === "content_filter";
    const text = choice?.message?.content ?? "";

    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;

    return {
      text,
      model: resolved.model,
      refused,
      usage: {
        inputTokens,
        outputTokens,
        estimatedCostInr:
          (inputTokens / 1e6) * this.preset.inputInrPerMTok +
          (outputTokens / 1e6) * this.preset.outputInrPerMTok,
      },
    };
  }
}

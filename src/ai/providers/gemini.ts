/**
 * Gemini.
 *
 * ⚠️ UNVERIFIED AGAINST A LIVE ENDPOINT — no API key exists in this project.
 * Written against the documented generateContent format.
 *
 * The only provider here that does not resemble the other two: content is
 * `contents[].parts[]` rather than messages, the system prompt is
 * `systemInstruction`, generation settings live under `generationConfig`, and
 * JSON mode is `responseMimeType` plus `responseSchema`. It is adapted rather
 * than folded into the OpenAI-compatible adapter for exactly that reason —
 * Google does expose an OpenAI-compatible endpoint, but it lags the native one,
 * and routing through a compatibility shim to avoid one small adapter is a poor
 * trade.
 */

import {
  AIError,
  type Capabilities,
  type GenerateRequest,
  type GenerateResponse,
  type ProviderConfig,
  type ProviderHealth,
  type VisionRequest,
} from "../types.ts";
import { BaseProvider } from "../base.ts";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/** INR per million tokens at roughly ₹88/USD. */
const INPUT_INR_PER_MTOK = 1.25 * 88;
const OUTPUT_INR_PER_MTOK = 10 * 88;

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

type GeminiModelsResponse = { models?: { name: string }[] };

export class GeminiProvider extends BaseProvider {
  readonly id = "gemini" as const;
  readonly label = "Gemini";

  protected readonly defaultModel = "gemini-2.5-pro";
  protected readonly defaultVisionModel = "gemini-2.5-pro";

  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  get capabilities(): Capabilities {
    return { vision: true, jsonSchema: true, streaming: true, contextWindow: 1_000_000 };
  }

  private get apiKey(): string | undefined {
    return this.config.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  }

  async health(): Promise<ProviderHealth> {
    const base: Omit<ProviderHealth, "ok" | "detail"> = {
      id: this.id,
      label: this.label,
      model: this.model,
      capabilities: this.capabilities,
    };

    if (!this.apiKey) {
      return {
        ...base,
        ok: false,
        detail: "No GEMINI_API_KEY. Set one to enable Gemini; the pipeline runs without it.",
      };
    }

    const started = Date.now();
    try {
      const data = (await this.fetchJson(`${this.baseUrl}/models?key=${this.apiKey}`, {
        method: "GET",
      })) as GeminiModelsResponse;

      const available = (data.models ?? []).map((m) => m.name.replace(/^models\//, ""));
      return {
        ...base,
        ok: true,
        availableModels: available.slice(0, 50),
        latencyMs: Date.now() - started,
        detail: `Ready. ${available.length} model(s) available.`,
      };
    } catch (error) {
      return { ...base, ok: false, detail: this.normalise(error).message };
    }
  }

  protected async complete(
    request: GenerateRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
  ) {
    return this.generateContent(request, resolved, []);
  }

  protected async completeVision(
    request: VisionRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
  ) {
    return this.generateContent(
      request,
      resolved,
      request.images.map((image) => ({
        inline_data: { mime_type: image.mediaType, data: image.data.toString("base64") },
      })),
    );
  }

  private async generateContent(
    request: GenerateRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
    imageParts: Record<string, unknown>[],
  ): Promise<Omit<GenerateResponse, "task" | "provider" | "ms">> {
    if (!this.apiKey) {
      throw new AIError("not-configured", "No GEMINI_API_KEY is set.", this.id);
    }

    const contents = [
      // Gemini names the assistant role "model", not "assistant".
      ...(request.history ?? []).map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.content }],
      })),
      { role: "user", parts: [...imageParts, { text: request.prompt }] },
    ];

    const body: Record<string, unknown> = {
      contents,
      ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
      generationConfig: {
        temperature: resolved.temperature,
        maxOutputTokens: resolved.maxTokens,
        ...(request.schema
          ? { responseMimeType: "application/json", responseSchema: request.schema.schema }
          : {}),
      },
    };

    const data = (await this.fetchJson(
      `${this.baseUrl}/models/${resolved.model}:generateContent?key=${this.apiKey}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
      request.signal,
    )) as GeminiResponse;

    const candidate = data.candidates?.[0];
    const refused = candidate?.finishReason === "SAFETY" || candidate?.finishReason === "PROHIBITED_CONTENT";
    const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("");

    const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

    return {
      text,
      model: resolved.model,
      refused,
      usage: {
        inputTokens,
        outputTokens,
        estimatedCostInr:
          (inputTokens / 1e6) * INPUT_INR_PER_MTOK + (outputTokens / 1e6) * OUTPUT_INR_PER_MTOK,
      },
    };
  }
}

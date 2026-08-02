/**
 * Claude.
 *
 * ⚠️ UNVERIFIED AGAINST A LIVE ENDPOINT. There is no API key in this project, so
 * this adapter has never made a real request. It is written against the
 * documented Messages API wire format and is structurally exercised by the unit
 * tests, which is not the same thing as working. Treat the first real call as
 * the actual test.
 *
 * Written with `fetch` rather than `@anthropic-ai/sdk` for one reason: every
 * adapter in this directory then has the same shape, and the differences between
 * providers stay visible as differences in the wire format rather than being
 * hidden behind six SDKs with six conventions. The SDK is the better choice in
 * an app that talks only to Claude; this one deliberately does not.
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

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const API_VERSION = "2023-06-01";

/** USD per million tokens for the default model, converted at ~₹88/USD. */
const INPUT_INR_PER_MTOK = 5 * 88;
const OUTPUT_INR_PER_MTOK = 25 * 88;

type AnthropicResponse = {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export class AnthropicProvider extends BaseProvider {
  readonly id = "anthropic" as const;
  readonly label = "Claude";

  protected readonly defaultModel = "claude-opus-5";
  protected readonly defaultVisionModel = "claude-opus-5";

  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  get capabilities(): Capabilities {
    return { vision: true, jsonSchema: true, streaming: true, contextWindow: 1_000_000 };
  }

  private get apiKey(): string | undefined {
    return this.config.apiKey ?? process.env.ANTHROPIC_API_KEY;
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
        detail: "No ANTHROPIC_API_KEY. Set one to enable Claude; the pipeline runs without it.",
      };
    }

    // A one-token completion is the cheapest way to prove the key works. It
    // costs a fraction of a paisa and answers the only question health can.
    const started = Date.now();
    try {
      await this.generate({ task: "probe", prompt: "Reply with: ok", maxTokens: 8 });
      return { ...base, ok: true, detail: "Ready.", latencyMs: Date.now() - started };
    } catch (error) {
      return { ...base, ok: false, detail: this.normalise(error).message };
    }
  }

  protected async complete(
    request: GenerateRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
  ) {
    return this.messages(request, resolved, []);
  }

  protected async completeVision(
    request: VisionRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
  ) {
    return this.messages(
      request,
      resolved,
      request.images.map((image) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: image.mediaType,
          data: image.data.toString("base64"),
        },
      })),
    );
  }

  private async messages(
    request: GenerateRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
    imageBlocks: Record<string, unknown>[],
  ): Promise<Omit<GenerateResponse, "task" | "provider" | "ms">> {
    if (!this.apiKey) {
      throw new AIError("not-configured", "No ANTHROPIC_API_KEY is set.", this.id);
    }

    const body: Record<string, unknown> = {
      model: resolved.model,
      max_tokens: resolved.maxTokens,
      temperature: resolved.temperature,
      // System is a top-level parameter here, not a message role.
      ...(request.system ? { system: request.system } : {}),
      messages: [
        ...(request.history ?? []).map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user", content: [...imageBlocks, { type: "text", text: request.prompt }] },
      ],
    };

    if (request.schema) {
      body.output_config = {
        format: { type: "json_schema", schema: request.schema.schema },
      };
    }

    const data = (await this.fetchJson(
      `${this.baseUrl}/v1/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify(body),
      },
      request.signal,
    )) as AnthropicResponse;

    // A sketch could depict something the safety classifiers decline. Checking
    // this before reading content turns an unhelpful crash on content[0] into a
    // reportable outcome.
    const refused = data.stop_reason === "refusal";
    const text = refused
      ? ""
      : (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");

    const inputTokens = data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;

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

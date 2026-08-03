/**
 * Ollama — the default, and the only adapter in this codebase that can be
 * verified end to end without buying anything.
 *
 * Uses the HTTP API directly rather than the `ollama` npm client. On this
 * machine the `ollama` binary is not even on PATH while the server runs happily
 * on :11434, which is a good reminder that the daemon is the real interface. It
 * is also two `fetch` calls, so a dependency would be carrying weight it has not
 * earned.
 *
 * Capabilities are derived from the configured model rather than declared for
 * "Ollama" as a whole: whether vision works depends entirely on whether you
 * pulled a vision model.
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
import { BaseProvider, estimateTokens } from "../base.ts";

const DEFAULT_BASE_URL = "http://localhost:11434";

/** Window requested for image requests. Comfortably fits a batch of crops. */
const VISION_CONTEXT = 16384;

/**
 * Model families that can read images.
 *
 * Matched on the name because Ollama's `/api/tags` does not report modality.
 * Being wrong here is recoverable and loud — the request fails with the
 * server's own complaint — whereas assuming every model has vision fails
 * silently with a confident description of nothing.
 */
const VISION_FAMILIES = /qwen2\.?5vl|qwen3-vl|llava|llama3\.2-vision|minicpm-v|moondream|bakllava|granite3\.2-vision|gemma3/i;

type OllamaChatResponse = {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
  done_reason?: string;
};

type OllamaTagsResponse = {
  models?: { name: string; details?: { parameter_size?: string } }[];
};

export class OllamaProvider extends BaseProvider {
  readonly id = "ollama" as const;
  readonly label = "Ollama (local)";

  protected readonly defaultModel = "qwen2.5:3b-instruct";
  protected readonly defaultVisionModel = "qwen2.5vl:3b";

  private readonly baseUrl: string;

  /**
   * Model names the server reported, once `health()` has asked.
   *
   * Capability has to account for this. Matching the configured name against a
   * pattern says a vision model was *requested*, not that one is installed —
   * and the first version of this file happily reported `vision: true` for a
   * model that had never been pulled, which is precisely the confident-nonsense
   * failure the capability model exists to prevent. Until the list is known the
   * name test is the best guess available; afterwards it is the truth.
   */
  private installed: string[] | null = null;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  /** Ollama resolves a bare name to its `:latest` tag, so compare stems too. */
  private isInstalled(model: string): boolean {
    if (this.installed === null) return true;
    const stem = (n: string) => n.split(":")[0];
    return (
      this.installed.includes(model) || this.installed.some((m) => stem(m) === stem(model))
    );
  }

  get capabilities(): Capabilities {
    return {
      vision: VISION_FAMILIES.test(this.visionModel) && this.isInstalled(this.visionModel),
      // Ollama supports a `format` field taking a JSON schema, and honours it
      // via constrained decoding.
      jsonSchema: true,
      streaming: true,
      // Ollama's default is 4096 unless the Modelfile says otherwise; vision
      // requests raise it explicitly, since images are token-expensive.
      contextWindow: VISION_CONTEXT,
    };
  }

  async health(): Promise<ProviderHealth> {
    const started = Date.now();
    const base: Omit<ProviderHealth, "ok" | "detail"> = {
      id: this.id,
      label: this.label,
      model: this.model,
      capabilities: this.capabilities,
    };

    try {
      const tags = (await this.fetchJson(`${this.baseUrl}/api/tags`, {
        method: "GET",
      })) as OllamaTagsResponse;

      const available = (tags.models ?? []).map((m) => m.name);
      this.installed = available;
      const latencyMs = Date.now() - started;

      if (available.length === 0) {
        return {
          ...base,
          ok: false,
          availableModels: [],
          latencyMs,
          detail: `Ollama is running but has no models. Pull one, e.g. \`ollama pull ${this.defaultModel}\`.`,
        };
      }

      if (!this.isInstalled(this.model)) {
        return {
          ...base,
          ok: false,
          availableModels: available,
          latencyMs,
          detail: `Ollama is running but \`${this.model}\` is not installed. Available: ${available.join(", ")}.`,
        };
      }

      // Recomputed, not reused: `base` was built before the model list arrived.
      const capabilities = this.capabilities;

      return {
        ...base,
        capabilities,
        ok: true,
        availableModels: available,
        latencyMs,
        detail: capabilities.vision
          ? `Ready. ${this.model} for text, ${this.visionModel} for images.`
          : `Ready for text. No vision model installed, so image passes will be skipped — ` +
            `pull \`${this.defaultVisionModel}\` to enable them.`,
      };
    } catch (error) {
      const err = this.normalise(error);
      return {
        ...base,
        ok: false,
        detail:
          err.kind === "unreachable"
            ? `Ollama is not reachable at ${this.baseUrl}. Start it with \`ollama serve\`.`
            : err.message,
      };
    }
  }

  protected async complete(
    request: GenerateRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
  ) {
    return this.chat(request, resolved, undefined);
  }

  protected async completeVision(
    request: VisionRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
  ) {
    if (request.images.length === 0) {
      throw new AIError("unsupported", "A vision request needs at least one image.", this.id);
    }
    return this.chat(
      request,
      resolved,
      request.images.map((image) => image.data.toString("base64")),
    );
  }

  private async chat(
    request: GenerateRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
    images: string[] | undefined,
  ): Promise<Omit<GenerateResponse, "task" | "provider" | "ms">> {
    const messages: Record<string, unknown>[] = [];
    if (request.system) messages.push({ role: "system", content: request.system });
    for (const turn of request.history ?? []) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push(
      images ? { role: "user", content: request.prompt, images } : { role: "user", content: request.prompt },
    );

    const body: Record<string, unknown> = {
      model: resolved.model,
      messages,
      stream: false,
      options: {
        temperature: resolved.temperature,
        num_predict: resolved.maxTokens,
        // Ollama defaults to a 4096-token window regardless of what the model
        // supports, and an image costs roughly a thousand tokens — three crops
        // and a prompt overflow it, with the server returning a 400 rather than
        // truncating. Vision requests therefore ask for a larger window
        // explicitly. Text requests keep the default, where it is ample.
        ...(images ? { num_ctx: VISION_CONTEXT } : {}),
      },
    };

    // Ollama takes the JSON schema directly and constrains decoding to it, so
    // the schema does not need restating in the prompt.
    if (request.schema) body.format = request.schema.schema;

    const data = (await this.fetchJson(
      `${this.baseUrl}/api/chat`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
      request.signal,
    )) as OllamaChatResponse;

    const text = data.message?.content ?? "";

    return {
      text,
      model: resolved.model,
      refused: false,
      usage: {
        inputTokens: data.prompt_eval_count ?? estimateTokens(request.prompt),
        outputTokens: data.eval_count ?? estimateTokens(text),
        // Local inference costs electricity, not money. Reporting a number here
        // would only make cloud comparisons look worse than they are.
        estimatedCostInr: 0,
      },
    };
  }
}

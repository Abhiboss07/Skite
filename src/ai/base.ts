/**
 * Shared provider machinery.
 *
 * `generate` and `generateVision` are the only genuine capabilities; the other
 * three interface methods are task-shaped presets over `generate` — different
 * defaults, different system prompts, nothing a provider implements differently.
 * Putting them here rather than in the interface's six implementations avoids
 * six copies of the same three wrappers drifting apart.
 *
 * Subclasses implement exactly two methods: `complete` and `completeVision`.
 */

import {
  AIError,
  type AIProvider,
  type Capabilities,
  type GenerateRequest,
  type GenerateResponse,
  type ProviderConfig,
  type ProviderHealth,
  type ProviderId,
  type Task,
  type VisionRequest,
} from "./types.ts";

/**
 * Per-task defaults.
 *
 * Temperature is the interesting column. Labelling a wireframe and transcribing
 * handwriting have correct answers, so they run at 0 — a creative classifier is
 * simply a wrong one. Copy has no correct answer and would be lifeless at 0.
 */
const TASK_DEFAULTS: Record<Task, { temperature: number; maxTokens: number }> = {
  classify: { temperature: 0, maxTokens: 4000 },
  ocr: { temperature: 0, maxTokens: 2000 },
  copy: { temperature: 0.7, maxTokens: 1500 },
  enhance: { temperature: 0.4, maxTokens: 2000 },
  code: { temperature: 0, maxTokens: 8000 },
  prompt: { temperature: 0.3, maxTokens: 1500 },
  summarize: { temperature: 0.2, maxTokens: 1000 },
  probe: { temperature: 0, maxTokens: 16 },
};

const CODE_SYSTEM = `You write TypeScript and React. Return only code — no prose,
no explanation, no markdown fence. If you cannot satisfy the request exactly,
return the closest correct code rather than inventing an API that does not exist.`;

const PROMPT_SYSTEM = `You rewrite instructions to be clearer and more specific.
Return only the rewritten instruction. Preserve every constraint in the original;
do not add requirements the original did not state.`;

const SUMMARIZE_SYSTEM = `You summarise faithfully. Include only what the source
says. If the source is ambiguous, preserve the ambiguity rather than resolving it.`;

export abstract class BaseProvider implements AIProvider {
  abstract readonly id: ProviderId;
  abstract readonly label: string;
  abstract readonly capabilities: Capabilities;

  protected readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  get model(): string {
    return this.config.model ?? this.defaultModel;
  }

  protected get visionModel(): string {
    return this.config.visionModel ?? this.config.model ?? this.defaultVisionModel;
  }

  protected get timeoutMs(): number {
    // Generous by default: a 3B model on a laptop GPU genuinely takes tens of
    // seconds for a long classification, and killing it at 10s would make local
    // development look broken when it is merely slow.
    return this.config.timeoutMs ?? 120_000;
  }

  protected abstract readonly defaultModel: string;
  protected abstract readonly defaultVisionModel: string;

  /** The one method a subclass must implement for text. */
  protected abstract complete(
    request: GenerateRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
  ): Promise<Omit<GenerateResponse, "task" | "provider" | "ms">>;

  /** The one method a subclass must implement for images. */
  protected abstract completeVision(
    request: VisionRequest,
    resolved: { temperature: number; maxTokens: number; model: string },
  ): Promise<Omit<GenerateResponse, "task" | "provider" | "ms">>;

  abstract health(): Promise<ProviderHealth>;

  /* ── the two real capabilities ───────────────────────────────────── */

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    return this.run(request, false);
  }

  async generateVision(request: VisionRequest): Promise<GenerateResponse> {
    if (!this.capabilities.vision) {
      throw new AIError(
        "unsupported",
        `${this.label} is configured with ${this.model}, which cannot read images. ` +
          `Configure a vision-capable model, or use a provider that has one.`,
        this.id,
      );
    }
    return this.run(request, true);
  }

  /* ── task presets ────────────────────────────────────────────────── */

  async generateCode(request: GenerateRequest): Promise<GenerateResponse> {
    return this.generate({
      ...request,
      task: "code",
      system: request.system ?? CODE_SYSTEM,
    });
  }

  async generatePrompt(request: GenerateRequest): Promise<GenerateResponse> {
    return this.generate({
      ...request,
      task: "prompt",
      system: request.system ?? PROMPT_SYSTEM,
    });
  }

  async summarize(request: GenerateRequest): Promise<GenerateResponse> {
    return this.generate({
      ...request,
      task: "summarize",
      system: request.system ?? SUMMARIZE_SYSTEM,
    });
  }

  /* ── shared execution path ───────────────────────────────────────── */

  private async run(request: GenerateRequest, vision: boolean): Promise<GenerateResponse> {
    const defaults = TASK_DEFAULTS[request.task];
    const resolved = {
      temperature: request.temperature ?? defaults.temperature,
      maxTokens: request.maxTokens ?? defaults.maxTokens,
      model: request.model ?? (vision ? this.visionModel : this.model),
    };

    const started = Date.now();
    let raw;
    try {
      raw = vision
        ? await this.completeVision(request as VisionRequest, resolved)
        : await this.complete(request, resolved);
    } catch (error) {
      throw this.normalise(error);
    }

    const response: GenerateResponse = {
      ...raw,
      task: request.task,
      provider: this.id,
      ms: Date.now() - started,
    };

    // A schema was asked for, so unvalidated text is not an acceptable answer.
    // Providers with server-side constrained decoding will already have set
    // `json`; the rest are parsed here, and a failure is an error rather than a
    // silent pass-through of prose the caller will treat as data.
    if (request.schema && response.json === undefined && !response.refused) {
      response.json = parseJson(response.text, this.id);
    }

    return response;
  }

  /**
   * Turn whatever a transport threw into a typed AIError.
   *
   * Callers decide what to do from `kind`, and every unhandled shape becoming
   * `provider-error` is fine — what matters is that nothing escapes as a bare
   * `TypeError: fetch failed`, which tells the report nothing.
   */
  protected normalise(error: unknown): AIError {
    if (error instanceof AIError) return error;

    if (error instanceof DOMException && error.name === "AbortError") {
      return new AIError("timeout", `${this.label} did not respond within ${this.timeoutMs} ms.`, this.id, error);
    }

    const message = error instanceof Error ? error.message : String(error);
    if (/ECONNREFUSED|fetch failed|ENOTFOUND|EAI_AGAIN/i.test(message)) {
      return new AIError("unreachable", `${this.label} is not reachable: ${message}`, this.id, error);
    }

    return new AIError("provider-error", `${this.label} failed: ${message}`, this.id, error);
  }

  /** Fetch with the provider's timeout, honouring a caller's own signal too. */
  protected async fetchJson(
    url: string,
    init: RequestInit,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new AIError(
          response.status === 429 ? "rate-limited" : "provider-error",
          `${this.label} returned ${response.status}: ${body.slice(0, 400)}`,
          this.id,
        );
      }

      return await response.json();
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
}

/**
 * Parse model output that is supposed to be JSON.
 *
 * Small local models routinely wrap JSON in a markdown fence or add a sentence
 * before it, despite being told not to. Stripping a fence and locating the outer
 * braces is not being lax about the contract — the contract is still "valid JSON
 * or an error", and this only removes packaging the model added around a payload
 * that is otherwise correct.
 */
export function parseJson(text: string, provider: ProviderId): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through to the error below */
      }
    }
    throw new AIError(
      "invalid-output",
      `Expected JSON but could not parse the response. First 200 characters: ${cleaned.slice(0, 200)}`,
      provider,
    );
  }
}

/** Rough token estimate for providers that do not report usage. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

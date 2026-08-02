/**
 * The provider contract.
 *
 * Nothing outside `src/ai/` may name a provider. Every pass that wants a model
 * asks the registry for an `AIProvider` and calls one of five methods; whether
 * that reaches a 3B model on localhost or a frontier model over the network is
 * a configuration question, not a code question.
 *
 * The reason this exists before any provider does: a pipeline that says
 * `callClaude()` has chosen its vendor permanently, in every file that calls it.
 * Choosing once, here, costs an interface.
 */

import { z } from "zod";

/* ── identity ──────────────────────────────────────────────────────── */

export const PROVIDER_IDS = [
  "ollama",
  "anthropic",
  "openai",
  "gemini",
  "openrouter",
  "openai-compatible",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

/**
 * Human-facing names. `openai-compatible` is deliberately broad: OpenRouter,
 * Antigravity, LM Studio, vLLM, Together and most self-hosted servers all speak
 * the same wire format, and one adapter parameterised by base URL covers them
 * all — plus whatever appears next month.
 */
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  ollama: "Ollama (local)",
  anthropic: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
  openrouter: "OpenRouter",
  "openai-compatible": "OpenAI-compatible endpoint",
};

/* ── capabilities ──────────────────────────────────────────────────── */

/**
 * What a provider can actually do, declared rather than assumed.
 *
 * Asking a text-only model to read an image should fail immediately with a
 * sentence explaining why, not return a confident description of an image it
 * never received.
 */
export type Capabilities = {
  vision: boolean;
  /** Server-side constrained decoding against a JSON schema. */
  jsonSchema: boolean;
  streaming: boolean;
  /** Tokens. Best-effort; used for budgeting, not enforcement. */
  contextWindow: number;
};

/* ── tasks ─────────────────────────────────────────────────────────── */

/**
 * Every call is labelled with the job it serves.
 *
 * This is what makes per-task measurement possible — "the vision pass improves
 * component accuracy from X to Y, at Z ms and ₹W per run" is a sentence you can
 * only write if the layer recorded which calls were classification.
 */
export const TASKS = [
  "classify",
  "ocr",
  "copy",
  "enhance",
  "code",
  "prompt",
  "summarize",
  "probe",
] as const;

export type Task = (typeof TASKS)[number];

/* ── requests ──────────────────────────────────────────────────────── */

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateRequest = {
  task: Task;
  system?: string;
  prompt: string;
  /** Prior turns, when the call is conversational. Most passes here are not. */
  history?: Message[];
  /** 0 = deterministic. Defaults are per-task, not per-call. */
  temperature?: number;
  maxTokens?: number;
  /**
   * Ask for JSON matching this schema. Providers that support constrained
   * decoding enforce it server-side; the rest get it appended to the prompt and
   * are validated locally. Either way the caller gets validated output or an
   * error — never unvalidated text posing as JSON.
   */
  schema?: { name: string; schema: Record<string, unknown> };
  /** Overrides the provider's configured model for this call. */
  model?: string;
  signal?: AbortSignal;
};

export type VisionRequest = GenerateRequest & {
  /** Raw image bytes. The adapter handles encoding for its own wire format. */
  images: { data: Buffer; mediaType: "image/png" | "image/jpeg" | "image/webp" }[];
};

/* ── responses ─────────────────────────────────────────────────────── */

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  /**
   * Estimated, in INR, and zero for local models because local models are free.
   * Estimated rather than billed — the number is for comparing providers, and
   * it should never be presented as an invoice.
   */
  estimatedCostInr: number;
};

export type GenerateResponse = {
  text: string;
  /** Present when `schema` was requested and parsing succeeded. */
  json?: unknown;
  provider: ProviderId;
  model: string;
  task: Task;
  ms: number;
  usage: Usage;
  /** True when the provider declined rather than failed. */
  refused: boolean;
};

/* ── errors ────────────────────────────────────────────────────────── */

export type AIErrorKind =
  | "not-configured"
  | "unreachable"
  | "unsupported"
  | "rate-limited"
  | "timeout"
  | "invalid-output"
  | "refused"
  | "provider-error";

/**
 * A typed failure, because callers respond differently to different failures.
 *
 * The pipeline treats every one of these as "carry on without the model" — but
 * the report has to say which happened, since "Ollama is not running" and "the
 * model returned malformed JSON" send you to completely different places.
 */
export class AIError extends Error {
  readonly kind: AIErrorKind;
  readonly provider?: ProviderId;
  readonly cause?: unknown;

  // Fields are declared and assigned explicitly rather than written as
  // constructor parameter properties. Those need real code generation, and Node
  // runs this file by stripping types without transforming anything — which the
  // pipeline depends on, since the benchmark harness executes it under plain
  // `node` with no build step.
  constructor(kind: AIErrorKind, message: string, provider?: ProviderId, cause?: unknown) {
    super(message);
    this.name = "AIError";
    this.kind = kind;
    this.provider = provider;
    this.cause = cause;
  }

  /** Whether retrying the same call could plausibly succeed. */
  get retryable(): boolean {
    return this.kind === "rate-limited" || this.kind === "timeout" || this.kind === "unreachable";
  }
}

/* ── the interface ─────────────────────────────────────────────────── */

export interface AIProvider {
  readonly id: ProviderId;
  readonly label: string;
  /** The model this instance will use unless a call overrides it. */
  readonly model: string;
  readonly capabilities: Capabilities;

  /** Is this provider usable right now? Never throws; reports instead. */
  health(): Promise<ProviderHealth>;

  generate(request: GenerateRequest): Promise<GenerateResponse>;
  generateVision(request: VisionRequest): Promise<GenerateResponse>;
  generateCode(request: GenerateRequest): Promise<GenerateResponse>;
  generatePrompt(request: GenerateRequest): Promise<GenerateResponse>;
  summarize(request: GenerateRequest): Promise<GenerateResponse>;
}

export type ProviderHealth = {
  id: ProviderId;
  label: string;
  ok: boolean;
  /** Why not, in a sentence a person can act on. */
  detail: string;
  model: string;
  capabilities: Capabilities;
  /** Models the provider reports as available, when it can tell us. */
  availableModels?: string[];
  latencyMs?: number;
};

/* ── configuration ─────────────────────────────────────────────────── */

export const ProviderConfigSchema = z.object({
  id: z.enum(PROVIDER_IDS),
  model: z.string().optional(),
  visionModel: z.string().optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  /** Per-request ceiling. Local models on a laptop are slow; be generous. */
  timeoutMs: z.number().int().positive().optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Pass 4b — vision classification (online path).
 *
 * Same interface as the heuristic classifier, so the pipeline can swap them and
 * the evaluation harness can measure the difference.
 *
 * Loaded via dynamic import so a missing SDK or key degrades to the heuristic
 * rather than breaking the pipeline at module load.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import type { Structured } from "../geometry/grid.ts";
import { ClassificationSchema, type Classification } from "../ir/schema.ts";
import { CLASSIFY_PROMPT_VERSION } from "../prompts/classify.ts";

const MODEL = "claude-opus-5";

/**
 * The output schema, sent as `output_config.format`.
 *
 * There is no coordinate field anywhere in it, and `additionalProperties` is
 * false. A model that wanted to move a region has no channel to express it —
 * layout preservation is enforced by the schema, not requested in the prompt.
 */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    regions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          role: {
            type: "string",
            enum: [
              "navbar", "hero", "heading", "paragraph", "button",
              "image", "card", "grid", "footer", "unknown",
            ],
          },
          confidence: { type: "number" },
          text: { type: "string" },
          textConfidence: { type: "number" },
        },
        required: ["id", "role", "confidence", "text", "textConfidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["regions"],
  additionalProperties: false,
} as const;

export async function classifyWithVision(
  structured: Structured,
  imagePng: Buffer,
  prompt: string,
): Promise<Classification & { engine: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    // Adaptive thinking is on by default on this model; `high` is the right
    // effort for a fidelity-critical labelling pass without paying for xhigh.
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: imagePng.toString("base64"),
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  // A sketch could depict something the safety classifiers decline. Checking
  // stop_reason before reading content avoids an unhelpful crash on content[0].
  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to classify this image");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in the model response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("Model output was not valid JSON");
  }

  const result = ClassificationSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Model output failed the IR schema: ${z.prettifyError(result.error)}`);
  }

  // Guard against a partial answer: any region the model skipped is marked
  // unknown at zero confidence rather than silently dropped, so the gap is
  // visible in the report instead of looking like a clean run.
  const returned = new Map(result.data.regions.map((r) => [r.id, r]));
  const regions = structured.nodes.map(
    (n) =>
      returned.get(n.id) ?? {
        id: n.id,
        role: "unknown" as const,
        confidence: 0,
        text: "",
        textConfidence: 0,
      },
  );

  return { engine: `${MODEL} (${CLASSIFY_PROMPT_VERSION})`, regions };
}

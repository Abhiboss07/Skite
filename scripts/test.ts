/**
 * Contract tests for the pipeline.
 *
 *   npm test
 *
 * These assert the invariants the project claims, on real output rather than on
 * mocks. They exist because of a specific failure: the semantic IR failed its
 * own Zod schema on every single run for two releases — the root node carried
 * `order: -1` against a non-negative index — and nothing broke. The pipeline
 * pushed the failure into a `warnings` array, the Studio rendered it in an
 * amber panel, the build passed, the benchmark passed, and everyone read past
 * it.
 *
 * A warning nobody fails on is a warning nobody reads. Anything the code calls
 * a contract should be asserted here, so breaking it stops the build.
 *
 * Runs offline: no model, no network, no API key. The OCR path is deliberately
 * not exercised — it needs Ollama, takes ~17s per image, and is opt-in.
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { runPipeline } from "../src/pipeline/run.ts";
import { IRSchema } from "../src/pipeline/ir/schema.ts";
import { SemanticIRSchema } from "../src/pipeline/semantic/schema.ts";
import { DesignTokensSchema, assertNoLayoutTokens } from "../src/pipeline/design/tokens.ts";
import { readText, textFits } from "../src/pipeline/ocr/read.ts";
import type { AIProvider } from "../src/ai/types.ts";

const root = join(import.meta.dirname, "..");
const realImage = join(root, "Test Images", "website-wireframe-services.jpg");

/** A few synthetic samples, for breadth without paying for all sixty. */
function syntheticSamples(limit: number): string[] {
  const dir = join(root, "test-dataset", "synthetic");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .sort()
    // Spread across styles rather than taking the first N, which would all be
    // sketches and would miss the vector and wireframe paths entirely.
    .filter((_, i) => i % 7 === 0)
    .slice(0, limit)
    .map((f) => join(dir, f));
}

const images = [realImage, ...syntheticSamples(6)].filter(existsSync);

test("every IR the pipeline produces validates against its own schema", async () => {
  for (const image of images) {
    const result = await runPipeline(readFileSync(image), { classifier: "heuristic", ocr: false });

    const detection = IRSchema.safeParse(result.ir);
    assert.ok(
      detection.success,
      `detection IR invalid for ${image}: ${detection.success ? "" : JSON.stringify(detection.error.issues[0])}`,
    );

    // The regression this file was written for.
    const semantic = SemanticIRSchema.safeParse(result.semantic);
    assert.ok(
      semantic.success,
      `semantic IR invalid for ${image}: ${semantic.success ? "" : JSON.stringify(semantic.error.issues[0])}`,
    );

    const tokens = DesignTokensSchema.safeParse(result.design);
    assert.ok(
      tokens.success,
      `design tokens invalid for ${image}: ${tokens.success ? "" : JSON.stringify(tokens.error.issues[0])}`,
    );
  }
});

test("a run reports no schema failures in its warnings", async () => {
  // Belt and braces against the original bug's *shape*: validation failing while
  // the run continues. Even if a future schema check stops throwing, a warning
  // mentioning a schema must fail the build.
  for (const image of images) {
    const result = await runPipeline(readFileSync(image), { classifier: "heuristic", ocr: false });
    const schemaWarnings = result.warnings.filter((w) => /schema/i.test(w));
    assert.deepEqual(schemaWarnings, [], `${image} reported schema warnings`);
  }
});

test("design tokens carry no layout", async () => {
  const result = await runPipeline(readFileSync(realImage), { classifier: "heuristic", ocr: false });
  assert.doesNotThrow(() => assertNoLayoutTokens(result.design, "test"));
});

test("the design pass moves nothing", async () => {
  for (const image of images) {
    const result = await runPipeline(readFileSync(image), { classifier: "heuristic", ocr: false });
    assert.ok(result.drift.ok, `layout drift on ${image}: ${JSON.stringify(result.drift.violations[0])}`);
    // Compared with a tolerance, not for equality. These are means over
    // per-node IoUs that are each exactly 1, and summing then dividing lands on
    // 1.0000000000000004 — a float artefact, not movement. Asserting equality
    // would fail on arithmetic rather than on drift.
    const exact = (v: number) => Math.abs(v - 1) < 1e-9;
    assert.ok(exact(result.drift.geometry), `geometry drift on ${image}: ${result.drift.geometry}`);
    assert.ok(exact(result.drift.coverage), `coverage drift on ${image}: ${result.drift.coverage}`);
  }
});

test("generated code parses and passes the responsive lint", async () => {
  for (const image of images) {
    const result = await runPipeline(readFileSync(image), { classifier: "heuristic", ocr: false });
    assert.equal(
      result.report.buildStatus,
      "passed",
      `${image}: ${result.report.validation.issues.map((i) => `${i.rule} ${i.message}`).join("; ")}`,
    );
  }
});

test("the offline path invents no text", async () => {
  // The heuristic classifier cannot read. It must report empty content rather
  // than plausible-looking copy, or the OCR metric silently measures nothing.
  const result = await runPipeline(readFileSync(realImage), { classifier: "heuristic", ocr: false });
  const withText = result.ir.nodes.filter((n) => n.content?.text);
  assert.equal(withText.length, 0, "the offline classifier produced text it could not have read");
  assert.equal(result.report.textExtracted, false);
});

/* ── transcription ─────────────────────────────────────────────────── */

/**
 * A provider that records how it was called and answers instantly.
 *
 * No Ollama, no network, no 18 seconds — the thing under test is the *calling
 * pattern*, not the model.
 */
function recordingProvider(): AIProvider & { calls: number[] } {
  const calls: number[] = [];
  return {
    calls,
    id: "ollama",
    label: "stub",
    model: "stub",
    capabilities: { vision: true, jsonSchema: true, streaming: false, contextWindow: 16384 },
    async health() {
      return {
        id: "ollama" as const,
        label: "stub",
        ok: true,
        detail: "ready",
        model: "stub",
        capabilities: { vision: true, jsonSchema: true, streaming: false, contextWindow: 16384 },
      };
    },
    async generateVision(request) {
      calls.push(request.images.length);
      return {
        text: "",
        json: { text: "HELLO", confidence: 0.9 },
        provider: "ollama" as const,
        model: "stub",
        task: request.task,
        ms: 0,
        usage: { inputTokens: 0, outputTokens: 0, estimatedCostInr: 0 },
        refused: false,
      };
    },
    async generate() {
      throw new Error("not used");
    },
    async generateCode() {
      throw new Error("not used");
    },
    async generatePrompt() {
      throw new Error("not used");
    },
    async summarize() {
      throw new Error("not used");
    },
  } as AIProvider & { calls: number[] };
}

test("transcription sends exactly one image per request", async () => {
  // The regression this guards. Batching several crops into one call made the
  // model attend to one image and attribute its text to a different crop's id:
  // the CONTACT button read as "LOGO", a caption returned a heading's text, and
  // the logo and hero headline returned nothing at all. Sent alone, all three
  // read correctly. Any future batching reintroduces that failure.
  const result = await runPipeline(readFileSync(realImage), { classifier: "heuristic", ocr: false });
  const provider = recordingProvider();
  const ocr = await readText(result.ir, Buffer.from(result.images.working.split(",")[1], "base64"), {
    provider,
  });

  assert.ok(provider.calls.length > 0, "no transcription requests were made");
  assert.deepEqual(
    [...new Set(provider.calls)],
    [1],
    `every request must carry exactly one image; saw batches of ${[...new Set(provider.calls)].join(", ")}`,
  );
  assert.equal(ocr.ran, true);
});

test("a transcription that cannot fit its box is flagged", async () => {
  // The independent second opinion on a read. A model's confidence is its
  // opinion of itself; this is arithmetic about the box.
  assert.equal(textFits("ABOUT", { w: 79, h: 20 }, 1), true);
  assert.equal(
    textFits("Body copy from your sketch will appear here, and then some more.", { w: 79, h: 20 }, 1),
    false,
    "sixty characters cannot fit a 79x20 box",
  );
  // A two-line answer in a region the detector recorded as one line must not be
  // flagged — text merging folds drawn lines together, and judging the answer
  // against the recorded count cried wolf on a correct read.
  assert.equal(
    textFits("HEADLINE\nLorem ipsum dolor sit amet, consectetur adipiscing", { w: 647, h: 165 }, 1),
    true,
  );
});

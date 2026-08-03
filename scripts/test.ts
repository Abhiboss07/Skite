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

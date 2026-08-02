/**
 * Verifies the vision path end to end: capability detection, image transport,
 * and schema-constrained output on a real sketch.
 *
 *   node scripts/ai-vision-test.ts [sample]
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveProvider } from "../src/ai/registry.ts";

const sample = process.argv[2] ?? "sketch-001";
const image = readFileSync(join(import.meta.dirname, "..", "test-dataset", "synthetic", `${sample}.png`));

const provider = resolveProvider("ollama");
const health = await provider.health();

console.log(`provider   ${health.label}`);
console.log(`health     ${health.ok ? "ok" : "not ok"} — ${health.detail}`);
console.log(`vision     ${health.capabilities.vision}`);

if (!health.capabilities.vision) {
  console.log("\nVision not available; nothing further to test.");
  process.exit(1);
}

console.log(`\nimage      ${sample}.png, ${(image.length / 1e6).toFixed(2)} MB\n`);

// 1. Can it see the image at all?
const describe = await provider.generateVision({
  task: "ocr",
  images: [{ data: image, mediaType: "image/png" }],
  prompt:
    "This is a hand-drawn website wireframe. In one sentence, describe its overall layout " +
    "from top to bottom. Do not list every element.",
});
console.log(`describe   ${describe.ms}ms  ${describe.usage.inputTokens}→${describe.usage.outputTokens} tok`);
console.log(`  ${describe.text.trim().replace(/\s+/g, " ").slice(0, 300)}\n`);

// 2. Schema-constrained output — the shape the classification pass needs.
const structured = await provider.generateVision({
  task: "classify",
  images: [{ data: image, mediaType: "image/png" }],
  prompt:
    "Identify the major horizontal bands of this wireframe, top to bottom. " +
    "Use only these roles: navbar, hero, grid, card, footer, unknown.",
  schema: {
    name: "bands",
    schema: {
      type: "object",
      properties: {
        bands: {
          type: "array",
          items: {
            type: "object",
            properties: {
              order: { type: "integer" },
              role: { type: "string", enum: ["navbar", "hero", "grid", "card", "footer", "unknown"] },
            },
            required: ["order", "role"],
          },
        },
      },
      required: ["bands"],
    },
  },
});
console.log(`classify   ${structured.ms}ms  parsed: ${structured.json !== undefined}`);
console.log(`  ${JSON.stringify(structured.json)}`);

// Ground truth for comparison — this is the point of having a labelled corpus.
const truth = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "test-dataset", "synthetic", `${sample}.truth.json`), "utf8"),
) as { nodes: { role: string; parent: string | null }[] };
const expected = truth.nodes.filter((n) => n.parent === null).map((n) => n.role);
console.log(`\nground truth top-level bands: ${expected.join(" → ")}`);

/**
 * Probe every configured provider and, if a local model is available, run one
 * real generation through the layer.
 *
 *   node scripts/ai-probe.ts
 */

import { probeAll, resolveProvider } from "../src/ai/registry.ts";

const health = await probeAll();

console.log("Provider status\n" + "─".repeat(78));
for (const h of health) {
  const mark = h.ok ? "✓" : "·";
  const caps = [
    h.capabilities.vision ? "vision" : null,
    h.capabilities.jsonSchema ? "json" : null,
  ].filter(Boolean).join(" ");
  console.log(`${mark} ${h.label.padEnd(30)} ${h.ok ? `${h.model} [${caps}]` : ""}`);
  console.log(`  ${h.detail}`);
  if (h.availableModels?.length) console.log(`  models: ${h.availableModels.join(", ")}`);
}

const ollama = health.find((h) => h.id === "ollama");
if (!ollama?.ok) {
  console.log("\nNo local provider ready — skipping the live generation test.");
  process.exit(0);
}

console.log("\n" + "─".repeat(78) + "\nLive test through the provider layer\n");
const provider = resolveProvider("ollama");

const plain = await provider.generate({
  task: "summarize",
  prompt: "In one short sentence, what is a wireframe?",
});
console.log(`generate()      ${plain.ms}ms  ${plain.usage.inputTokens}→${plain.usage.outputTokens} tok`);
console.log(`  ${plain.text.trim().slice(0, 160)}`);

// Schema-constrained output is the path the classification pass depends on.
const structured = await provider.generate({
  task: "classify",
  prompt:
    "A wireframe has a bar across the top holding a logo and links, and a bar " +
    "at the very bottom with small print. Label these two regions.",
  schema: {
    name: "regions",
    schema: {
      type: "object",
      properties: {
        regions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              role: { type: "string", enum: ["navbar", "hero", "footer", "card", "unknown"] },
            },
            required: ["id", "role"],
          },
        },
      },
      required: ["regions"],
    },
  },
});
console.log(`\ngenerate(schema) ${structured.ms}ms  parsed: ${structured.json !== undefined}`);
console.log(`  ${JSON.stringify(structured.json)}`);

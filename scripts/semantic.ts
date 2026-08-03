/** Prints the semantic tree for one image. */
import { readFileSync } from "node:fs";
import { runPipeline } from "../src/pipeline/run.ts";
import type { SemanticNode } from "../src/pipeline/semantic/schema.ts";

const input = process.argv[2] ?? "Test Images/website-wireframe-services.jpg";
const { semantic } = await runPipeline(readFileSync(input), { classifier: "heuristic", sourceKind: "wireframe" });

const show = (n: SemanticNode, depth = 0) => {
  const pad = "  ".repeat(depth);
  const l = n.layout;
  const flow = l.direction === "none" ? "" : ` ${l.direction}${l.direction === "row" ? `×${l.columns}` : ""} gap=${l.gap} align=${l.align}`;
  console.log(
    `${pad}${n.type}${n.inferred ? " *" : ""}  ${Math.round(n.box.w)}×${Math.round(n.box.h)}` +
    ` span=${l.span}/${semantic.canvas.columns}${flow}  ${(n.evidence.confidence * 100).toFixed(0)}% ${n.evidence.rule}`,
  );
  for (const c of n.children) show(c, depth + 1);
};

console.log(`semantic-1.0 · ${semantic.engine} · ${semantic.ms}ms · canvas ${semantic.canvas.w}×${semantic.canvas.h}\n`);
show(semantic.root);
console.log(`\nsummary: ${JSON.stringify(semantic.summary)}`);
console.log(`undecidable without OCR: ${semantic.undecidable.join(", ") || "none"}`);
console.log(`\n* = inferred grouping, no corresponding ink`);

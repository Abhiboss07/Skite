/**
 * Full-stage analysis of a single image, for real-world testing.
 *
 *   node scripts/analyse.ts "Test Images/website-wireframe-services.jpg"
 *
 * Dumps every intermediate to /reports/assets and prints a stage-by-stage
 * account. Ground truth, if a matching `.truth.json` sits beside the image, is
 * loaded only after the run.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { runPipeline } from "../src/pipeline/run.ts";
import { scoreFidelity, type ScorableNode } from "../src/pipeline/fidelity/score.ts";

const input = process.argv[2];
if (!input) {
  console.error("usage: node scripts/analyse.ts <image>");
  process.exit(1);
}

const slug = basename(input).replace(/\.[^.]+$/, "");
const outDir = join(import.meta.dirname, "..", "reports", "assets");
mkdirSync(outDir, { recursive: true });

const buffer = readFileSync(input);
const result = await runPipeline(buffer, { classifier: "heuristic", sourceKind: "wireframe" });

writeFileSync(join(outDir, `${slug}-working.png`), Buffer.from(result.images.working.split(",")[1], "base64"));
writeFileSync(join(outDir, `${slug}-cleaned.png`), Buffer.from(result.images.cleaned.split(",")[1], "base64"));

const { ir, report } = result;

console.log(`image      ${input}`);
console.log(`source     ${ir.source.pixels.w}×${ir.source.pixels.h}px`);
console.log(`canvas     ${ir.canvas.w}×${ir.canvas.h}`);
console.log(`ok         ${result.ok}   total ${report.totalMs}ms`);
console.log(`passes     ${report.passes.map((p) => `${p.pass} ${p.ms}ms`).join(" · ")}`);
console.log(`grid       ${JSON.stringify(report.grid)}`);
console.log(`confidence ${JSON.stringify(report.confidence)}`);
console.log(`components ${JSON.stringify(report.components)}`);
console.log(`build      ${report.buildStatus} (${report.validation.issues.length} issue(s))`);
if (result.warnings.length) {
  console.log(`warnings:`);
  for (const w of result.warnings) console.log(`  · ${w}`);
}

console.log(`\n${ir.nodes.length} regions, in reading order:`);
for (const n of [...ir.nodes].sort((a, b) => a.order - b.order)) {
  console.log(
    `  ${String(n.order).padStart(2)} ${n.id.padEnd(5)} ${n.role.padEnd(9)} ` +
      `${String(Math.round(n.roleConfidence * 100)).padStart(3)}%  ` +
      `${String(Math.round(n.box.x)).padStart(4)},${String(Math.round(n.box.y)).padStart(4)} ` +
      `${String(Math.round(n.box.w)).padStart(4)}×${String(Math.round(n.box.h)).padStart(4)}  ` +
      `parent=${n.parent ?? "—"}  fill=${n.evidence.interiorFill.toFixed(2)} ink=${n.evidence.interiorInk.toFixed(3)}`,
  );
}

// Ground truth is optional and is read only now, after the pipeline has run.
const truthPath = join(dirname(input), `${slug}.truth.json`);
let scored = null;
if (existsSync(truthPath)) {
  const truth = JSON.parse(readFileSync(truthPath, "utf8")) as {
    canvas: { w: number; h: number };
    nodes: { id: string; role: string; box: { x: number; y: number; w: number; h: number } }[];
  };
  const reference: ScorableNode[] = truth.nodes.map((n, i) => ({ id: n.id, role: n.role, box: n.box, order: i }));
  const produced: ScorableNode[] = ir.nodes.map((n) => ({ id: n.id, role: n.role, box: n.box, order: n.order }));
  scored = scoreFidelity({ nodes: reference, canvas: truth.canvas }, { nodes: produced, canvas: ir.canvas });

  console.log(`\nagainst ground truth (${truth.nodes.length} regions):`);
  const p = (v: number) => `${(v * 100).toFixed(1)}%`;
  console.log(`  fidelity ${p(scored.fidelity)}  geometry ${p(scored.geometry)}  order ${p(scored.order)}`);
  console.log(`  coverage ${p(scored.coverage)}  precision ${p(scored.precision)}  recall ${p(scored.recall)}  F1 ${p(scored.f1)}`);
  console.log(`  component accuracy ${p(scored.componentAccuracy)}   FP ${scored.falsePositives}  FN ${scored.falseNegatives}`);
  console.log(`\n  per reference region:`);
  for (const n of scored.perNode) {
    const mark = n.producedId ? (n.expectedRole === n.actualRole ? "✓" : "~") : "✗";
    console.log(
      `    ${mark} ${n.referenceId.padEnd(5)} ${n.expectedRole.padEnd(9)} → ` +
        `${(n.actualRole ?? "MISSED").padEnd(9)} IoU ${n.iou.toFixed(2)}`,
    );
  }
} else {
  console.log(`\nNo ground truth at ${truthPath} — accuracy cannot be measured.`);
}

writeFileSync(
  join(outDir, `${slug}-analysis.json`),
  JSON.stringify({ image: input, ir, tree: result.tree, code: result.code, report, warnings: result.warnings, scored }, null, 2),
);
console.log(`\nartefacts → reports/assets/${slug}-*`);

/** Runs the pipeline with transcription on and shows what was read. */
import { readFileSync } from "node:fs";
import { runPipeline } from "../src/pipeline/run.ts";

const input = process.argv[2] ?? "Test Images/website-wireframe-services.jpg";
const started = Date.now();
const r = await runPipeline(readFileSync(input), { classifier: "heuristic", sourceKind: "wireframe", ocr: true });

const o = r.report.ocr;
console.log(`ocr        ran=${o.ran} · ${o.engine} · ${o.ms}ms`);
console.log(`regions    ${o.read}/${o.attempted} read · mean confidence ${(o.confidence * 100).toFixed(0)}%`);
if (o.note) console.log(`note       ${o.note}`);
console.log(`total      ${r.report.totalMs}ms (wall ${Date.now() - started}ms)`);
console.log(`build      ${r.report.buildStatus} · drift ${r.drift.ok ? "none" : r.drift.violations.length}`);

console.log(`\ntranscribed:`);
for (const n of r.ir.nodes.filter((n) => n.content?.text)) {
  console.log(`  ${n.id.padEnd(6)} ${n.role.padEnd(9)} ${Math.round(n.box.w)}×${Math.round(n.box.h)}  ${(n.content!.confidence * 100).toFixed(0)}%  "${n.content!.text}"`);
}
const boiler = r.code.match(/Heading goes here|Body copy from your sketch/g) ?? [];
console.log(`\nplaceholder strings left in the generated code: ${boiler.length}`);

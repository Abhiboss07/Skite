/** Prints the generated design tokens and the layout-drift check. */
import { readFileSync } from "node:fs";
import { runPipeline } from "../src/pipeline/run.ts";

const input = process.argv[2] ?? "Test Images/website-wireframe-services.jpg";
const { design, drift } = await runPipeline(readFileSync(input), {
  classifier: "heuristic",
  sourceKind: "wireframe",
});

const p = design.palette;
console.log(`tokens-1.0 · ${design.engine} · ${design.ms}ms\n`);
console.log(`palette (${p.source})`);
console.log(`  background ${p.background}   surface ${p.surface}   border ${p.border}`);
console.log(`  foreground ${p.foreground} (${p.contrast.foreground}:1)   muted ${p.muted} (${p.contrast.muted}:1)`);
console.log(`  accent     ${p.accent} (${p.contrast.accent}:1) on ${p.accentForeground}`);

console.log(`\ntype  ratio ${design.type.ratio} · base ${design.type.baseSize}rem`);
for (const [name, s] of Object.entries(design.type)) {
  if (typeof s !== "object") continue;
  console.log(`  ${name.padEnd(11)} ${String(s.size).padStart(6)}rem  lh ${s.lineHeight}  w${s.weight}  tr ${s.tracking}`);
}

console.log(`\nspacing  ${design.spacing.join(" · ")}  (base unit ${design.baseUnit})`);
console.log(`radius   sm ${design.radius.sm} md ${design.radius.md} lg ${design.radius.lg}`);
console.log(`motion   ${design.motion.fast}/${design.motion.base}/${design.motion.slow}ms ${design.motion.easing}`);

console.log(`\nrationale`);
for (const r of design.rationale) console.log(`  ${r.token.padEnd(18)} ${r.because}`);

console.log(`\nlayout drift: ${drift.ok ? "NONE" : `${drift.violations.length} violation(s)`}`);
console.log(`  geometry ${(drift.geometry * 100).toFixed(2)}%  order ${(drift.order * 100).toFixed(2)}%  coverage ${(drift.coverage * 100).toFixed(2)}%  over ${drift.nodesChecked} nodes`);
for (const v of drift.violations.slice(0, 5)) console.log(`  ✗ ${v.node}.${v.property}: ${v.before} → ${v.after}`);

/**
 * Iteration tracker for Phase 2C.
 *
 *   node scripts/iterate.ts "label for this change"
 *
 * Runs the pipeline over every annotated real image and over the synthetic
 * corpus, appends one row to reports/iterations.json, and prints the delta
 * against the previous row.
 *
 * The rule this exists to enforce: a change lands only if F1 improves and
 * component accuracy does not fall. Coverage alone is raisable by making the
 * detector trigger-happy — that is exactly how precision reached 44.9% — so
 * the gate is F1, and the tracker says plainly whether the gate was met.
 *
 * Nothing here modifies the algorithm. It measures what the algorithm currently
 * does, and keeps the history so a regression is visible rather than argued.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runPipeline } from "../src/pipeline/run.ts";
import { scoreFidelity, type ScorableNode } from "../src/pipeline/fidelity/score.ts";

type Metrics = {
  fidelity: number;
  geometry: number;
  order: number;
  coverage: number;
  componentAccuracy: number;
  precision: number;
  recall: number;
  f1: number;
  falsePositives: number;
  falseNegatives: number;
  detected: number;
  annotated: number;
  /**
   * Regions both found *and* labelled correctly, as a count.
   *
   * Component accuracy is a ratio over matched regions, and a ratio has a
   * denominator that moves. A change that finds seven regions nobody found
   * before and labels five of them right *lowers* the ratio while strictly
   * improving the system — which is what happened at iteration 1, where
   * accuracy fell 2.5 points as recall rose 21. Gating on the ratio alone would
   * have reverted it. This count cannot be gamed that way: it only rises when
   * more regions are genuinely right.
   */
  correct: number;
  ms: number;
};

type Row = {
  iteration: number;
  label: string;
  at: string;
  /** Per-image, so a change that helps one and hurts three is visible. */
  images: Record<string, Metrics>;
  real: Metrics;
  synthetic: { fidelity: number; f1: number; componentAccuracy: number; coverage: number; ms: number } | null;
  gate: "improved" | "regressed" | "baseline" | "mixed";
};

const label = process.argv[2] ?? "unlabelled";
const skipSynthetic = process.argv.includes("--skip-synthetic");

const root = join(import.meta.dirname, "..");
const reportsDir = join(root, "reports");
mkdirSync(reportsDir, { recursive: true });
const logPath = join(reportsDir, "iterations.json");

/* ── real images: anything with a truth file beside it ─────────────── */

function realImages(): { id: string; image: string; truth: string }[] {
  const found: { id: string; image: string; truth: string }[] = [];
  for (const dir of [join(root, "Test Images"), join(root, "test-dataset", "real")]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
      const truth = join(dir, `${file.replace(/\.[^.]+$/, "")}.truth.json`);
      if (existsSync(truth)) found.push({ id: file.replace(/\.[^.]+$/, ""), image: join(dir, file), truth });
    }
  }
  return found.sort((a, b) => a.id.localeCompare(b.id));
}

async function measure(imagePath: string, truthPath: string): Promise<Metrics> {
  const result = await runPipeline(readFileSync(imagePath), {
    classifier: "heuristic",
    sourceKind: "wireframe",
  });
  const truth = JSON.parse(readFileSync(truthPath, "utf8")) as {
    canvas: { w: number; h: number };
    nodes: { id: string; role: string; box: { x: number; y: number; w: number; h: number } }[];
  };

  const reference: ScorableNode[] = truth.nodes.map((n, i) => ({ id: n.id, role: n.role, box: n.box, order: i }));
  const produced: ScorableNode[] = result.ir.nodes.map((n) => ({ id: n.id, role: n.role, box: n.box, order: n.order }));
  const s = scoreFidelity({ nodes: reference, canvas: truth.canvas }, { nodes: produced, canvas: result.ir.canvas });

  return {
    fidelity: s.fidelity, geometry: s.geometry, order: s.order, coverage: s.coverage,
    componentAccuracy: s.componentAccuracy, precision: s.precision, recall: s.recall, f1: s.f1,
    falsePositives: s.falsePositives, falseNegatives: s.falseNegatives,
    detected: s.producedCount, annotated: s.referenceCount,
    correct: Math.round(s.matched * s.componentAccuracy),
    ms: result.report.totalMs,
  };
}

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);

const images = realImages();
if (images.length === 0) {
  console.error("No annotated real images found. Annotate one at /annotate first.");
  process.exit(1);
}

const perImage: Record<string, Metrics> = {};
for (const item of images) {
  perImage[item.id] = await measure(item.image, item.truth);
}

const all = Object.values(perImage);
const real: Metrics = {
  fidelity: mean(all.map((m) => m.fidelity)),
  geometry: mean(all.map((m) => m.geometry)),
  order: mean(all.map((m) => m.order)),
  coverage: mean(all.map((m) => m.coverage)),
  componentAccuracy: mean(all.map((m) => m.componentAccuracy)),
  precision: mean(all.map((m) => m.precision)),
  recall: mean(all.map((m) => m.recall)),
  f1: mean(all.map((m) => m.f1)),
  falsePositives: sum(all.map((m) => m.falsePositives)),
  falseNegatives: sum(all.map((m) => m.falseNegatives)),
  detected: sum(all.map((m) => m.detected)),
  annotated: sum(all.map((m) => m.annotated)),
  correct: sum(all.map((m) => m.correct)),
  ms: mean(all.map((m) => m.ms)),
};

/* ── synthetic, as the regression guard ────────────────────────────── */

let synthetic: Row["synthetic"] = null;
if (!skipSynthetic) {
  const dir = join(root, "test-dataset", "synthetic");
  if (existsSync(join(dir, "index.json"))) {
    const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8")) as {
      items: { id: string; image: string; truth: string }[];
    };
    const scores: Metrics[] = [];
    for (const item of index.items) {
      scores.push(await measure(join(dir, item.image), join(dir, item.truth)));
    }
    synthetic = {
      fidelity: mean(scores.map((s) => s.fidelity)),
      f1: mean(scores.map((s) => s.f1)),
      componentAccuracy: mean(scores.map((s) => s.componentAccuracy)),
      coverage: mean(scores.map((s) => s.coverage)),
      ms: mean(scores.map((s) => s.ms)),
    };
  }
}

/* ── append and judge ──────────────────────────────────────────────── */

const history: Row[] = existsSync(logPath) ? JSON.parse(readFileSync(logPath, "utf8")) : [];
const previous = history[history.length - 1] ?? null;

// A hair of slack, so floating-point noise is not reported as a change.
const EPS = 0.0005;
let gate: Row["gate"] = "baseline";
if (previous) {
  const f1Up = real.f1 > previous.real.f1 + EPS;
  const f1Down = real.f1 < previous.real.f1 - EPS;
  // Correctly-classified *count*, not the accuracy ratio — see `correct`.
  const fewerCorrect = real.correct < previous.real.correct;
  gate = f1Up && !fewerCorrect ? "improved" : f1Down || fewerCorrect ? "regressed" : "mixed";
}

const row: Row = {
  iteration: history.length,
  label,
  at: new Date().toISOString(),
  images: perImage,
  real,
  synthetic,
  gate,
};
history.push(row);
writeFileSync(logPath, JSON.stringify(history, null, 2) + "\n");

/* ── print ─────────────────────────────────────────────────────────── */

const p = (v: number) => `${(v * 100).toFixed(1)}%`;
const delta = (now: number, before: number | undefined) => {
  if (before === undefined) return "";
  const d = (now - before) * 100;
  if (Math.abs(d) < 0.05) return "    ·  ";
  return `  ${d > 0 ? "+" : ""}${d.toFixed(1)}`.padStart(7);
};

console.log(`\niteration ${row.iteration} — ${label}`);
console.log("─".repeat(64));
const rows: [string, keyof Metrics][] = [
  ["F1", "f1"],
  ["Recall", "recall"],
  ["Precision", "precision"],
  ["Geometry (IoU)", "geometry"],
  ["Component accuracy", "componentAccuracy"],
  ["Layout fidelity", "fidelity"],
];
for (const [name, key] of rows) {
  console.log(`${name.padEnd(22)} ${p(real[key] as number).padStart(7)}${delta(real[key] as number, previous?.real[key] as number | undefined)}`);
}
console.log(`${"Regions correct".padEnd(22)} ${String(real.correct).padStart(7)}${previous ? `  ${real.correct - previous.real.correct >= 0 ? "+" : ""}${real.correct - previous.real.correct}`.padStart(7) : ""}`);
console.log(`${"False positives".padEnd(22)} ${String(real.falsePositives).padStart(7)}`);
console.log(`${"False negatives".padEnd(22)} ${String(real.falseNegatives).padStart(7)}`);
console.log(`${"Regions".padEnd(22)} ${`${real.detected}/${real.annotated}`.padStart(7)}`);
console.log(`${"Time".padEnd(22)} ${`${real.ms.toFixed(0)}ms`.padStart(7)}`);

if (images.length > 1) {
  console.log(`\nper image:`);
  for (const [id, m] of Object.entries(perImage)) {
    console.log(`  ${id.padEnd(34)} F1 ${p(m.f1).padStart(6)}  R ${p(m.recall).padStart(6)}  P ${p(m.precision).padStart(6)}`);
  }
}

if (synthetic) {
  console.log(`\nsynthetic guard: fidelity ${p(synthetic.fidelity)} · F1 ${p(synthetic.f1)} · component ${p(synthetic.componentAccuracy)}`);
  if (previous?.synthetic && synthetic.fidelity < previous.synthetic.fidelity - 0.005) {
    console.log(`  ⚠ synthetic fidelity dropped ${p(previous.synthetic.fidelity)} → ${p(synthetic.fidelity)}`);
  }
}

const verdict = {
  baseline: "baseline recorded",
  improved: "KEEP — F1 up, no fewer regions correctly classified",
  regressed: "REVERT — F1 down, or fewer regions correctly classified",
  mixed: "no material change",
}[gate];
console.log(`\n${verdict}\n`);

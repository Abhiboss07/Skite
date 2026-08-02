/**
 * Benchmark harness.
 *
 * Runs the pipeline over a corpus, scores every sample against its ground truth
 * and writes both a machine-readable result file and a human-readable summary.
 *
 *   node scripts/evaluate.ts                    # synthetic corpus, offline classifier
 *   node scripts/evaluate.ts --set real         # whatever is in test-dataset/real
 *   node scripts/evaluate.ts --classifier vision
 *   node scripts/evaluate.ts --limit 6          # quick pass while iterating
 *
 * Two properties of this harness matter more than the numbers it prints:
 *
 *   1. It scores against ground truth the pipeline never sees. Nothing in
 *      `.truth.json` reaches the pipeline — it is loaded after the run.
 *   2. It reports per-style breakdowns. A single aggregate hides the only
 *      interesting result, which is that clean vector wireframes and
 *      photographed hand-drawing are not the same problem.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { runPipeline } from "../src/pipeline/run.ts";
import { scoreFidelity, type ScorableNode } from "../src/pipeline/fidelity/score.ts";

type TruthNode = {
  id: string;
  role: string;
  parent: string | null;
  box: { x: number; y: number; w: number; h: number };
  text?: string;
};

type Truth = {
  id: string;
  style: string;
  canvas: { w: number; h: number };
  nodes: TruthNode[];
};

type SampleResult = {
  id: string;
  style: string;
  ok: boolean;
  ms: number;
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
  ocrAccuracy: number | null;
  buildStatus: string;
  responsiveOk: boolean;
  nodeCount: number;
  referenceCount: number;
  warnings: number;
};

/* ── argument parsing ──────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const setName = arg("set", "synthetic");
const classifier = arg("classifier", "heuristic") as "auto" | "heuristic" | "vision";
const limit = Number(arg("limit", "0")) || Infinity;

const root = join(import.meta.dirname, "..", "test-dataset");
const dir = join(root, setName);
const indexPath = join(dir, "index.json");

if (!existsSync(indexPath)) {
  console.error(
    `No index at ${indexPath}.\n` +
      (setName === "synthetic"
        ? "Run: node test-dataset/generate.ts"
        : `Add samples to test-dataset/${setName}/ with an index.json listing them.`),
  );
  process.exit(1);
}

const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
  items: { id: string; style: string; image: string; truth: string }[];
};

/* ── text similarity, for OCR accuracy ─────────────────────────────── */

/**
 * Normalised Levenshtein similarity. Character-level rather than exact match:
 * a transcription that reads "Get Started" for "Get started" is very nearly
 * right, and an exact-match metric would score it the same as reading nothing.
 */
function similarity(a: string, b: string): number {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x && !y) return 1;
  if (!x || !y) return 0;

  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const curr = [i];
    for (let j = 1; j <= y.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return 1 - prev[y.length] / Math.max(x.length, y.length);
}

/* ── run ───────────────────────────────────────────────────────────── */

const results: SampleResult[] = [];
const samples = index.items.slice(0, limit);

console.log(`Evaluating ${samples.length} samples from ${setName} (classifier: ${classifier})\n`);

for (const sample of samples) {
  const image = readFileSync(join(dir, sample.image));
  const truth = JSON.parse(readFileSync(join(dir, sample.truth), "utf8")) as Truth;

  const started = Date.now();
  let result;
  try {
    result = await runPipeline(image, { classifier, sourceKind: "synthetic" });
  } catch (error) {
    console.log(`  ${sample.id.padEnd(16)} FAILED  ${(error as Error).message}`);
    results.push({
      id: sample.id, style: sample.style, ok: false, ms: Date.now() - started,
      fidelity: 0, geometry: 0, order: 0, coverage: 0, componentAccuracy: 0,
      precision: 0, recall: 0, f1: 0, falsePositives: 0,
      falseNegatives: truth.nodes.length,
      ocrAccuracy: null, buildStatus: "failed", responsiveOk: false,
      nodeCount: 0, referenceCount: truth.nodes.length, warnings: 0,
    });
    continue;
  }

  const reference: ScorableNode[] = truth.nodes.map((n, i) => ({
    id: n.id, role: n.role, box: n.box, order: i,
  }));
  const produced: ScorableNode[] = result.ir.nodes.map((n) => ({
    id: n.id, role: n.role, box: n.box, order: n.order,
  }));

  const score = scoreFidelity(
    { nodes: reference, canvas: truth.canvas },
    { nodes: produced, canvas: { w: result.ir.canvas.w, h: result.ir.canvas.h } },
  );

  // OCR is scored only over the ground-truth nodes that actually carry text,
  // and only when a classifier that can read was used. Averaging in the offline
  // path's structural zeros would report a text metric for a pass that never
  // attempted text.
  const withText = truth.nodes.filter((n) => n.text);
  let ocrAccuracy: number | null = null;
  if (result.report.textExtracted && withText.length) {
    const producedById = new Map(result.ir.nodes.map((n) => [n.id, n]));
    let total = 0;
    for (const ref of withText) {
      const match = score.perNode.find((p) => p.referenceId === ref.id && p.producedId);
      const got = match ? (producedById.get(match.producedId!)?.content?.text ?? "") : "";
      total += similarity(ref.text!, got);
    }
    ocrAccuracy = total / withText.length;
  }

  const responsiveOk = !result.report.validation.issues.some(
    (i) => i.rule === "fixed-width" || i.rule === "unresponsive-grid",
  );

  results.push({
    id: sample.id,
    style: sample.style,
    ok: result.ok,
    ms: result.report.totalMs,
    fidelity: score.fidelity,
    geometry: score.geometry,
    order: score.order,
    coverage: score.coverage,
    componentAccuracy: score.componentAccuracy,
    precision: score.precision,
    recall: score.recall,
    f1: score.f1,
    falsePositives: score.falsePositives,
    falseNegatives: score.falseNegatives,
    ocrAccuracy,
    buildStatus: result.report.buildStatus,
    responsiveOk,
    nodeCount: result.ir.nodes.length,
    referenceCount: truth.nodes.length,
    warnings: result.warnings.length,
  });

  const pct = (v: number) => `${(v * 100).toFixed(0)}%`.padStart(4);
  console.log(
    `  ${sample.id.padEnd(16)} fidelity ${pct(score.fidelity)}  ` +
      `geom ${pct(score.geometry)}  cover ${pct(score.coverage)}  ` +
      `role ${pct(score.componentAccuracy)}  F1 ${pct(score.f1)}  ` +
      `+${score.falsePositives}/-${score.falseNegatives}  ` +
      `${String(result.report.totalMs).padStart(4)}ms`,
  );
}

/* ── aggregate ─────────────────────────────────────────────────────── */

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

/** p50/p95 rather than a mean: latency distributions have tails that a mean hides. */
function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function summarise(rows: SampleResult[]) {
  const ocr = rows.map((r) => r.ocrAccuracy).filter((v): v is number => v !== null);
  return {
    samples: rows.length,
    layoutFidelity: mean(rows.map((r) => r.fidelity)),
    geometry: mean(rows.map((r) => r.geometry)),
    readingOrder: mean(rows.map((r) => r.order)),
    coverage: mean(rows.map((r) => r.coverage)),
    componentAccuracy: mean(rows.map((r) => r.componentAccuracy)),
    precision: mean(rows.map((r) => r.precision)),
    recall: mean(rows.map((r) => r.recall)),
    f1: mean(rows.map((r) => r.f1)),
    falsePositives: rows.reduce((sum, r) => sum + r.falsePositives, 0),
    falseNegatives: rows.reduce((sum, r) => sum + r.falseNegatives, 0),
    ocrAccuracy: ocr.length ? mean(ocr) : null,
    buildSuccessRate: rows.filter((r) => r.buildStatus === "passed").length / (rows.length || 1),
    responsivePassRate: rows.filter((r) => r.responsiveOk).length / (rows.length || 1),
    medianMs: percentile(rows.map((r) => r.ms), 0.5),
    p95Ms: percentile(rows.map((r) => r.ms), 0.95),
  };
}

const styles = [...new Set(results.map((r) => r.style))];
const overall = summarise(results);
const byStyle = Object.fromEntries(
  styles.map((s) => [s, summarise(results.filter((r) => r.style === s))]),
);

const report = {
  generatedAt: new Date().toISOString(),
  set: setName,
  classifier,
  overall,
  byStyle,
  samples: results,
};

const outDir = join(root, "results");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${setName}-${classifier}.json`), JSON.stringify(report, null, 2));

/* ── print ─────────────────────────────────────────────────────────── */

const pct = (v: number | null) => (v === null ? "  n/a" : `${(v * 100).toFixed(1)}%`.padStart(6));

console.log(`\n${"─".repeat(26 + styles.length * 11 + 11)}`);
console.log(`Metric                    ${styles.map((s) => s.padStart(11)).join("")}${"overall".padStart(11)}`);
console.log("─".repeat(26 + styles.length * 11 + 11));

const rows: [string, (s: ReturnType<typeof summarise>) => string][] = [
  ["Layout fidelity", (s) => pct(s.layoutFidelity)],
  ["  · geometry (IoU)", (s) => pct(s.geometry)],
  ["  · reading order", (s) => pct(s.readingOrder)],
  ["  · coverage", (s) => pct(s.coverage)],
  ["Component accuracy", (s) => pct(s.componentAccuracy)],
  ["Precision", (s) => pct(s.precision)],
  ["Recall", (s) => pct(s.recall)],
  ["F1", (s) => pct(s.f1)],
  ["False positives", (s) => String(s.falsePositives).padStart(6)],
  ["False negatives", (s) => String(s.falseNegatives).padStart(6)],
  ["OCR accuracy", (s) => pct(s.ocrAccuracy)],
  ["Build success rate", (s) => pct(s.buildSuccessRate)],
  ["Responsive pass rate", (s) => pct(s.responsivePassRate)],
  ["Median time", (s) => `${s.medianMs}ms`.padStart(6)],
  ["p95 time", (s) => `${s.p95Ms}ms`.padStart(6)],
];

for (const [label, get] of rows) {
  const cells = styles.map((s) => get(byStyle[s]).padStart(11)).join("");
  console.log(`${label.padEnd(26)}${cells}${get(overall).padStart(11)}`);
}
console.log("─".repeat(26 + styles.length * 11 + 11));
console.log(`\nWritten to test-dataset/results/${setName}-${classifier}.json`);

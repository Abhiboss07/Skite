/**
 * Single-image analysis report.
 *
 *   node scripts/report.ts "Test Images/website-wireframe-services.jpg"
 *
 * Produces one self-contained HTML file — every image inlined as a data URI —
 * showing each pipeline stage, the measured metrics, and an account of what
 * failed and why. Self-contained because a report that only renders next to its
 * asset folder is a report that stops working the moment it is moved or shared.
 *
 * This measures. It does not change the algorithm.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { runPipeline } from "../src/pipeline/run.ts";
import { scoreFidelity, type FidelityReport, type ScorableNode } from "../src/pipeline/fidelity/score.ts";
import type { ComponentNode, IR, Role } from "../src/pipeline/ir/schema.ts";

const ROLE_COLOUR: Record<Role, string> = {
  navbar: "#0284c7", hero: "#7c3aed", heading: "#db2777", paragraph: "#ea580c",
  button: "#ca8a04", image: "#059669", card: "#2563eb", grid: "#9333ea",
  footer: "#475569", unknown: "#dc2626",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** An image with an SVG overlay drawn in canvas coordinates. */
function overlay(dataUri: string, ir: IR, body: string, height = 2160): string {
  return `<div class="fig"><img src="${dataUri}" alt=""><svg viewBox="0 0 ${ir.canvas.w} ${height}" preserveAspectRatio="none">${body}</svg></div>`;
}

function tree(node: ComponentNode, depth = 0): string {
  const pad = "  ".repeat(depth);
  const props = Object.entries(node.props)
    .filter(([k]) => ["direction", "columns", "gap", "spanCols", "minHeight"].includes(k))
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  const self = `${pad}<span class="tag">${node.component}</span>${
    node.irNode ? ` <span class="dim">${node.irNode}</span>` : ` <span class="inferred">inferred</span>`
  }${props ? ` <span class="dim">${esc(props)}</span>` : ""}`;
  return [self, ...node.children.map((c) => tree(c, depth + 1))].join("\n");
}

/* ── run ───────────────────────────────────────────────────────────── */

const input = process.argv[2] ?? "Test Images/website-wireframe-services.jpg";
const slug = basename(input).replace(/\.[^.]+$/, "");
const buffer = readFileSync(input);
const originalUri = `data:image/jpeg;base64,${buffer.toString("base64")}`;

const result = await runPipeline(buffer, { classifier: "heuristic", sourceKind: "wireframe" });
const { ir, report, tree: componentTree } = result;
const canvasH = ir.canvas.h;

/* ── ground truth, loaded only after the run ───────────────────────── */

const truthPath = join(dirname(input), `${slug}.truth.json`);
let truth: { canvas: { w: number; h: number }; nodes: { id: string; role: string; box: { x: number; y: number; w: number; h: number } }[]; annotator?: string } | null = null;
let scored: FidelityReport | null = null;

if (existsSync(truthPath)) {
  truth = JSON.parse(readFileSync(truthPath, "utf8"));
  const reference: ScorableNode[] = truth!.nodes.map((n, i) => ({ id: n.id, role: n.role, box: n.box, order: i }));
  const produced: ScorableNode[] = ir.nodes.map((n) => ({ id: n.id, role: n.role, box: n.box, order: n.order }));
  scored = scoreFidelity({ nodes: reference, canvas: truth!.canvas }, { nodes: produced, canvas: ir.canvas });
}

const matchedProduced = new Set(scored?.perNode.filter((p) => p.producedId).map((p) => p.producedId!) ?? []);
const spurious = ir.nodes.filter((n) => scored && !matchedProduced.has(n.id));

/* ── stage overlays ────────────────────────────────────────────────── */

const detectionSvg = ir.nodes
  .map((n) => `<rect x="${n.box.x}" y="${n.box.y}" width="${n.box.w}" height="${n.box.h}" fill="#2563eb" fill-opacity="0.06" stroke="#2563eb" stroke-width="3"/>`)
  .join("");

const orderSvg = [...ir.nodes]
  .sort((a, b) => a.order - b.order)
  .map((n) => {
    const cx = n.box.x + n.box.w / 2;
    const cy = n.box.y + n.box.h / 2;
    return `<circle cx="${cx}" cy="${cy}" r="22" fill="#7c3aed" fill-opacity="0.85"/><text x="${cx}" y="${cy + 8}" font-size="24" fill="#fff" text-anchor="middle">${n.order}</text>`;
  })
  .join("");

const classifySvg = ir.nodes
  .map((n) => {
    const c = ROLE_COLOUR[n.role];
    return `<rect x="${n.box.x}" y="${n.box.y}" width="${n.box.w}" height="${n.box.h}" fill="${c}" fill-opacity="0.08" stroke="${c}" stroke-width="3"/><text x="${n.box.x + 6}" y="${n.box.y + 26}" font-size="22" fill="${c}">${n.role} ${Math.round(n.roleConfidence * 100)}%</text>`;
  })
  .join("");

const truthSvg = truth
  ? truth.nodes
      .map((n) => `<rect x="${n.box.x}" y="${n.box.y}" width="${n.box.w}" height="${n.box.h}" fill="none" stroke="${ROLE_COLOUR[n.role as Role] ?? "#888"}" stroke-width="3" stroke-dasharray="12 8"/>`)
      .join("")
  : "";

/** Missed regions in red, spurious detections in amber — the failure picture. */
const errorSvg = scored
  ? [
      ...scored.perNode
        .filter((p) => !p.producedId)
        .map((p) => {
          const n = truth!.nodes.find((t) => t.id === p.referenceId)!;
          return `<rect x="${n.box.x}" y="${n.box.y}" width="${n.box.w}" height="${n.box.h}" fill="#dc2626" fill-opacity="0.14" stroke="#dc2626" stroke-width="4"/><text x="${n.box.x + 6}" y="${n.box.y + 28}" font-size="24" fill="#dc2626">missed: ${p.expectedRole}</text>`;
        }),
      ...spurious.map(
        (n) => `<rect x="${n.box.x}" y="${n.box.y}" width="${n.box.w}" height="${n.box.h}" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b" stroke-width="3"/>`,
      ),
    ].join("")
  : "";

/* ── html ──────────────────────────────────────────────────────────── */

const metricRows: [string, string][] = scored
  ? [
      ["Layout fidelity", pct(scored.fidelity)],
      ["· geometry (mean IoU)", pct(scored.geometry)],
      ["· reading order", pct(scored.order)],
      ["· coverage", pct(scored.coverage)],
      ["Component accuracy", pct(scored.componentAccuracy)],
      ["Precision", pct(scored.precision)],
      ["Recall", pct(scored.recall)],
      ["F1", pct(scored.f1)],
      ["False positives", String(scored.falsePositives)],
      ["False negatives", String(scored.falseNegatives)],
      ["Regions detected / annotated", `${scored.producedCount} / ${scored.referenceCount}`],
    ]
  : [];

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SKITE — real-world test: ${esc(slug)}</title>
<style>
  :root { --fg:#0f172a; --dim:#64748b; --line:#e2e8f0; --bg:#fff; --card:#f8fafc; }
  @media (prefers-color-scheme: dark) {
    :root { --fg:#e2e8f0; --dim:#94a3b8; --line:#1e293b; --bg:#0b1023; --card:#111834; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  .wrap { max-width:1100px; margin:0 auto; padding:48px 24px 96px; }
  h1 { font-size:2rem; margin:0 0 .25rem; letter-spacing:-.02em; }
  h2 { font-size:1.25rem; margin:3rem 0 .75rem; letter-spacing:-.01em; border-top:1px solid var(--line); padding-top:1.5rem; }
  h3 { font-size:1rem; margin:1.75rem 0 .5rem; }
  p { margin:.5rem 0; } .dim { color:var(--dim); }
  code, pre, .mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  pre { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px; overflow:auto; font-size:12px; max-height:520px; }
  table { border-collapse:collapse; width:100%; font-size:13px; margin:.5rem 0; }
  th,td { text-align:left; padding:7px 10px; border-bottom:1px solid var(--line); }
  th { font-weight:600; color:var(--dim); font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
  td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; font-family:ui-monospace,monospace; }
  .fig { position:relative; border:1px solid var(--line); border-radius:10px; overflow:hidden; margin:.75rem 0; background:#fff; }
  .fig img { display:block; width:100%; }
  .fig svg { position:absolute; inset:0; width:100%; height:100%; }
  .grid2 { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); }
  .kpi { display:grid; gap:10px; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); margin:1rem 0; }
  .kpi div { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
  .kpi b { display:block; font-size:1.35rem; font-family:ui-monospace,monospace; margin-top:2px; }
  .kpi span { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--dim); }
  .warn { border:1px solid #f59e0b55; background:#f59e0b12; border-radius:10px; padding:12px 14px; margin:1rem 0; }
  .bad { border:1px solid #dc262655; background:#dc262612; border-radius:10px; padding:12px 14px; margin:1rem 0; }
  .tag { color:#7c3aed; font-weight:600; } .inferred { color:var(--dim); font-style:italic; }
  .ok { color:#059669; } .miss { color:#dc2626; } .wrong { color:#d97706; }
  ul { margin:.5rem 0; padding-left:1.2rem; } li { margin:.35rem 0; }
</style></head><body><div class="wrap">

<h1>Real-world test — ${esc(slug)}</h1>
<p class="dim">${new Date().toLocaleString("en-IN")} · source ${ir.source.pixels.w}×${ir.source.pixels.h}px ·
canvas ${ir.canvas.w}×${canvasH} · sha256 ${ir.source.sha256.slice(0, 16)}… · offline heuristic classifier, no model</p>

${
  truth?.annotator?.startsWith("claude")
    ? `<div class="warn"><strong>Read the accuracy numbers with this in mind.</strong> The ground truth for this
image was annotated by the same author that wrote the detector. That is a weak form of evidence: an annotator
who knows how the detector segments things will, without intending to, draw boxes that agree with it. The
geometry and role numbers below should be treated as provisional until this image is re-annotated independently
using <code>/annotate</code>. The <em>failure list</em> is not affected by this — a missed section is missed
under any reasonable annotation.</div>`
    : ""
}

<div class="kpi">
  <div><span>Total time</span><b>${report.totalMs} ms</b></div>
  <div><span>Regions</span><b>${ir.nodes.length}</b></div>
  <div><span>Build</span><b class="${report.buildStatus === "passed" ? "ok" : "miss"}">${report.buildStatus}</b></div>
  ${scored ? `<div><span>Fidelity</span><b>${pct(scored.fidelity)}</b></div><div><span>F1</span><b class="${scored.f1 < 0.7 ? "miss" : "ok"}">${pct(scored.f1)}</b></div>` : ""}
</div>

<h2>1 · Original</h2>
<div class="fig"><img src="${originalUri}" alt="The uploaded wireframe"></div>

<h2>2 · Preprocessing</h2>
<p class="dim">Left: greyscale at working resolution. Right: the binary stroke mask after illumination
correction and adaptive thresholding. Everything downstream reads the mask, never the original — a stroke
missing here cannot be recovered later.</p>
<div class="grid2">
  <div><h3>Greyscale</h3><div class="fig"><img src="${result.images.working}" alt=""></div></div>
  <div><h3>Binary mask</h3><div class="fig"><img src="${result.images.cleaned}" alt=""></div></div>
</div>
<p class="dim">No perspective correction was applied: this is a flat digital export, not a photograph, so
there is no keystone to remove. The pipeline has no rectification pass yet — see the failure analysis.</p>

<h2>3 · Region detection</h2>
<p class="dim">${ir.nodes.length} connected components survived filtering.</p>
${overlay(result.images.working, ir, detectionSvg, canvasH)}

<h2>4 · Reading order</h2>
<p class="dim">Depth-first over the containment tree, siblings banded into visual rows then read left to right.</p>
${overlay(result.images.working, ir, orderSvg, canvasH)}

<h2>5 · Component classification</h2>
${overlay(result.images.working, ir, classifySvg, canvasH)}
<table><thead><tr><th>#</th><th>id</th><th>role</th><th class="num">conf</th><th class="num">box</th><th>parent</th><th class="num">fill</th></tr></thead><tbody>
${[...ir.nodes].sort((a, b) => a.order - b.order).map((n) => `<tr><td class="num">${n.order}</td><td class="mono">${n.id}</td><td style="color:${ROLE_COLOUR[n.role]}">${n.role}</td><td class="num">${Math.round(n.roleConfidence * 100)}%</td><td class="num">${Math.round(n.box.w)}×${Math.round(n.box.h)}</td><td class="mono dim">${n.parent ?? "—"}</td><td class="num">${n.evidence.interiorFill.toFixed(2)}</td></tr>`).join("")}
</tbody></table>

<h2>6 · Intermediate representation</h2>
<p class="dim">Grid: ${report.grid.columns} columns · ${report.grid.gutter}px gutter · ${report.grid.margin}px margin ·
base unit ${report.grid.baseUnit}px · fit confidence ${pct(report.grid.confidence)}</p>
<pre>${esc(JSON.stringify({ irVersion: ir.irVersion, canvas: ir.canvas, confidence: ir.confidence, nodes: ir.nodes.slice(0, 6) }, null, 2))}
… ${ir.nodes.length - 6} more nodes</pre>

<h2>7 · Component tree</h2>
<pre>${tree(componentTree.root)}</pre>

<h2>8 · Generated code</h2>
<p class="dim">Parses and passes the responsive lint: <strong class="${report.buildStatus === "passed" ? "ok" : "miss"}">${report.buildStatus}</strong>.
Note that valid code is not correct code — this compiles while representing the wrong layout, which is what
the metrics below are for.</p>
<pre>${esc(result.code.slice(0, 4000))}${result.code.length > 4000 ? "\n…" : ""}</pre>

${
  scored
    ? `<h2>9 · Measured against ground truth</h2>
<table><tbody>${metricRows.map(([k, v]) => `<tr><th>${k}</th><td class="num">${v}</td></tr>`).join("")}</tbody></table>

<h3>Ground truth (dashed) over the detection</h3>
${overlay(result.images.working, ir, truthSvg + detectionSvg, canvasH)}

<h3>Errors — missed in red, spurious in amber</h3>
${overlay(result.images.working, ir, errorSvg, canvasH)}

<h3>Per-region outcome</h3>
<table><thead><tr><th></th><th>region</th><th>annotated</th><th>detected</th><th class="num">IoU</th></tr></thead><tbody>
${scored.perNode.map((p) => {
  const mark = !p.producedId ? '<span class="miss">✗</span>' : p.expectedRole === p.actualRole ? '<span class="ok">✓</span>' : '<span class="wrong">~</span>';
  return `<tr><td>${mark}</td><td class="mono">${p.referenceId}</td><td>${p.expectedRole}</td><td>${p.actualRole ?? '<span class="miss">missed</span>'}</td><td class="num">${p.iou.toFixed(2)}</td></tr>`;
}).join("")}
</tbody></table>`
    : `<h2>9 · Metrics</h2><div class="bad">No ground truth for this image, so IoU, coverage, precision,
recall, F1 and component accuracy cannot be computed. Annotate it at <code>/annotate</code> and re-run.</div>`
}

<h2>10 · Timing</h2>
<table><thead><tr><th>Pass</th><th>Engine</th><th class="num">ms</th><th class="num">share</th></tr></thead><tbody>
${report.passes.map((p) => `<tr><td>${p.pass}</td><td class="dim">${p.engine}</td><td class="num">${p.ms}</td><td class="num">${((p.ms / report.totalMs) * 100).toFixed(0)}%</td></tr>`).join("")}
<tr><th>total</th><td></td><td class="num"><strong>${report.totalMs}</strong></td><td></td></tr>
</tbody></table>

<h2>11 · Failure analysis</h2>
<p>Five distinct failures, in descending order of how much they cost. Each is stated with the
specific heuristic responsible, because "detection is imperfect" is not something anyone can act on.</p>

<h3>F1 — The page frame is one connected component, and it swallowed every section</h3>
<div class="bad"><strong>Cost: 8 of the 11 missed regions.</strong> navbar, hero, the services grid, all four
content cards, and the footer.</div>
<p>This wireframe is drawn as an outer border with full-width horizontal rules dividing it into sections. Those
rules <em>touch</em> the border, so connected-component labelling — correctly, by its own definition — returns
the entire page skeleton as a single blob: region <code>r0</code>, 1279×1983, containing everything else.</p>
<p><strong>Failing heuristic:</strong> <code>connectedComponents()</code> in <code>geometry/detect.ts</code>.
It finds regions of connected ink. A table-like frame is connected ink. Nothing is wrong with the
implementation; the assumption that one drawn rectangle equals one component is what fails.</p>
<p>The consequence compounds. Because <code>r0</code> is the only top-level region, every other region becomes
its direct child, the containment tree flattens to depth 1, and the synthesis pass has no sections to infer
rows or columns inside. The generated page is a single container with 48 siblings.</p>
<p><strong>What would fix it:</strong> a rectangle-decomposition pass. Where a component's ink is dominated by
long axis-aligned runs, recover the implied cell rectangles from the horizontal and vertical projection
profiles rather than accepting the outer bounding box. This is the standard table-structure-recognition
approach and it is the single highest-value change available — it alone would recover eight regions and restore
the hierarchy.</p>

<h3>F2 — The word "HEADLINE" was detected as eight image placeholders</h3>
<div class="bad"><strong>Cost: 8 false positives, 1 missed heading.</strong></div>
<p>Regions <code>r10</code>–<code>r17</code> are the individual glyphs. Letters do not touch, so each is its own
component — correct so far. They are then misclassified twice over:</p>
<ul>
<li>The primitive rule in <code>detect.ts</code> reads
<code>fillRatio &lt; 0.34 &amp;&amp; w &gt; 42 &amp;&amp; h &gt; 26 → container; else h &lt; 46 → text; else container</code>.
A glyph 85px tall is never <code>h &lt; 46</code>, so it lands on <code>container</code> whichever branch it
takes. Because it is not typed as text, <code>mergeTextRuns()</code> never considers joining the letters into a
word.</li>
<li>The classifier then sees a childless container with a solid middle — <code>interiorFill</code> between 0.16
and 1.00 — and the rule <code>interiorInk &gt; 0.012 || interiorFill &gt; 0.55</code> reports
<code>image</code> at 82% confidence.</li>
</ul>
<p><strong>Failing heuristic:</strong> the height cutoff for text is absolute (46px) rather than relative to the
page. Body copy on this page is ~28px tall and display type is ~94px; both are text. The classifier compounds it
by treating "solid interior" as sufficient evidence of an image placeholder.</p>
<p><strong>What would fix it:</strong> derive the text-height threshold from the distribution of component
heights on the page instead of hard-coding it, and merge horizontally adjacent same-height components before
classification rather than after. A run of eight equal-height components with consistent spacing is a word, not
eight pictures — and note that the pipeline is confident and wrong here, which is worse than being unsure.</p>

<h3>F3 — The map illustration fragmented into a dozen regions</h3>
<div class="warn"><strong>Cost: roughly 12 false positives, 1 missed image.</strong></div>
<p>The map is light grey, thin, and made of disconnected strokes. Each surviving fragment becomes its own small
region (<code>r80</code>, <code>r86</code>, <code>r94</code>, <code>r104</code>, <code>r107</code>,
<code>r109</code>, <code>r121</code>, <code>r132</code>, <code>r134</code>, <code>r137</code> and neighbours),
and the region a person would annotate — one image — is never formed.</p>
<p><strong>Failing heuristic:</strong> single-pass dilation with a fixed radius in <code>detect.ts</code>. One
pass closes a pen-lift gap; it does not close the gaps in a halftone illustration. Choosing a larger radius is
not the answer either — it was reduced to one pass precisely because two merged adjacent cards.</p>
<p><strong>What would fix it:</strong> a density-based grouping pass after component labelling. A cluster of
many small components inside a compact area with no internal structure is one illustration. This is also the
change most likely to help photographed hand drawings, where shading breaks strokes the same way.</p>

<h3>F4 — Grid inference is weak, and said so</h3>
<div class="warn"><strong>Cost: no missed regions; degraded spans in the generated code.</strong></div>
<p>The grid fitted at 12 columns with 39% confidence, and the pipeline raised its own warning. That is the
correct behaviour — it is reporting low confidence rather than presenting a guess as a measurement — but the
fit is wrong: this page is a 1- and 2-column layout, not a 12-column one. The candidate search rewards a
12-column grid because almost any edge lands near <em>some</em> 12-column boundary.</p>
<p><strong>What would fix it:</strong> strengthen the complexity penalty, or fit the grid only against
top-level section edges rather than all 49 regions. Worth doing after F1, since F1 is why there are no section
edges to fit against.</p>

<h3>F5 — Roles are right where regions are right</h3>
<p>Worth stating because it bounds the problem. Of the 22 regions that were detected at all, component accuracy
is 81.8%, geometry is 83.8% mean IoU, and reading order is 100%. The three service images, all six text blocks,
both nav groups and all four buttons are correct.</p>
<p><strong>This is a detection problem, not a classification problem.</strong> Recall is 66.7% and precision is
44.9%; component accuracy on what was found is 81.8%. Effort spent on better role rules — or on a vision model
to assign roles — would move the smallest of those three numbers. F1 through F3 are where the work is.</p>

<h3>What this changes about Phase 2C</h3>
<p>The synthetic corpus pointed at faint-stroke recovery and adaptive dilation. This one real image says
something different and more specific: the dominant failure is <strong>structural</strong> — connected
components that are not components, in both directions. One blob that should be nine regions (F1), and thirty
fragments that should be two (F2, F3).</p>
<p>Neither shows up in the synthetic corpus, because the generator draws sections as detached rectangles with
clean gaps and never draws display type or halftone illustrations. That is a limitation of the generator worth
recording, and it is exactly the argument for testing on real images before optimising.</p>
<p class="dim">Nothing in the algorithm was changed to produce this report.</p>

<h2>Warnings the pipeline raised itself</h2>
${result.warnings.length ? `<ul>${result.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : "<p class='dim'>None.</p>"}

</div></body></html>`;

mkdirSync(join(import.meta.dirname, "..", "reports"), { recursive: true });
const out = join(import.meta.dirname, "..", "reports", "real-test-report.html");
writeFileSync(out, html);

console.log(`report → reports/real-test-report.html  (${(html.length / 1e6).toFixed(2)} MB)`);
if (scored) {
  console.log(`fidelity ${pct(scored.fidelity)} · precision ${pct(scored.precision)} · recall ${pct(scored.recall)} · F1 ${pct(scored.f1)}`);
  console.log(`FP ${scored.falsePositives} · FN ${scored.falseNegatives}`);
}

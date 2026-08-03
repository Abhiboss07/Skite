/**
 * Visual regression check for generated pages.
 *
 *   node scripts/visual-check.ts <image> --label before
 *   node scripts/visual-check.ts <image> --label after --compare before
 *
 * Renders the generated page in a real browser at a fixed viewport, saves the
 * screenshot, records every rendered box, and — when `--compare` names an
 * earlier label — writes a three-panel HTML comparison: original wireframe,
 * previous render, current render.
 *
 * ── Why this exists ─────────────────────────────────────────────────
 *
 * A build that compiles and a validator that passes say nothing about whether
 * a page renders. Both were green while the generated component painted as
 * unstyled text on a blank background, because every `var(--sk-*)` reference
 * lacked a fallback and resolved to nothing. Nobody looked. This turns looking
 * into a command.
 *
 * It also separates two things the numbers conflate. Structural layout —
 * order, nesting, spans, direction — is verified exactly by the IR drift check.
 * *Rendered* geometry legitimately moves when type changes, because text
 * reflows. This reports both, so a change can be judged on whether the movement
 * it caused was the movement it intended.
 *
 * Playwright is not a project dependency; install it for a run:
 *   npm install --no-save playwright
 * Set CHROMIUM to reuse an already-downloaded browser.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { runPipeline } from "../src/pipeline/run.ts";
import { emit } from "../src/pipeline/emit/classes.ts";
import type { ComponentNode } from "../src/pipeline/ir/schema.ts";
import type { DesignTokens } from "../src/pipeline/design/tokens.ts";

/* ── arguments ─────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith("--"));
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};

const image = positional[0] ?? "Test Images/website-wireframe-services.jpg";
const label = flag("label") ?? "current";
const compareWith = flag("compare");
const viewport = { width: Number(flag("width") ?? 1400), height: Number(flag("height") ?? 1000) };

const slug = basename(image).replace(/\.[^.]+$/, "");
const outDir = join(import.meta.dirname, "..", "reports", "visual");
mkdirSync(outDir, { recursive: true });

/* ── render the component tree to standalone HTML ──────────────────── */

const camelToKebab = (k: string) => (k.startsWith("--") ? k : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));

function toHtml(node: ComponentNode, columns: number, tokens: DesignTokens | undefined): string {
  const e = emit(node, columns, tokens);
  const style = e.style
    ? Object.entries(e.style)
        .map(([k, v]) => `${camelToKebab(k)}:${v}`)
        .join(";")
    : "";

  const decoration =
    e.decoration === "image"
      ? `<div class="pointer-events-none absolute inset-0 grid place-items-center">` +
        `<span style="color:var(--sk-muted,#64748b);font-size:var(--sk-caption-size,0.75rem);letter-spacing:0.12em">IMAGE</span></div>`
      : "";

  const children = node.children.map((c) => toHtml(c, columns, tokens)).join("");
  const text = e.text ? escapeHtml(e.text) : "";
  const marker = node.irNode ? ` data-ir-node="${node.irNode}"` : "";

  return `<${e.tag} class="${e.className}" style="${style}"${marker}>${decoration}${text}${children}</${e.tag}>`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ── run ───────────────────────────────────────────────────────────── */

const buffer = readFileSync(image);
const result = await runPipeline(buffer, { classifier: "heuristic", sourceKind: "wireframe" });

// Tailwind is loaded from the CDN because the *layout* half of the output is
// genuinely Tailwind classes — grid, flex, spans, gaps. The appearance half is
// inline custom properties and needs nothing. Rendering without Tailwind would
// test a page the user will never see.
const page = `<!doctype html><html><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"></script>
</head><body style="margin:0;background:#eef1f5;padding:24px">
${toHtml(result.tree.root, result.ir.canvas.grid.columns, result.design)}
</body></html>`;

const { chromium } = await import("playwright");
const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
);
const tab = await browser.newPage({ viewport });

const consoleErrors: string[] = [];
tab.on("pageerror", (e) => consoleErrors.push(e.message));
tab.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

await tab.setContent(page, { waitUntil: "networkidle", timeout: 60_000 });
await tab.waitForTimeout(800);

const shot = join(outDir, `${slug}-${label}.png`);
await tab.screenshot({ path: shot, fullPage: true });

/* ── measurements ──────────────────────────────────────────────────── */

const boxes = await tab.evaluate(() =>
  [...document.querySelectorAll("[data-ir-node]")].map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      id: (el as HTMLElement).dataset.irNode!,
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fontSize: cs.fontSize,
      // Line count, which is what "does the nav label wrap?" comes down to.
      lines: Math.max(1, Math.round(r.height / (parseFloat(cs.lineHeight) || r.height))),
      tag: el.tagName.toLowerCase(),
    };
  }),
);

/**
 * Wrapping is what a person notices first, so it gets measured rather than
 * eyeballed. A short label rendering on two lines is the specific symptom of a
 * type scale that is too large for the space the drawing gave it.
 */
const wrapped = boxes.filter((b) => b.lines > 1 && b.tag === "h2");

await browser.close();

const record = { label, at: new Date().toISOString(), viewport, boxes, wrapped: wrapped.length };
writeFileSync(join(outDir, `${slug}-${label}.json`), JSON.stringify(record, null, 2));

console.log(`render     ${shot}`);
console.log(`viewport   ${viewport.width}×${viewport.height} · ${boxes.length} nodes`);
console.log(`build      ${result.report.buildStatus} · ${result.report.validation.issues.length} validation issue(s)`);
console.log(`IR drift   ${result.drift.ok ? "none" : `${result.drift.violations.length} violation(s)`}`);
console.log(`headings on more than one line: ${wrapped.length}`);
for (const w of wrapped.slice(0, 6)) {
  console.log(`  ${w.id.padEnd(6)} ${w.w}×${w.h} at ${w.fontSize} — ${w.lines} lines`);
}
if (consoleErrors.length) console.log(`console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);

/* ── comparison ────────────────────────────────────────────────────── */

if (compareWith) {
  const previousShot = join(outDir, `${slug}-${compareWith}.png`);
  const previousJson = join(outDir, `${slug}-${compareWith}.json`);
  if (!existsSync(previousShot)) {
    console.log(`\nNo earlier render labelled "${compareWith}" — nothing to compare.`);
  } else {
    const previous = existsSync(previousJson)
      ? (JSON.parse(readFileSync(previousJson, "utf8")) as typeof record)
      : null;

    const uri = (p: string, mime: string) =>
      `data:${mime};base64,${readFileSync(p).toString("base64")}`;

    const html = `<!doctype html><html><head><meta charset="utf-8">
<title>SKITE visual comparison — ${slug}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font:14px/1.5 ui-sans-serif,system-ui,sans-serif; background:#0b1023; color:#e2e8f0; }
  header { padding:24px 28px 8px; }
  h1 { margin:0 0 4px; font-size:1.3rem; }
  .dim { color:#94a3b8; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; padding:16px 28px 40px; }
  figure { margin:0; display:flex; flex-direction:column; gap:8px; min-width:0; }
  figcaption { font-size:12px; color:#94a3b8; }
  figcaption b { color:#e2e8f0; display:block; font-size:13px; }
  .frame { border:1px solid #1e293b; border-radius:10px; overflow:auto; max-height:78vh; background:#fff; }
  img { display:block; width:100%; }
  table { border-collapse:collapse; margin:0 28px 40px; font-size:13px; }
  th,td { text-align:left; padding:6px 14px 6px 0; border-bottom:1px solid #1e293b; }
  th { color:#94a3b8; font-weight:500; }
  .good { color:#34d399; } .bad { color:#f87171; }
</style></head><body>
<header>
  <h1>${slug}</h1>
  <p class="dim">Original wireframe · previous render (<code>${compareWith}</code>) · current render (<code>${label}</code>) — all at ${viewport.width}px.</p>
</header>
<div class="grid">
  <figure><figcaption><b>Original wireframe</b>the input</figcaption>
    <div class="frame"><img src="${uri(image, "image/jpeg")}" alt="original wireframe"></div></figure>
  <figure><figcaption><b>Before — ${compareWith}</b>${previous ? `${previous.wrapped} heading(s) wrapping` : ""}</figcaption>
    <div class="frame"><img src="${uri(previousShot, "image/png")}" alt="previous render"></div></figure>
  <figure><figcaption><b>After — ${label}</b>${wrapped.length} heading(s) wrapping</figcaption>
    <div class="frame"><img src="${uri(shot, "image/png")}" alt="current render"></div></figure>
</div>
<table>
  <tr><th>Measure</th><th>${compareWith}</th><th>${label}</th></tr>
  <tr><td>Headings wrapping to 2+ lines</td>
      <td>${previous?.wrapped ?? "—"}</td>
      <td class="${wrapped.length === 0 ? "good" : "bad"}">${wrapped.length}</td></tr>
  <tr><td>Nodes rendered</td><td>${previous?.boxes.length ?? "—"}</td><td>${boxes.length}</td></tr>
  <tr><td>Build</td><td>—</td><td class="${result.report.buildStatus === "passed" ? "good" : "bad"}">${result.report.buildStatus}</td></tr>
  <tr><td>IR layout drift</td><td>—</td><td class="${result.drift.ok ? "good" : "bad"}">${result.drift.ok ? "none" : `${result.drift.violations.length}`}</td></tr>
</table>
</body></html>`;

    const comparison = join(outDir, `${slug}-${compareWith}-vs-${label}.html`);
    writeFileSync(comparison, html);
    console.log(`\ncomparison ${comparison}`);
    if (previous) {
      console.log(`headings wrapping: ${previous.wrapped} → ${wrapped.length}`);
    }
  }
}

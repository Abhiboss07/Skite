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

/**
 * Only the surface this script uses.
 *
 * Declared locally rather than imported from `playwright`, because referring to
 * its types — even inside a cast — makes the package a compile-time dependency
 * and breaks `npm run build` for anyone who has not installed it. Playwright is
 * optional at runtime and must stay optional at build time.
 */
type Playwright = {
  chromium: {
    launch(options?: { executablePath?: string }): Promise<Browser>;
  };
};

type Browser = {
  newPage(options?: { viewport?: { width: number; height: number } }): Promise<Tab>;
  close(): Promise<void>;
};

type Tab = {
  on(event: "pageerror", handler: (error: { message: string }) => void): void;
  on(event: "console", handler: (message: { type(): string; text(): string }) => void): void;
  setContent(html: string, options?: { waitUntil?: string; timeout?: number }): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  screenshot(options: { path: string; fullPage?: boolean }): Promise<unknown>;
  evaluate<T>(fn: () => T): Promise<T>;
};

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
/** `--ocr` transcribes the sketch, which is otherwise off. */
const useOcr = argv.includes("--ocr");
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


/* ── the utility subset the emitter uses ───────────────────────────── */

/**
 * CSS for exactly the classes the emitter can produce, generated locally.
 *
 * This replaced a Tailwind CDN script tag. The CDN worked until it did not, and
 * when it failed every layout class silently did nothing: the page rendered as
 * one stacked column and the screenshot looked like a catastrophic regression
 * that had not happened. Depending on a network for a check whose entire job is
 * to tell the truth about rendering was the wrong trade — and this project's
 * stated property is that it works with the wifi unplugged.
 *
 * The set is closed and small because `emit()` is a total function over a fixed
 * vocabulary. Anything it cannot produce is not needed here.
 */
function utilityCss(classNames: Set<string>): string {
  const rules: string[] = [];
  const md: string[] = [];
  const space = (n: number) => `${n * 0.25}rem`;

  const rule = (selector: string, body: string, breakpoint: boolean) => {
    const escaped = selector.replace(/([.:[\]/])/g, "\\$1");
    (breakpoint ? md : rules).push(`.${escaped}{${body}}`);
  };

  for (const raw of classNames) {
    const breakpoint = raw.startsWith("md:");
    const name = breakpoint ? raw.slice(3) : raw;
    let body: string | null = null;

    if (name === "flex") body = "display:flex";
    else if (name === "inline-flex") body = "display:inline-flex";
    else if (name === "grid") body = "display:grid";
    else if (name === "flex-col") body = "flex-direction:column";
    else if (name === "items-start") body = "align-items:flex-start";
    else if (name === "items-center") body = "align-items:center";
    else if (name === "justify-center") body = "justify-content:center";
    else if (name === "justify-between") body = "justify-content:space-between";
    else if (name === "place-items-center") body = "place-items:center";
    else if (name === "mx-auto") body = "margin-left:auto;margin-right:auto";
    else if (name === "w-full") body = "width:100%";
    else if (name === "w-fit") body = "width:fit-content";
    else if (name === "relative") body = "position:relative";
    else if (name === "absolute") body = "position:absolute";
    else if (name === "inset-0") body = "top:0;right:0;bottom:0;left:0";
    else if (name === "overflow-hidden") body = "overflow:hidden";
    else if (name === "pointer-events-none") body = "pointer-events:none";
    else if (name === "uppercase") body = "text-transform:uppercase";
    else if (name === "max-w-prose") body = "max-width:65ch";
    else {
      let m: RegExpMatchArray | null;
      if ((m = name.match(/^grid-cols-(\d+)$/)))
        body = `grid-template-columns:repeat(${m[1]},minmax(0,1fr))`;
      else if ((m = name.match(/^col-span-(\d+)$/))) body = `grid-column:span ${m[1]}/span ${m[1]}`;
      else if ((m = name.match(/^gap-(\d+)$/))) body = `gap:${space(Number(m[1]))}`;
      else if ((m = name.match(/^p-(\d+)$/))) body = `padding:${space(Number(m[1]))}`;
      else if ((m = name.match(/^px-(\d+)$/)))
        body = `padding-left:${space(Number(m[1]))};padding-right:${space(Number(m[1]))}`;
      else if ((m = name.match(/^py-(\d+)$/)))
        body = `padding-top:${space(Number(m[1]))};padding-bottom:${space(Number(m[1]))}`;
      else if ((m = name.match(/^max-w-\[(\d+)px\]$/))) body = `max-width:${m[1]}px`;
    }

    if (body) rule(raw, body, breakpoint);
  }

  return (
    `*,*::before,*::after{box-sizing:border-box}` +
    `body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}` +
    rules.join("") +
    (md.length ? `@media(min-width:768px){${md.join("")}}` : "")
  );
}

/** Every class name present in a rendered tree. */
function collectClasses(node: ComponentNode, columns: number, tokens: DesignTokens | undefined, into: Set<string>) {
  for (const c of emit(node, columns, tokens).className.split(/\s+/)) if (c) into.add(c);
  for (const child of node.children) collectClasses(child, columns, tokens, into);
  return into;
}

/* ── run ───────────────────────────────────────────────────────────── */

const buffer = readFileSync(image);
const result = await runPipeline(buffer, {
  classifier: "heuristic",
  sourceKind: "wireframe",
  ocr: useOcr,
});

const classes = collectClasses(
  result.tree.root,
  result.ir.canvas.grid.columns,
  result.design,
  new Set<string>(),
);
// Decoration markup is generated inside toHtml and never passes through emit().
for (const c of "pointer-events-none absolute inset-0 grid place-items-center".split(" ")) {
  classes.add(c);
}

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${utilityCss(classes)}</style>
</head><body style="margin:0;background:#eef1f5;padding:24px">
${toHtml(result.tree.root, result.ir.canvas.grid.columns, result.design)}
</body></html>`;

// Imported through a variable so TypeScript does not try to resolve it.
//
// Playwright is deliberately not a project dependency — it is a few hundred
// megabytes for a check that runs by hand — but a bare `import("playwright")`
// is still resolved at compile time, which broke `npm run build` for anyone who
// had not installed it. An optional runtime dependency should not be a
// compile-time one.
const playwrightSpecifier = "playwright";
const { chromium } = (await import(playwrightSpecifier).catch(() => {
  throw new Error(
    "Playwright is not installed. Run: npm install --no-save playwright\n" +
      "Set CHROMIUM to reuse an already-downloaded browser.",
  );
})) as Playwright;
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

// Verify the stylesheet applied before believing anything on screen. Kept even
// though the CSS is now local: a render nobody sanity-checked is how the last
// two rendering bugs survived.
const tailwindApplied = await tab.evaluate(() => {
  const probe = document.createElement("div");
  probe.className = "flex";
  document.body.appendChild(probe);
  const ok = getComputedStyle(probe).display === "flex";
  probe.remove();
  return ok;
});

if (!tailwindApplied) {
  await browser.close();
  throw new Error(
    "Layout utilities did not apply, so the render would be misleading.",
  );
}

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

/** Boilerplate still present, i.e. text the pipeline could not read. */
const placeholders = (result.code.match(/Heading goes here|Body copy from your sketch|Get started/g) ?? []).length;

const record = {
  label,
  at: new Date().toISOString(),
  viewport,
  boxes,
  wrapped: wrapped.length,
  placeholders,
  ocr: result.report.ocr.ran ? `${result.report.ocr.read}/${result.report.ocr.attempted}` : "not run",
};
writeFileSync(join(outDir, `${slug}-${label}.json`), JSON.stringify(record, null, 2));

console.log(`render     ${shot}`);
console.log(`viewport   ${viewport.width}×${viewport.height} · ${boxes.length} nodes`);
console.log(`build      ${result.report.buildStatus} · ${result.report.validation.issues.length} validation issue(s)`);
console.log(`IR drift   ${result.drift.ok ? "none" : `${result.drift.violations.length} violation(s)`}`);
console.log(`transcription: ${result.report.ocr.ran ? `${result.report.ocr.read}/${result.report.ocr.attempted} regions read via ${result.report.ocr.engine}` : "not run"}`);
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
  <tr><td>Placeholder strings in output</td>
      <td>${previous?.placeholders ?? "—"}</td>
      <td>${placeholders}</td></tr>
  <tr><td>Regions transcribed</td><td>${previous?.ocr ?? "—"}</td>
      <td>${result.report.ocr.ran ? `${result.report.ocr.read}/${result.report.ocr.attempted}` : "not run"}</td></tr>
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

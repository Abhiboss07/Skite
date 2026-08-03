/**
 * The design constraint engine.
 *
 * Given a validated semantic IR and the source pixels, produce a coherent set
 * of design tokens. Deterministic and rule-based — no model. A model may later
 * make the stylistic call between two defensible palettes, but that is a
 * refinement on top of this, not a replacement for it: the same sketch must
 * produce the same design every time, or the fidelity check below means
 * nothing.
 *
 * The engine reads two things and writes neither:
 *
 *   • the semantic IR, for what kinds of things are on the page and how much
 *     size contrast the author drew between them;
 *   • the source image, for colours the author actually used.
 *
 * It cannot express a position. See `tokens.ts` — the schema has no positional
 * field, and `assertNoLayoutTokens` fails loudly if one is ever merged in.
 */

import sharp from "sharp";

import type { SemanticIR, SemanticNode } from "../semantic/schema.ts";
import {
  assertNoLayoutTokens,
  type DesignTokens,
  type Palette,
  type TypeScale,
} from "./tokens.ts";

/* ── colour helpers ────────────────────────────────────────────────── */

type Rgb = { r: number; g: number; b: number };

const hex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

/** Relative luminance, WCAG 2.1. */
function luminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
      : max === gn
        ? ((bn - rn) / d + 2) * 60
        : ((rn - gn) / d + 4) * 60;
  return { h, s, l };
}

function fromHsl(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

/** Darken or lighten until the pair clears a contrast ratio. */
function ensureContrast(colour: Rgb, against: Rgb, target: number): Rgb {
  if (contrast(colour, against) >= target) return colour;
  const { h, s } = toHsl(colour);
  const goDarker = luminance(against) > 0.5;

  // Walk lightness in small steps rather than solving analytically: the
  // relationship between lightness and contrast is not linear, and 50 steps is
  // both exact enough and instant.
  for (let i = 1; i <= 50; i++) {
    const l = goDarker ? 0.5 - (i / 50) * 0.5 : 0.5 + (i / 50) * 0.5;
    const candidate = fromHsl(h, s, l);
    if (contrast(candidate, against) >= target) return candidate;
  }
  return goDarker ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
}

/* ── palette extraction ────────────────────────────────────────────── */

/**
 * Find the colours the author actually drew with.
 *
 * A wireframe is mostly paper and graphite, so the interesting question is
 * whether anything on the page is *chromatic*. Pixels are binned by hue at low
 * resolution, greys are discarded, and the dominant remaining hue — if it
 * covers enough of the page to be deliberate — becomes the accent.
 *
 * The threshold matters. Scanner tint, JPEG ringing around black strokes and
 * the warm cast of a phone photo all produce weakly saturated pixels, and
 * treating those as a design decision would give every sketch a muddy accent
 * that the author never chose. Requiring both real saturation and real coverage
 * keeps "the author drew in blue" separate from "the paper was slightly yellow".
 */
async function extractPalette(image: Buffer): Promise<{ accent: Rgb | null; coverage: number }> {
  const { data, info } = await sharp(image)
    .resize(120, 120, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bins = new Map<number, { count: number; r: number; g: number; b: number }>();
  let chromatic = 0;
  const total = info.width * info.height;

  for (let i = 0; i < data.length; i += info.channels) {
    const rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const { h, s, l } = toHsl(rgb);
    // Ignore near-white paper, near-black ink, and anything barely tinted.
    if (s < 0.25 || l < 0.12 || l > 0.93) continue;
    chromatic++;
    const bin = Math.round(h / 15) * 15;
    const entry = bins.get(bin) ?? { count: 0, r: 0, g: 0, b: 0 };
    bins.set(bin, {
      count: entry.count + 1,
      r: entry.r + rgb.r,
      g: entry.g + rgb.g,
      b: entry.b + rgb.b,
    });
  }

  const coverage = chromatic / total;
  if (coverage < 0.02 || bins.size === 0) return { accent: null, coverage };

  const [, best] = [...bins.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  return {
    accent: { r: best.r / best.count, g: best.g / best.count, b: best.b / best.count },
    coverage,
  };
}

/* ── type scale ────────────────────────────────────────────────────── */

/**
 * Build a type scale whose contrast matches the drawing's own.
 *
 * An author who drew a headline four times the height of body copy wanted a
 * dramatic page; one who drew it 1.3× wanted a quiet one. Reproducing that
 * ratio keeps the *feel* of the sketch even though every absolute size is
 * being replaced.
 *
 * The measured ratio is snapped to a named musical interval rather than used
 * raw. A scale of 1.37 is arbitrary and shows as arbitrary; a major third is a
 * decision, and stepping consistently is most of what makes type look designed.
 */
function buildTypeScale(ir: SemanticIR): { scale: TypeScale; because: string } {
  const heights: Record<string, number[]> = {};
  const walk = (node: SemanticNode) => {
    if (["Heading", "Subheading", "Paragraph", "Label"].includes(node.type)) {
      (heights[node.type] ??= []).push(node.box.h);
    }
    node.children.forEach(walk);
  };
  walk(ir.root);

  const median = (v: number[] = []) =>
    v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] : 0;

  // Labels first, deliberately. A Paragraph node is a *block* — the detector
  // merges its lines — so its box height is line count times line height, and
  // comparing a heading against it reported the heading as 0.93× body, which is
  // impossible. A Label is single-line by construction and is the honest proxy
  // for one line of body text.
  const bodyH = median(heights.Label) || median(heights.Paragraph) || 20;
  const headingH = median(heights.Heading) || median(heights.Subheading) || bodyH * 1.5;
  const measured = headingH / Math.max(1, bodyH);

  const INTERVALS = [
    { ratio: 1.125, name: "major second" },
    { ratio: 1.2, name: "minor third" },
    { ratio: 1.25, name: "major third" },
    { ratio: 1.333, name: "perfect fourth" },
    { ratio: 1.414, name: "augmented fourth" },
    { ratio: 1.5, name: "perfect fifth" },
  ];
  // Two steps separate body from heading, so compare against the square root.
  const perStep = Math.sqrt(Math.max(1.05, Math.min(2.5, measured)));
  const chosen = INTERVALS.reduce((best, i) =>
    Math.abs(i.ratio - perStep) < Math.abs(best.ratio - perStep) ? i : best,
  );

  // ── the absolute anchor ──────────────────────────────────────────
  //
  // The ratio says how much bigger a heading is than body text. It says nothing
  // about how big body text should be, and a fixed 1rem base ignored the
  // drawing entirely.
  //
  // `bodyH` is the *ink* height of a line — roughly its cap height — so the
  // font size that produced it is about 1/0.72 larger. The canvas is 1440 wide
  // and the generated page renders into a container of the same width, so a
  // canvas pixel is a CSS pixel and no further scaling is needed.
  //
  // The result is then clamped, and the clamp is the honest part. A wireframe
  // is drawn at whatever size the paper or artboard happened to be; it fixes
  // proportions, not absolute type sizes. A drawing whose body ink is 40px tall
  // is not asking for 55px body copy on the web, it is asking for *large* body
  // copy. Clamping to a readable band keeps the measurement meaningful without
  // letting an arbitrary artboard dictate an unusable page — and when the clamp
  // binds, the rationale says so rather than presenting the result as measured.
  const CAP_HEIGHT_RATIO = 0.72;
  const measuredPx = bodyH / CAP_HEIGHT_RATIO;
  const measuredRem = measuredPx / 16;
  const MIN_REM = 0.875;
  const MAX_REM = 1.25;
  const base = Math.round(Math.max(MIN_REM, Math.min(MAX_REM, measuredRem)) * 1000) / 1000;
  const clamped = measuredRem < MIN_REM || measuredRem > MAX_REM;

  const step = (n: number) => Math.round(base * chosen.ratio ** n * 1000) / 1000;

  // A ratio below 1 means the measurement is not describing type contrast —
  // clamping it silently would produce a plausible scale from a broken input.
  const trustworthy = measured >= 1;

  return {
    scale: {
      ratio: chosen.ratio,
      baseSize: base,
      display: { size: step(4), lineHeight: 1.05, weight: 700, tracking: -0.03 },
      heading: { size: step(3), lineHeight: 1.15, weight: 650, tracking: -0.02 },
      subheading: { size: step(2), lineHeight: 1.25, weight: 600, tracking: -0.01 },
      body: { size: step(0), lineHeight: 1.6, weight: 400, tracking: 0 },
      label: { size: step(-1), lineHeight: 1.4, weight: 500, tracking: 0.01 },
      caption: { size: step(-2), lineHeight: 1.4, weight: 400, tracking: 0.02 },
    },
    because:
      (trustworthy
        ? `heading is ${measured.toFixed(2)}× body in the drawing, so ${chosen.ratio} ` +
          `(${chosen.name}) per step`
        : `could not measure type contrast (heading read as ${measured.toFixed(2)}× body, ` +
          `which is impossible) — fell back to ${chosen.ratio} (${chosen.name})`) +
      `; body ink measures ${bodyH.toFixed(0)}px, implying ${measuredRem.toFixed(2)}rem` +
      (clamped
        ? `, clamped to ${base}rem — a drawing fixes proportions, not absolute type size`
        : `, used as the base`),
  };
}

/* ── entry point ───────────────────────────────────────────────────── */

export async function generateDesign(
  ir: SemanticIR,
  source: Buffer,
): Promise<DesignTokens> {
  const started = Date.now();
  const rationale: { token: string; because: string }[] = [];

  /* — palette — */
  const { accent: drawn, coverage } = await extractPalette(source);

  const background: Rgb = { r: 255, g: 255, b: 255 };
  const surface: Rgb = { r: 250, g: 250, b: 252 };

  let accent: Rgb;
  let paletteSource: Palette["source"];

  if (drawn) {
    // Keep the author's hue; only adjust lightness until it is readable.
    const { h, s } = toHsl(drawn);
    accent = ensureContrast(fromHsl(h, Math.max(0.45, s), 0.45), background, 4.5);
    paletteSource = "extracted";
    rationale.push({
      token: "palette.accent",
      because:
        `the drawing uses colour on ${(coverage * 100).toFixed(1)}% of its pixels; ` +
        `its dominant hue (${Math.round(h)}°) is kept and only its lightness adjusted to reach 4.5:1`,
    });
  } else {
    // A monochrome wireframe expresses no colour preference. Inventing a loud
    // one would be putting words in the author's mouth, so the default is a
    // restrained blue and the report says it was a default.
    accent = { r: 37, g: 99, b: 235 };
    paletteSource = "default";
    rationale.push({
      token: "palette.accent",
      because:
        `the drawing is monochrome (${(coverage * 100).toFixed(1)}% chromatic pixels), ` +
        `so no colour preference was expressed and a restrained default is used`,
    });
  }

  const foreground = ensureContrast({ r: 15, g: 23, b: 42 }, background, 7);
  const muted = ensureContrast({ r: 100, g: 116, b: 139 }, background, 4.5);

  const palette: Palette = {
    source: paletteSource,
    background: hex(background),
    surface: hex(surface),
    foreground: hex(foreground),
    muted: hex(muted),
    border: hex({ r: 226, g: 232, b: 240 }),
    accent: hex(accent),
    accentForeground: hex(
      contrast({ r: 255, g: 255, b: 255 }, accent) >= 4.5
        ? { r: 255, g: 255, b: 255 }
        : { r: 15, g: 23, b: 42 },
    ),
    contrast: {
      foreground: Math.round(contrast(foreground, background) * 100) / 100,
      muted: Math.round(contrast(muted, background) * 100) / 100,
      accent: Math.round(contrast(accent, background) * 100) / 100,
    },
  };

  rationale.push({
    token: "palette.foreground",
    because: `adjusted to ${palette.contrast.foreground}:1 on the background — AAA for body text`,
  });

  /* — type — */
  const { scale, because: typeBecause } = buildTypeScale(ir);
  rationale.push({ token: "type.scale", because: typeBecause });

  /* — spacing — */
  // The ladder is built from the base unit the detector measured, so the
  // rhythm of the generated page is the rhythm of the drawing. Which rung a
  // given gap lands on was decided by the layout, not here.
  const unit = Math.max(4, Math.round(ir.canvas.baseUnit / 2));
  const spacing = [0, 1, 2, 3, 4, 6, 8, 12, 16].map((m) => m * unit);
  rationale.push({
    token: "spacing",
    because: `ladder of ${unit}px, half the ${ir.canvas.baseUnit}px base unit measured in the drawing`,
  });

  /* — radius, shadow, motion — */
  // Roundness follows the page's own density: a page of many small components
  // reads as a compact interface and wants tighter corners than a page of a few
  // large blocks.
  const count = Object.values(ir.summary).reduce((a, b) => a + b, 0);
  const dense = count / Math.max(1, (ir.canvas.w * ir.canvas.h) / 1e6) > 12;
  const radiusBase = dense ? 6 : 10;
  rationale.push({
    token: "radius",
    because: `${count} components on a ${(ir.canvas.w * ir.canvas.h) / 1e6 | 0}Mpx canvas — ${dense ? "dense, so tighter corners" : "open, so softer corners"}`,
  });

  const tint = `${Math.round(foreground.r)} ${Math.round(foreground.g)} ${Math.round(foreground.b)}`;

  const tokens: DesignTokens = {
    version: "tokens-1.0",
    derivedFrom: ir.derivedFrom,
    palette,
    type: scale,
    spacing,
    baseUnit: ir.canvas.baseUnit,
    radius: { sm: radiusBase / 2, md: radiusBase, lg: radiusBase * 2, full: 9999 },
    shadow: {
      sm: `0 1px 2px rgb(${tint} / 0.06)`,
      md: `0 4px 12px rgb(${tint} / 0.08)`,
      lg: `0 12px 32px rgb(${tint} / 0.10)`,
    },
    motion: { fast: 120, base: 220, slow: 400, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    rationale,
    engine: "rules-1.0",
    ms: Date.now() - started,
  };

  // Belt and braces: the schema cannot express layout, but a future pass could
  // merge extra keys in before this is handed on.
  assertNoLayoutTokens(tokens, "generateDesign");

  return tokens;
}

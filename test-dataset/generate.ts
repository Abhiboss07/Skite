/**
 * Synthetic benchmark generator.
 *
 * ⚠️ These are SYNTHETIC sketches, not real hand-drawn ones. I generated them,
 * so the ground truth is exact — which makes them ideal for regression testing
 * and useless for proving real-world robustness. Both facts matter:
 *
 *   • exact ground truth  → fidelity numbers here have no annotator noise
 *   • synthetic strokes   → they do not capture how real people actually draw
 *
 * `test-dataset/real/` is where genuine sketches go. Numbers from that set are
 * the ones worth quoting; numbers from this set are for catching regressions.
 *
 * Run:  node test-dataset/generate.ts
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const OUT = join(import.meta.dirname, "synthetic");
const CANVAS_W = 1440;

/** Deterministic PRNG so the corpus is reproducible from the seed alone. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Style = "sketch" | "wireframe" | "figma";
type Role =
  | "navbar" | "hero" | "heading" | "paragraph"
  | "button" | "image" | "card" | "grid" | "footer";

type GTNode = {
  id: string;
  role: Role;
  parent: string | null;
  box: { x: number; y: number; w: number; h: number };
  text?: string;
};

/* ── stroke rendering ──────────────────────────────────────────────── */

type Jitter = { amp: number; width: number };

const STYLE: Record<Style, Jitter> = {
  sketch: { amp: 4.5, width: 3.4 },
  wireframe: { amp: 0, width: 1.8 },
  figma: { amp: 0, width: 1.4 },
};

/** A line drawn as a slightly wandering quadratic — the core of the hand-drawn look. */
function wobblyLine(
  x1: number, y1: number, x2: number, y2: number,
  amp: number, rand: () => number,
): string {
  if (amp === 0) return `M${x1} ${y1} L${x2} ${y2}`;
  const mx = (x1 + x2) / 2 + (rand() - 0.5) * amp * 2;
  const my = (y1 + y2) / 2 + (rand() - 0.5) * amp * 2;
  const j = () => (rand() - 0.5) * amp;
  return `M${x1 + j()} ${y1 + j()} Q${mx} ${my} ${x2 + j()} ${y2 + j()}`;
}

function rect(
  b: { x: number; y: number; w: number; h: number },
  style: Style, rand: () => number, dashed = false,
): string {
  const { amp, width } = STYLE[style];
  const { x, y, w, h } = b;
  const paths = [
    wobblyLine(x, y, x + w, y, amp, rand),
    wobblyLine(x + w, y, x + w, y + h, amp, rand),
    wobblyLine(x + w, y + h, x, y + h, amp, rand),
    wobblyLine(x, y + h, x, y, amp, rand),
  ];
  const dash = dashed ? ` stroke-dasharray="${style === "sketch" ? "14 10" : "8 6"}"` : "";
  return paths
    .map((d) => `<path d="${d}" stroke="#1a1a1a" stroke-width="${width}" fill="none" stroke-linecap="round"${dash}/>`)
    .join("");
}

/** Scribbled text lines. Real handwriting is not legible at wireframe scale either. */
function textLines(
  b: { x: number; y: number; w: number; h: number },
  lines: number, style: Style, rand: () => number, weight = 1,
): string {
  const { amp } = STYLE[style];
  const width = STYLE[style].width * weight;
  const gap = b.h / Math.max(1, lines);
  let out = "";
  for (let i = 0; i < lines; i++) {
    const yy = b.y + gap * i + gap * 0.5;
    // Last line short, as real text blocks are.
    const lineW = b.w * (i === lines - 1 ? 0.55 + rand() * 0.2 : 0.9 + rand() * 0.1);
    if (style === "figma") {
      out += `<rect x="${b.x}" y="${yy - gap * 0.22}" width="${lineW}" height="${gap * 0.44}" fill="#c9ccd2"/>`;
    } else {
      out += `<path d="${wobblyLine(b.x, yy, b.x + lineW, yy, amp * 0.8, rand)}" stroke="#1a1a1a" stroke-width="${width * 0.9}" fill="none" stroke-linecap="round"/>`;
    }
  }
  return out;
}

function imagePlaceholder(
  b: { x: number; y: number; w: number; h: number },
  style: Style, rand: () => number,
): string {
  const { amp, width } = STYLE[style];
  if (style === "figma") {
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#dcdfe4"/>` + rect(b, style, rand);
  }
  return (
    rect(b, style, rand) +
    `<path d="${wobblyLine(b.x, b.y, b.x + b.w, b.y + b.h, amp, rand)}" stroke="#1a1a1a" stroke-width="${width * 0.7}" fill="none"/>` +
    `<path d="${wobblyLine(b.x + b.w, b.y, b.x, b.y + b.h, amp, rand)}" stroke="#1a1a1a" stroke-width="${width * 0.7}" fill="none"/>`
  );
}

/* ── layout archetypes ─────────────────────────────────────────────── */

type Archetype = (rand: () => number) => { nodes: GTNode[]; height: number };

const archetypes: Archetype[] = [
  // 1. nav · split hero · 3 cards · footer
  (rand) => {
    const M = 64 + Math.round(rand() * 24);
    const W = CANVAS_W - M * 2;
    const nodes: GTNode[] = [];
    let y = 40;

    nodes.push({ id: "n1", role: "navbar", parent: null, box: { x: M, y, w: W, h: 72 } });
    y += 72 + 56;

    const heroH = 360 + Math.round(rand() * 120);
    nodes.push({ id: "n2", role: "hero", parent: null, box: { x: M, y, w: W, h: heroH } });
    const colW = (W - 48) / 2;
    nodes.push({ id: "n3", role: "heading", parent: "n2", box: { x: M + 32, y: y + 56, w: colW - 64, h: 96 }, text: "Build faster" });
    nodes.push({ id: "n4", role: "paragraph", parent: "n2", box: { x: M + 32, y: y + 200, w: colW - 64, h: 72 }, text: "Body copy" });
    nodes.push({ id: "n5", role: "button", parent: "n2", box: { x: M + 32, y: y + 276, w: 180, h: 56 }, text: "Get started" });
    nodes.push({ id: "n6", role: "image", parent: "n2", box: { x: M + colW + 48, y: y + 40, w: colW - 32, h: heroH - 80 } });
    y += heroH + 72;

    const cardW = (W - 48) / 3;
    nodes.push({ id: "n7", role: "grid", parent: null, box: { x: M, y, w: W, h: 260 } });
    for (let i = 0; i < 3; i++) {
      const cx = M + i * (cardW + 24);
      nodes.push({ id: `n8${i}`, role: "card", parent: "n7", box: { x: cx, y, w: cardW, h: 260 } });
      nodes.push({ id: `n9${i}`, role: "heading", parent: `n8${i}`, box: { x: cx + 24, y: y + 32, w: cardW - 48, h: 40 } });
      nodes.push({ id: `n10${i}`, role: "paragraph", parent: `n8${i}`, box: { x: cx + 24, y: y + 104, w: cardW - 48, h: 88 } });
    }
    y += 260 + 72;

    nodes.push({ id: "n11", role: "footer", parent: null, box: { x: M, y, w: W, h: 120 } });
    return { nodes, height: y + 120 + 48 };
  },

  // 2. nav · centred hero · 4 cards · footer
  (rand) => {
    const M = 80;
    const W = CANVAS_W - M * 2;
    const nodes: GTNode[] = [];
    let y = 40;

    nodes.push({ id: "n1", role: "navbar", parent: null, box: { x: M, y, w: W, h: 64 } });
    y += 64 + 64;

    const heroH = 300;
    nodes.push({ id: "n2", role: "hero", parent: null, box: { x: M, y, w: W, h: heroH } });
    nodes.push({ id: "n3", role: "heading", parent: "n2", box: { x: M + W * 0.2, y: y + 60, w: W * 0.6, h: 88 } });
    nodes.push({ id: "n4", role: "paragraph", parent: "n2", box: { x: M + W * 0.25, y: y + 186, w: W * 0.5, h: 56 } });
    nodes.push({ id: "n5", role: "button", parent: "n2", box: { x: M + W * 0.42, y: y + 244, w: 168, h: 52 } });
    y += heroH + 80;

    const cardW = (W - 72) / 4;
    nodes.push({ id: "n6", role: "grid", parent: null, box: { x: M, y, w: W, h: 220 } });
    for (let i = 0; i < 4; i++) {
      const cx = M + i * (cardW + 24);
      nodes.push({ id: `n7${i}`, role: "card", parent: "n6", box: { x: cx, y, w: cardW, h: 220 } });
      nodes.push({ id: `n8${i}`, role: "image", parent: `n7${i}`, box: { x: cx + 20, y: y + 20, w: cardW - 40, h: 96 } });
      nodes.push({ id: `n9${i}`, role: "paragraph", parent: `n7${i}`, box: { x: cx + 20, y: y + 136, w: cardW - 40, h: 60 } });
    }
    y += 220 + 72;
    void rand;

    nodes.push({ id: "n10", role: "footer", parent: null, box: { x: M, y, w: W, h: 104 } });
    return { nodes, height: y + 104 + 40 };
  },

  // 3. nav · full-bleed image hero · heading + paragraph · 2 cards · footer
  (rand) => {
    const M = 56;
    const W = CANVAS_W - M * 2;
    const nodes: GTNode[] = [];
    let y = 36;

    nodes.push({ id: "n1", role: "navbar", parent: null, box: { x: M, y, w: W, h: 68 } });
    y += 68 + 40;

    nodes.push({ id: "n2", role: "image", parent: null, box: { x: M, y, w: W, h: 320 + Math.round(rand() * 80) } });
    y += 320 + 64;

    nodes.push({ id: "n3", role: "heading", parent: null, box: { x: M, y, w: W * 0.55, h: 72 } });
    y += 72 + 28;
    nodes.push({ id: "n4", role: "paragraph", parent: null, box: { x: M, y, w: W * 0.7, h: 96 } });
    y += 96 + 64;

    const cardW = (W - 32) / 2;
    nodes.push({ id: "n5", role: "grid", parent: null, box: { x: M, y, w: W, h: 240 } });
    for (let i = 0; i < 2; i++) {
      const cx = M + i * (cardW + 32);
      nodes.push({ id: `n6${i}`, role: "card", parent: "n5", box: { x: cx, y, w: cardW, h: 240 } });
      nodes.push({ id: `n7${i}`, role: "heading", parent: `n6${i}`, box: { x: cx + 28, y: y + 32, w: cardW - 56, h: 44 } });
      nodes.push({ id: `n8${i}`, role: "paragraph", parent: `n6${i}`, box: { x: cx + 28, y: y + 112, w: cardW - 56, h: 76 } });
    }
    y += 240 + 64;

    nodes.push({ id: "n9", role: "footer", parent: null, box: { x: M, y, w: W, h: 112 } });
    return { nodes, height: y + 112 + 40 };
  },

  // 4. minimal: nav · hero · footer
  (rand) => {
    const M = 96;
    const W = CANVAS_W - M * 2;
    const nodes: GTNode[] = [];
    let y = 48;

    nodes.push({ id: "n1", role: "navbar", parent: null, box: { x: M, y, w: W, h: 60 } });
    y += 60 + 72;

    const heroH = 420 + Math.round(rand() * 60);
    nodes.push({ id: "n2", role: "hero", parent: null, box: { x: M, y, w: W, h: heroH } });
    nodes.push({ id: "n3", role: "heading", parent: "n2", box: { x: M + 48, y: y + 80, w: W * 0.5, h: 104 } });
    nodes.push({ id: "n4", role: "paragraph", parent: "n2", box: { x: M + 48, y: y + 208, w: W * 0.42, h: 80 } });
    nodes.push({ id: "n5", role: "button", parent: "n2", box: { x: M + 48, y: y + 312, w: 192, h: 56 } });
    y += heroH + 80;

    nodes.push({ id: "n6", role: "footer", parent: null, box: { x: M, y, w: W, h: 96 } });
    return { nodes, height: y + 96 + 48 };
  },

  // 5. nav · heading · 6-card grid (2 rows) · footer
  (rand) => {
    const M = 72;
    const W = CANVAS_W - M * 2;
    const nodes: GTNode[] = [];
    let y = 40;

    nodes.push({ id: "n1", role: "navbar", parent: null, box: { x: M, y, w: W, h: 66 } });
    y += 66 + 56;
    nodes.push({ id: "n2", role: "heading", parent: null, box: { x: M, y, w: W * 0.45, h: 80 } });
    y += 80 + 48;

    const cardW = (W - 48) / 3;
    const gridH = 200 * 2 + 24;
    nodes.push({ id: "n3", role: "grid", parent: null, box: { x: M, y, w: W, h: gridH } });
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const cx = M + c * (cardW + 24);
        const cy = y + r * (200 + 24);
        const id = `n4${r}${c}`;
        nodes.push({ id, role: "card", parent: "n3", box: { x: cx, y: cy, w: cardW, h: 200 } });
        nodes.push({ id: `n5${r}${c}`, role: "paragraph", parent: id, box: { x: cx + 20, y: cy + 40, w: cardW - 40, h: 96 } });
      }
    }
    y += gridH + 64;
    void rand;

    nodes.push({ id: "n6", role: "footer", parent: null, box: { x: M, y, w: W, h: 108 } });
    return { nodes, height: y + 108 + 40 };
  },
];

/* ── SVG assembly ──────────────────────────────────────────────────── */

function toSvg(nodes: GTNode[], height: number, style: Style, rand: () => number): string {
  const bg = style === "sketch" ? "#fbfaf6" : "#ffffff";
  let body = "";

  for (const n of nodes) {
    switch (n.role) {
      case "navbar":
      case "hero":
      case "footer":
      case "card":
        body += rect(n.box, style, rand);
        break;
      case "grid":
        // Intentionally not drawn. A grid is implied by a row of cards; the
        // synthesis pass has to infer it rather than being handed a rectangle.
        break;
      case "image":
        body += imagePlaceholder(n.box, style, rand);
        break;
      case "button":
        body += rect(n.box, style, rand);
        body += textLines({ ...n.box, x: n.box.x + 24, w: n.box.w - 48, y: n.box.y + n.box.h / 2 - 6, h: 12 }, 1, style, rand);
        break;
      case "heading":
        // Heavier stroke: people write titles bigger.
        body += textLines(n.box, n.box.h > 80 ? 2 : 1, style, rand, 2.4);
        break;
      case "paragraph":
        body += textLines(n.box, Math.max(2, Math.round(n.box.h / 26)), style, rand);
        break;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${height}" viewBox="0 0 ${CANVAS_W} ${height}">
<rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`;
}

/**
 * Sketch inputs get photographed: a small rotation and an uneven lighting
 * gradient. This is what exercises the illumination-normalisation step — a
 * corpus of perfectly flat images would let a broken preprocessor pass.
 */
async function rasterise(svg: string, style: Style, rand: () => number, height: number) {
  let img = sharp(Buffer.from(svg)).png();

  if (style === "sketch") {
    const angle = (rand() - 0.5) * 2.4;
    const gradient = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${height}">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stop-color="#000" stop-opacity="0.16"/>
          <stop offset="0.5" stop-color="#000" stop-opacity="0.02"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.20"/>
        </linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#g)"/></svg>`,
    );
    img = sharp(
      await img
        .composite([{ input: gradient, blend: "multiply" }])
        .rotate(angle, { background: "#f6f4ee" })
        .blur(0.6)
        .toBuffer(),
    ).png();
  }

  return img.toBuffer();
}

/* ── main ──────────────────────────────────────────────────────────── */

/** Remove logical-only nodes so ground truth describes what is actually drawn. */
function dropUndrawn(nodes: GTNode[]): GTNode[] {
  const gridIds = new Set(nodes.filter((n) => n.role === "grid").map((n) => n.id));
  return nodes
    .filter((n) => !gridIds.has(n.id))
    .map((n) => (n.parent && gridIds.has(n.parent) ? { ...n, parent: null } : n));
}

const PER_STYLE = 20;
const styles: Style[] = ["sketch", "wireframe", "figma"];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const index: { id: string; style: Style; image: string; truth: string }[] = [];

for (const style of styles) {
  for (let i = 0; i < PER_STYLE; i++) {
    const seed = styles.indexOf(style) * 1000 + i + 1;
    const rand = rng(seed);
    const archetype = archetypes[i % archetypes.length];
    const { nodes, height } = archetype(rand);

    const truthNodes = dropUndrawn(nodes);
    const svg = toSvg(nodes, height, style, rand);
    const png = await rasterise(svg, style, rand, height);

    const id = `${style}-${String(i + 1).padStart(3, "0")}`;
    const imageFile = `${id}.png`;
    const truthFile = `${id}.truth.json`;

    writeFileSync(join(OUT, imageFile), png);
    writeFileSync(
      join(OUT, truthFile),
      JSON.stringify(
        { id, style, seed, archetype: i % archetypes.length, canvas: { w: CANVAS_W, h: height }, nodes: truthNodes },
        null,
        2,
      ),
    );
    index.push({ id, style, image: imageFile, truth: truthFile });
  }
}

writeFileSync(join(OUT, "index.json"), JSON.stringify({ generated: new Date().toISOString(), count: index.length, items: index }, null, 2));

console.log(`generated ${index.length} samples → test-dataset/synthetic/`);
for (const s of styles) {
  console.log(`  ${s}: ${index.filter((i) => i.style === s).length}`);
}

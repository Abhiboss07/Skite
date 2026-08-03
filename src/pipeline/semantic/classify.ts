/**
 * Rule-based semantic classification.
 *
 * Deterministic, offline, and benchmarkable — no model. Every type comes from
 * geometry, nesting, sibling structure and the detection role, and every
 * assignment records which rule fired and why.
 *
 * Two boundaries are enforced rather than hoped for:
 *
 *   1. **Geometry is read, never written.** Boxes are copied from the detection
 *      IR untouched. A semantic pass that could adjust a box would be a second
 *      detector, and the first one is frozen.
 *
 *   2. **Types that need text are not guessed.** A pricing card and a
 *      testimonial are the same rectangle until you read them. Without OCR they
 *      are reported as undecidable, not assigned by vibes.
 */

import type { IR, IRNode } from "../ir/schema.ts";
import {
  TEXT_DEPENDENT,
  type Layout,
  type SemanticIR,
  type SemanticNode,
  type SemanticType,
} from "./schema.ts";

type Ctx = {
  ir: IR;
  byId: Map<string, IRNode>;
  childrenOf: Map<string, IRNode[]>;
  /** Median text height on this page, for relative size judgements. */
  medianTextHeight: number;
  canvasW: number;
  canvasH: number;
};

/* ── layout facts ──────────────────────────────────────────────────── */

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Derive arrangement from where children actually are.
 *
 * A row is children sharing a horizontal band; anything else stacks. Alignment
 * is read off the spread of their edges: if lefts agree they are start-aligned,
 * if centres agree they are centred, if both edges agree they stretch.
 */
function deriveLayout(node: IRNode | null, children: IRNode[], ctx: Ctx, order: number): Layout {
  const canvasW = ctx.canvasW;
  const box = node?.box ?? { x: 0, y: 0, w: canvasW, h: ctx.canvasH };

  if (children.length === 0) {
    return {
      direction: "none",
      columns: 1,
      span: spanOf(box.w, canvasW, ctx.ir.canvas.grid.columns),
      gap: 0,
      widthRatio: box.w / canvasW,
      align: "start",
      order,
    };
  }

  const sorted = [...children].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const first = sorted[0];
  const inRow =
    sorted.length > 1 &&
    sorted.every(
      (c) =>
        Math.min(c.box.y + c.box.h, first.box.y + first.box.h) - Math.max(c.box.y, first.box.y) >
        Math.min(c.box.h, first.box.h) * 0.5,
    );

  const gaps: number[] = [];
  if (inRow) {
    const byX = [...sorted].sort((a, b) => a.box.x - b.box.x);
    for (let i = 1; i < byX.length; i++) {
      gaps.push(byX[i].box.x - (byX[i - 1].box.x + byX[i - 1].box.w));
    }
  } else {
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(sorted[i].box.y - (sorted[i - 1].box.y + sorted[i - 1].box.h));
    }
  }

  // Alignment along the cross axis of the flow.
  const starts = inRow ? children.map((c) => c.box.y) : children.map((c) => c.box.x);
  const ends = inRow
    ? children.map((c) => c.box.y + c.box.h)
    : children.map((c) => c.box.x + c.box.w);
  const centres = starts.map((s, i) => (s + ends[i]) / 2);

  const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
  const tolerance = Math.max(8, (inRow ? box.h : box.w) * 0.04);

  let align: Layout["align"] = "mixed";
  if (spread(starts) <= tolerance && spread(ends) <= tolerance) align = "stretch";
  else if (spread(centres) <= tolerance) align = "center";
  else if (spread(starts) <= tolerance) align = "start";
  else if (spread(ends) <= tolerance) align = "end";

  return {
    direction: inRow ? "row" : "column",
    columns: inRow ? Math.min(12, children.length) : 1,
    span: spanOf(box.w, canvasW, ctx.ir.canvas.grid.columns),
    gap: Math.max(0, Math.round(median(gaps.filter((g) => g > 0)))),
    widthRatio: box.w / canvasW,
    align,
    order,
  };
}

const spanOf = (w: number, canvasW: number, columns: number) =>
  Math.max(1, Math.min(12, Math.round((w / canvasW) * columns)));

/* ── sibling patterns ──────────────────────────────────────────────── */

/** Siblings sharing a band with similar dimensions — a repeated row. */
function repeatedRow(node: IRNode, siblings: IRNode[]): IRNode[] {
  const peers = siblings.filter(
    (s) =>
      Math.abs(s.box.y - node.box.y) < Math.max(node.box.h, s.box.h) * 0.4 &&
      Math.abs(s.box.w - node.box.w) < node.box.w * 0.3 &&
      Math.abs(s.box.h - node.box.h) < node.box.h * 0.35,
  );
  return peers.length >= 2 ? peers : [];
}

/* ── the rules ─────────────────────────────────────────────────────── */

type Decision = { type: SemanticType; rule: string; confidence: number; because: string[] };

function classifyNode(node: IRNode, ctx: Ctx): Decision {
  const kids = ctx.childrenOf.get(node.id) ?? [];
  const parent = node.parent ? ctx.byId.get(node.parent) : undefined;
  const siblings = (parent ? (ctx.childrenOf.get(parent.id) ?? []) : rootsOf(ctx)).filter(
    (s) => s.id !== node.id,
  );

  const yTop = node.box.y / ctx.canvasH;
  const yBottom = (node.box.y + node.box.h) / ctx.canvasH;
  const widthRatio = node.box.w / ctx.canvasW;
  const heightRatio = node.box.h / ctx.canvasH;
  const kidTypes = kids.map((k) => k.role);
  const because: string[] = [];

  /* — text — */
  if (node.role === "heading" || node.role === "paragraph") {
    const lines = node.evidence.lines;
    const perLine = node.box.h / Math.max(1, lines);
    const relative = perLine / Math.max(1, ctx.medianTextHeight);

    // A drawn rule, before anything else in this branch.
    //
    // This has to be narrow, and the reason is documented in the detector: in a
    // wireframe a drawn line *is* the convention for a line of text, so an
    // aspect-ratio test alone would reclassify every hand-drawn text stroke as
    // a divider. What separates them is scale relative to the page's own text.
    // A rule is far thinner than the text around it; a text stroke *is* the
    // text, so its height sits at the median rather than well below it.
    // Under half the height of typical text on this page. Measured rather than
    // chosen: the page's median text height is 21px and its footer rule is 9px,
    // while a hand-drawn text stroke sits *at* the median by definition.
    const thinnerThanText = perLine <= ctx.medianTextHeight * 0.5;
    const aspect = node.box.w / Math.max(1, node.box.h);
    if (lines === 1 && thinnerThanText && aspect >= 20 && node.box.h / ctx.canvasH <= 0.015) {
      because.push(`${aspect.toFixed(0)}:1 and ${(perLine / ctx.medianTextHeight).toFixed(2)}× the page's median text height`);
      return { type: "Divider", rule: "text.divider", confidence: 0.64, because };
    }

    if (lines >= 2) {
      because.push(`${lines} merged lines`);
      return { type: "Paragraph", rule: "text.multiline", confidence: 0.82, because };
    }

    // A short single line is a label, not a heading. "Short" is relative to the
    // page: a 200px run is a label on a 1440px canvas and a headline on a 320px
    // one, and an absolute pixel rule would call both the same thing.
    if (widthRatio < 0.14 && relative < 1.3) {
      because.push(`single line, ${(widthRatio * 100).toFixed(0)}% of canvas width`);
      return { type: "Label", rule: "text.short", confidence: 0.7, because };
    }

    if (relative >= 1.8) {
      because.push(`line height ${relative.toFixed(1)}× the page median`);
      return { type: "Heading", rule: "text.display", confidence: 0.86, because };
    }
    if (relative >= 1.15) {
      because.push(`line height ${relative.toFixed(1)}× the page median`);
      return { type: "Subheading", rule: "text.subheading", confidence: 0.72, because };
    }
    because.push("single line at body size");
    return { type: "Paragraph", rule: "text.body", confidence: 0.6, because };
  }

  /* — media — */
  if (node.role === "image") {
    // An icon is a small square; a logo is a small image at the very top left.
    const squarish = Math.abs(node.box.w - node.box.h) < Math.max(node.box.w, node.box.h) * 0.25;
    if (squarish && widthRatio < 0.05) {
      if (yTop < 0.08 && node.box.x / ctx.canvasW < 0.25) {
        because.push("small square at the top left");
        return { type: "Logo", rule: "media.logo", confidence: 0.62, because };
      }
      because.push("small square");
      return { type: "Icon", rule: "media.icon", confidence: 0.66, because };
    }
    because.push("interior ink or fill with no children");
    return { type: "Image", rule: "media.image", confidence: 0.84, because };
  }

  /* — controls — */
  if (node.role === "button") {
    const inHero = parent?.role === "hero";
    // The call to action is the button in the hero, or the widest button when
    // there is no hero. It is a distinct type because a generator should style
    // it differently, and that is a layout-preserving decision.
    if (inHero) {
      because.push("enclosed control inside the hero");
      return { type: "CTAButton", rule: "control.cta", confidence: 0.78, because };
    }
    // A wide, short, empty enclosure is a field rather than a button.
    const flat = node.box.h / Math.max(1, node.box.w) < 0.18;
    if (flat && kids.length === 0 && node.evidence.interiorInk < 0.02) {
      because.push("wide, flat and empty");
      return { type: "Input", rule: "control.input", confidence: 0.68, because };
    }
    because.push("small enclosed shape");
    return { type: "Button", rule: "control.button", confidence: 0.76, because };
  }

  /* — containers — */
  if (node.role === "navbar") {
    because.push(`top ${(yTop * 100).toFixed(0)}%, ${(widthRatio * 100).toFixed(0)}% wide`);
    return { type: "Navigation", rule: "structure.navigation", confidence: 0.88, because };
  }

  if (node.role === "footer") {
    because.push(`bottom ${(yBottom * 100).toFixed(0)}%`);
    return { type: "Footer", rule: "structure.footer", confidence: 0.86, because };
  }

  if (node.role === "hero") {
    because.push("large upper section with content");
    return { type: "Hero", rule: "structure.hero", confidence: 0.8, because };
  }

  if (node.role === "grid" || node.role === "card") {
    const peers = repeatedRow(node, siblings);
    const hasImage = kidTypes.includes("image");
    const hasText = kidTypes.some((t) => t === "heading" || t === "paragraph");

    // A row of repeated cells is a Gallery when it is pictures only, a List
    // when it is text only, and a Card when it is both. The distinction is
    // useful downstream: a gallery wants different treatment from a feature
    // list, and both differ from a card deck.
    if (peers.length >= 2) {
      because.push(`one of ${peers.length + 1} repeated siblings`);
      if (hasImage && hasText) {
        because.push("contains an image and text");
        return { type: "Card", rule: "group.card", confidence: 0.82, because };
      }
      if (hasImage && !hasText) {
        because.push("image only");
        return { type: "Image", rule: "group.gallery-item", confidence: 0.7, because };
      }
      if (!hasImage && hasText) {
        because.push("text only");
        return { type: "Card", rule: "group.list-item", confidence: 0.66, because };
      }
    }

    // A container holding a control and a field is a form.
    if (kidTypes.includes("button") && kids.length >= 2) {
      because.push("contains a control and other content");
      return { type: "Form", rule: "group.form", confidence: 0.58, because };
    }

    if (kids.length >= 2) {
      because.push(`section with ${kids.length} children`);
      return { type: "Section", rule: "structure.section", confidence: 0.64, because };
    }

    because.push(`container, ${(heightRatio * 100).toFixed(0)}% of page height`);
    return { type: "Section", rule: "structure.container", confidence: 0.5, because };
  }

  because.push(`detection role "${node.role}" has no semantic rule`);
  return { type: "Unknown", rule: "fallback", confidence: 0.2, because };
}

const rootsOf = (ctx: Ctx) => ctx.ir.nodes.filter((n) => n.parent === null);

/* ── grouping ──────────────────────────────────────────────────────── */

/**
 * Wrap a repeated row of siblings in the container it implies.
 *
 * Nobody draws the box around a row of cards — the row is the drawing — so the
 * Grid or Gallery has to be inferred. It carries `source: null` and
 * `inferred: true`, so a reader can always tell which nodes correspond to ink.
 */
function groupRuns(children: SemanticNode[], ctx: Ctx, nextId: () => string): SemanticNode[] {
  const runs: SemanticNode[][] = [];

  for (const node of children) {
    const current = runs[runs.length - 1];
    const last = current?.[current.length - 1];
    const continues =
      last !== undefined &&
      last.type === node.type &&
      // Text items join a run too, which is what produces a List. Restricting
      // this to Card/Image/Icon meant a row of navigation links or a row of
      // captions stayed as loose siblings with no grouping to express that
      // they belong together.
      ["Card", "Image", "Icon", "Label", "Paragraph"].includes(node.type) &&
      Math.abs(last.box.w - node.box.w) < last.box.w * 0.3 &&
      Math.min(last.box.y + last.box.h, node.box.y + node.box.h) -
        Math.max(last.box.y, node.box.y) >
        Math.min(last.box.h, node.box.h) * 0.6 &&
      node.box.x > last.box.x;

    if (continues) current.push(node);
    else runs.push([node]);
  }

  return runs.map((run) => {
    if (run.length < 2) return run[0];

    const x = Math.min(...run.map((n) => n.box.x));
    const y = Math.min(...run.map((n) => n.box.y));
    const w = Math.max(...run.map((n) => n.box.x + n.box.w)) - x;
    const h = Math.max(...run.map((n) => n.box.y + n.box.h)) - y;
    const gaps: number[] = [];
    for (let i = 1; i < run.length; i++) {
      gaps.push(run[i].box.x - (run[i - 1].box.x + run[i - 1].box.w));
    }

    // Pictures only → Gallery. Text only → List. A mix, or repeated cards →
    // Grid. The three are laid out identically and mean different things, and
    // a generator should be able to tell a nav's links from a card deck.
    const allImages = run.every((n) => n.type === "Image" || n.type === "Icon");
    const allText = run.every((n) => n.type === "Label" || n.type === "Paragraph");
    const type: SemanticType = allImages ? "Gallery" : allText ? "List" : "Grid";

    return {
      id: nextId(),
      type,
      source: null,
      inferred: true,
      box: { x, y, w, h },
      layout: {
        direction: "row",
        columns: Math.min(12, run.length),
        span: spanOf(w, ctx.canvasW, ctx.ir.canvas.grid.columns),
        gap: Math.max(0, Math.round(median(gaps.filter((g) => g > 0)))),
        widthRatio: w / ctx.canvasW,
        align: "stretch",
        order: run[0].layout.order,
      },
      evidence: {
        rule: allImages ? "group.gallery" : allText ? "group.list" : "group.grid",
        confidence: 0.74,
        because: [`${run.length} repeated ${run[0].type} siblings in a row`],
      },
      text: null,
      children: run,
    };
  });
}

/**
 * Fold a control's text child into the control itself.
 *
 * Detection reports the label inside a button as its own region — correctly, it
 * is separate ink — and the semantic layer then typed it as another control,
 * producing a Button inside a Button. A control's text is its label, not a
 * child component.
 *
 * This is a semantic decision, not a detection one, which is why it lives here:
 * the region still exists in the detection IR, geometry is untouched, and the
 * frozen engine is not reinterpreted. Only the meaning changes.
 */
const CONTROLS: readonly SemanticType[] = ["Button", "CTAButton", "Input", "Link"];
const LABEL_LIKE: readonly SemanticType[] = [
  "Label", "Heading", "Subheading", "Paragraph", "Button", "CTAButton", "Input",
];

function foldControlLabels(node: SemanticNode): SemanticNode {
  const children = node.children.map(foldControlLabels);

  if (CONTROLS.includes(node.type) && children.length > 0) {
    const labels = children.filter(
      (c) => c.children.length === 0 && LABEL_LIKE.includes(c.type),
    );
    // Only when the children are *all* label-like. A control containing a real
    // component is something else, and should keep its structure.
    if (labels.length === children.length) {
      return {
        ...node,
        text: node.text ?? (labels.map((l) => l.text).filter(Boolean).join(" ") || null),
        evidence: {
          ...node.evidence,
          because: [...node.evidence.because, `absorbed ${labels.length} label region(s)`],
        },
        children: [],
      };
    }
  }

  return { ...node, children };
}

/* ── entry point ───────────────────────────────────────────────────── */

export function classifySemantics(ir: IR): SemanticIR {
  const started = Date.now();

  const byId = new Map(ir.nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, IRNode[]>();
  for (const node of ir.nodes) {
    if (!node.parent) continue;
    childrenOf.set(node.parent, [...(childrenOf.get(node.parent) ?? []), node]);
  }

  const textHeights = ir.nodes
    .filter((n) => n.role === "heading" || n.role === "paragraph")
    .map((n) => n.box.h / Math.max(1, n.evidence.lines));

  const ctx: Ctx = {
    ir,
    byId,
    childrenOf,
    medianTextHeight: median(textHeights) || 20,
    canvasW: ir.canvas.w,
    canvasH: ir.canvas.h,
  };

  let counter = 0;
  const nextId = () => `s${counter++}`;
  const summary: Record<string, number> = {};

  const build = (node: IRNode): SemanticNode => {
    const kids = (childrenOf.get(node.id) ?? []).sort((a, b) => a.order - b.order);
    const decision = classifyNode(node, ctx);
    summary[decision.type] = (summary[decision.type] ?? 0) + 1;

    return {
      id: nextId(),
      type: decision.type,
      source: node.id,
      inferred: false,
      box: { ...node.box },
      layout: deriveLayout(node, kids, ctx, node.order),
      evidence: {
        rule: decision.rule,
        confidence: decision.confidence,
        because: decision.because,
      },
      text: node.content?.text ?? null,
      children: groupRuns(kids.map(build), ctx, nextId),
    };
  };

  const roots = ir.nodes.filter((n) => n.parent === null).sort((a, b) => a.order - b.order);
  const children = groupRuns(roots.map(build), ctx, nextId);

  const folded = children.map(foldControlLabels);

  const root: SemanticNode = {
    id: nextId(),
    type: "Page",
    source: null,
    inferred: true,
    box: { x: 0, y: 0, w: ir.canvas.w, h: ir.canvas.h },
    layout: deriveLayout(null, roots, ctx, -1),
    evidence: { rule: "structure.page", confidence: 1, because: ["document root"] },
    text: null,
    children: folded,
  };
  summary.Page = 1;

  // Recounted after folding, so the summary reflects the tree that is returned
  // rather than the one that was built.
  const counts: Record<string, number> = {};
  const tally = (n: SemanticNode) => {
    counts[n.type] = (counts[n.type] ?? 0) + 1;
    n.children.forEach(tally);
  };
  tally(root);

  return {
    version: "semantic-1.0",
    derivedFrom: ir.id,
    canvas: {
      w: ir.canvas.w,
      h: ir.canvas.h,
      columns: ir.canvas.grid.columns,
      baseUnit: ir.canvas.grid.baseUnit,
    },
    root,
    summary: counts,
    // Reported rather than silently absent: a reader of this IR should be able
    // to tell "no pricing cards on this page" from "cannot tell without text".
    undecidable: ir.nodes.some((n) => n.content?.text)
      ? []
      : [...TEXT_DEPENDENT],
    engine: "rules-1.0",
    ms: Date.now() - started,
  };
}

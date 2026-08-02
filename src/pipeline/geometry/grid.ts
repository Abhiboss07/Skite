/**
 * Pass 3 — grid inference and structure.
 *
 * This is where layout fidelity is actually won. A hand-drawn wireframe looks
 * freehand, but the author aligned things by eye, so the edges cluster. Recover
 * those clusters and you recover the grid they were drawing on.
 *
 * Everything here is deterministic. After this pass the geometry is FROZEN —
 * no later pass may modify a box.
 */

import type { DetectedRegion } from "./detect.ts";
import type { Box, GridSpec, IRNode } from "../ir/schema.ts";

/** Design-space width. All geometry is normalised to this so fidelity is comparable. */
const CANVAS_W = 1440;

export type Structured = {
  canvasW: number;
  canvasH: number;
  grid: GridSpec;
  /** Nodes with geometry, order and nesting resolved; roles not yet assigned. */
  nodes: Omit<IRNode, "role" | "roleConfidence" | "content">[];
  ms: number;
  confidence: number;
};

/**
 * Search for the base spacing unit.
 *
 * Raw measured gaps are noise: 23, 25, 24, 26 all mean "one gap". Finding the
 * unit that best explains every gap and snapping to multiples of it is a large
 * part of why output reads as deliberate rather than machine-made — unquantised,
 * a hand drawing yields ~40 distinct spacing values.
 */
function inferBaseUnit(gaps: number[]): { unit: number; error: number } {
  if (gaps.length === 0) return { unit: 8, error: 1 };

  let best = { unit: 8, error: Number.POSITIVE_INFINITY };
  for (let u = 2; u <= 24; u++) {
    let error = 0;
    for (const g of gaps) {
      const r = g % u;
      error += Math.min(r, u - r) / u;
    }
    error /= gaps.length;
    // Mild preference for larger units: 4 explains everything 2 does, but 2 is
    // a less meaningful design decision.
    const adjusted = error - u * 0.004;
    if (adjusted < best.error) best = { unit: u, error: adjusted };
  }
  return { unit: best.unit, error: Math.max(0, best.error) };
}

/**
 * Fit a column grid by searching candidate (columns, gutter) pairs and scoring
 * how well the drawn edges land on boundaries.
 *
 * Alternative considered: cluster the edges and read the grid off the cluster
 * spacing. It is more elegant but brittle when a layout only uses two of twelve
 * columns — there is not enough evidence to recover the unit. Scoring candidate
 * grids degrades gracefully instead, and the search is tiny.
 */
function fitGrid(
  edges: number[],
  contentLeft: number,
  contentRight: number,
): { columns: number; gutter: number; margin: number; confidence: number } {
  const contentW = contentRight - contentLeft;
  if (contentW <= 0 || edges.length < 2) {
    return { columns: 12, gutter: 24, margin: 64, confidence: 0 };
  }

  const gutterCandidates = [0, 8, 12, 16, 20, 24, 32, 40];
  let best = { columns: 1, gutter: 0, score: Number.POSITIVE_INFINITY };

  for (const columns of [1, 2, 3, 4, 6, 8, 12]) {
    for (const gutter of gutterCandidates) {
      const colW = (contentW - gutter * (columns - 1)) / columns;
      if (colW <= 8) continue;

      // Every legal boundary in this candidate grid.
      const boundaries: number[] = [];
      for (let c = 0; c <= columns; c++) {
        const start = contentLeft + c * (colW + gutter);
        boundaries.push(start);
        if (c < columns) boundaries.push(start + colW);
      }

      let total = 0;
      for (const e of edges) {
        let nearest = Number.POSITIVE_INFINITY;
        for (const b of boundaries) nearest = Math.min(nearest, Math.abs(e - b));
        total += nearest;
      }
      const mean = total / edges.length / contentW;

      // Penalise complexity: a 12-column grid can explain anything, which makes
      // it a poor explanation. Prefer the simplest grid that fits.
      const score = mean + columns * 0.0022;
      if (score < best.score) best = { columns, gutter, score };
    }
  }

  // Mean normalised error of ~1% of content width is a good fit; ~6% is noise.
  const confidence = Math.max(0, Math.min(1, 1 - best.score / 0.06));

  return {
    columns: best.columns,
    gutter: best.gutter,
    margin: Math.round(contentLeft),
    confidence,
  };
}

/** Smallest region that strictly contains `box`, or null. */
function findParent(box: Box, candidates: { id: string; box: Box }[]): string | null {
  let bestId: string | null = null;
  let bestArea = Number.POSITIVE_INFINITY;
  const pad = 6;

  for (const c of candidates) {
    const contains =
      c.box.x - pad <= box.x &&
      c.box.y - pad <= box.y &&
      c.box.x + c.box.w + pad >= box.x + box.w &&
      c.box.y + c.box.h + pad >= box.y + box.h;
    if (!contains) continue;

    const area = c.box.w * c.box.h;
    const own = box.w * box.h;
    if (area <= own * 1.02) continue; // effectively the same box

    if (area < bestArea) {
      bestArea = area;
      bestId = c.id;
    }
  }
  return bestId;
}

export function buildStructure(
  regions: DetectedRegion[],
  imageWidth: number,
  imageHeight: number,
): Structured {
  const started = Date.now();

  const scale = CANVAS_W / imageWidth;
  const canvasH = Math.round(imageHeight * scale);

  // Normalise into design space.
  const scaled = regions.map((r) => ({
    id: r.id,
    box: {
      x: Math.round(r.x * scale),
      y: Math.round(r.y * scale),
      w: Math.round(r.w * scale),
      h: Math.round(r.h * scale),
    },
    primitive: r.primitive,
    strokePixels: r.strokePixels,
    fillRatio: r.fillRatio,
    interiorInk: r.interiorInk,
    interiorFill: r.interiorFill,
    lines: r.lines,
  }));

  if (scaled.length === 0) {
    return {
      canvasW: CANVAS_W,
      canvasH,
      grid: { columns: 12, gutter: 24, margin: 64, baseUnit: 8, confidence: 0 },
      nodes: [],
      ms: Date.now() - started,
      confidence: 0,
    };
  }

  // ── grid fit ─────────────────────────────────────────────────────
  // Rules and text fragments are positioned inside containers rather than on the
  // page grid, so containers are the honest evidence for column boundaries.
  const gridEvidence = scaled.filter((s) => s.primitive === "container");
  const evidence = gridEvidence.length >= 2 ? gridEvidence : scaled;
  const edges = evidence.flatMap((s) => [s.box.x, s.box.x + s.box.w]);
  const contentLeft = Math.min(...evidence.map((s) => s.box.x));
  const contentRight = Math.max(...evidence.map((s) => s.box.x + s.box.w));

  const fitted = fitGrid(edges, contentLeft, contentRight);

  // ── base unit ────────────────────────────────────────────────────
  const sortedByY = [...scaled].sort((a, b) => a.box.y - b.box.y);
  const gaps: number[] = [];
  for (let i = 1; i < sortedByY.length; i++) {
    const gap = sortedByY[i].box.y - (sortedByY[i - 1].box.y + sortedByY[i - 1].box.h);
    if (gap > 2 && gap < 240) gaps.push(gap);
  }
  const { unit: baseUnit } = inferBaseUnit(gaps);

  const grid: GridSpec = {
    columns: fitted.columns,
    gutter: fitted.gutter,
    margin: fitted.margin,
    baseUnit,
    confidence: fitted.confidence,
  };

  // ── snap to the grid ─────────────────────────────────────────────
  const colW = (contentRight - contentLeft - grid.gutter * (grid.columns - 1)) / grid.columns;
  const tolerance = Math.max(10, CANVAS_W * 0.018);

  const withGrid = scaled.map((s) => {
    const rel = s.box.x - contentLeft;
    const relEnd = s.box.x + s.box.w - contentLeft;
    const startF = rel / (colW + grid.gutter);
    const endF = relEnd / (colW + grid.gutter);
    const colStart = Math.round(startF);
    const colEnd = Math.round(endF);

    const snappedX = contentLeft + colStart * (colW + grid.gutter);
    const snappedRight = contentLeft + colEnd * (colW + grid.gutter) - grid.gutter;

    const snapped =
      Math.abs(snappedX - s.box.x) <= tolerance &&
      Math.abs(snappedRight - (s.box.x + s.box.w)) <= tolerance &&
      colEnd > colStart;

    return {
      ...s,
      grid: snapped
        ? { colStart: Math.max(0, colStart) + 1, colEnd: Math.min(grid.columns, colEnd) + 1 }
        : null,
      snapped,
    };
  });

  // ── containment tree ─────────────────────────────────────────────
  // Largest first so a parent is always considered before its children.
  const byArea = [...withGrid].sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h);
  const parentOf = new Map<string, string | null>();
  const placed: { id: string; box: Box }[] = [];

  for (const region of byArea) {
    parentOf.set(region.id, findParent(region.box, placed));
    placed.push({ id: region.id, box: region.box });
  }

  const childrenOf = new Map<string, string[]>();
  for (const region of withGrid) {
    const parent = parentOf.get(region.id) ?? null;
    if (parent) {
      childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), region.id]);
    }
  }

  // ── reading order ────────────────────────────────────────────────
  // Depth-first, siblings top-to-bottom then left-to-right. This is the
  // linearisation a screen reader will follow, and it is scored separately from
  // geometry in the fidelity metric.
  const byId = new Map(withGrid.map((r) => [r.id, r]));
  const orderOf = new Map<string, number>();
  let counter = 0;

  /**
   * Group siblings into visual rows, then read each row left to right.
   *
   * The obvious implementation — sort with a comparator that returns `x` order
   * for nodes on the "same row" and `y` order otherwise — is wrong, and quietly
   * so. That predicate is not transitive, so it is not a valid total order and
   * `Array.sort` returns an arbitrary permutation. Concretely: a tall hero and
   * the navbar above it register as the same row because the comparison used the
   * *taller* box to size the band, and the page came out with its hero first.
   *
   * Banding avoids the trap entirely. A row stays open while the next node
   * starts before the earliest-ending member of that row finishes; using the
   * earliest end is the conservative choice that stops one tall element from
   * swallowing every row beside it.
   */
  const walk = (ids: string[]) => {
    const items = ids
      .map((id) => byId.get(id)!)
      .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);

    const rows: (typeof items)[] = [];
    let rowEnd = -Infinity;

    for (const item of items) {
      if (rows.length === 0 || item.box.y >= rowEnd) {
        rows.push([item]);
        rowEnd = item.box.y + item.box.h;
      } else {
        rows[rows.length - 1].push(item);
        rowEnd = Math.min(rowEnd, item.box.y + item.box.h);
      }
    }

    for (const row of rows) {
      for (const item of [...row].sort((a, b) => a.box.x - b.box.x)) {
        orderOf.set(item.id, counter++);
        walk(childrenOf.get(item.id) ?? []);
      }
    }
  };

  walk(withGrid.filter((r) => !parentOf.get(r.id)).map((r) => r.id));

  const nodes = withGrid.map((r) => ({
    id: r.id,
    parent: parentOf.get(r.id) ?? null,
    children: childrenOf.get(r.id) ?? [],
    box: r.box,
    grid: r.grid,
    order: orderOf.get(r.id) ?? 0,
    primitive: r.primitive,
    evidence: {
      fillRatio: Number(r.fillRatio.toFixed(4)),
      interiorInk: Number(r.interiorInk.toFixed(4)),
      interiorFill: Number(r.interiorFill.toFixed(4)),
      strokePixels: r.strokePixels,
      lines: r.lines,
      snapped: r.snapped,
    },
  }));

  const snappedRatio = nodes.filter((n) => n.evidence.snapped).length / Math.max(1, nodes.length);

  // Layout confidence blends how well a grid fit with how much of the drawing
  // actually honours it. A confident grid that only 20% of nodes land on is not
  // a grid — see docs/architecture/03 §3, "when to refuse".
  const confidence = Math.max(0, Math.min(1, grid.confidence * 0.6 + snappedRatio * 0.4));

  return {
    canvasW: CANVAS_W,
    canvasH,
    grid,
    nodes,
    ms: Date.now() - started,
    confidence,
  };
}

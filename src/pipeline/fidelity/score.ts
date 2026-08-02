/**
 * Fidelity scoring.
 *
 * Turns "we preserve your layout" into a number. Compares a produced layout
 * against a reference — either hand-reconstructed ground truth (evaluation) or
 * the rendered page's real element boxes (verification).
 *
 * Both sides are normalised to fractions of their own canvas before comparison,
 * so a rotated or differently-sized input does not register as a layout error
 * when it is really a framing difference.
 */

import type { Box, Role } from "../ir/schema.ts";

export type ScorableNode = {
  id: string;
  role: Role | string;
  box: Box;
  order: number;
};

export type FidelityReport = {
  /** Mean IoU over matched nodes. */
  geometry: number;
  /** Reading-order agreement, normalised Kendall tau. */
  order: number;
  /** Share of reference nodes that were matched at all. */
  coverage: number;
  /** Share of matched nodes given the correct role. */
  componentAccuracy: number;
  /** The published headline number. */
  fidelity: number;
  matched: number;
  referenceCount: number;
  producedCount: number;
  perNode: {
    referenceId: string;
    producedId: string | null;
    iou: number;
    expectedRole: string;
    actualRole: string | null;
  }[];
};

function normalise(nodes: ScorableNode[], w: number, h: number): ScorableNode[] {
  return nodes.map((n) => ({
    ...n,
    box: { x: n.box.x / w, y: n.box.y / h, w: n.box.w / w, h: n.box.h / h },
  }));
}

function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

/** Normalised Kendall tau over the pairs present in both sequences. */
function kendall(reference: string[], produced: string[]): number {
  const rank = new Map(produced.map((id, i) => [id, i]));
  const common = reference.filter((id) => rank.has(id));
  if (common.length < 2) return 1;

  let concordant = 0;
  let discordant = 0;
  for (let i = 0; i < common.length; i++) {
    for (let j = i + 1; j < common.length; j++) {
      const a = rank.get(common[i])!;
      const b = rank.get(common[j])!;
      if (a < b) concordant++;
      else discordant++;
    }
  }
  const total = concordant + discordant;
  return total === 0 ? 1 : concordant / total;
}

export function scoreFidelity(
  reference: { nodes: ScorableNode[]; canvas: { w: number; h: number } },
  produced: { nodes: ScorableNode[]; canvas: { w: number; h: number } },
  /** Below this IoU a pair is not considered the same region. */
  matchThreshold = 0.3,
): FidelityReport {
  const ref = normalise(reference.nodes, reference.canvas.w, reference.canvas.h);
  const prod = normalise(produced.nodes, produced.canvas.w, produced.canvas.h);

  // Greedy matching over all pairs, best IoU first. Optimal assignment would be
  // Hungarian; greedy is within a rounding error at these sizes and far simpler
  // to reason about when a score looks wrong.
  const pairs: { r: number; p: number; iou: number }[] = [];
  ref.forEach((r, ri) => {
    prod.forEach((p, pi) => {
      const score = iou(r.box, p.box);
      if (score > matchThreshold) pairs.push({ r: ri, p: pi, iou: score });
    });
  });
  pairs.sort((a, b) => b.iou - a.iou);

  const usedRef = new Set<number>();
  const usedProd = new Set<number>();
  const matches: { r: number; p: number; iou: number }[] = [];
  for (const pair of pairs) {
    if (usedRef.has(pair.r) || usedProd.has(pair.p)) continue;
    usedRef.add(pair.r);
    usedProd.add(pair.p);
    matches.push(pair);
  }

  const geometry = matches.length
    ? matches.reduce((sum, m) => sum + m.iou, 0) / matches.length
    : 0;

  const coverage = ref.length ? matches.length / ref.length : 0;

  const correctRole = matches.filter(
    (m) => normaliseRole(ref[m.r].role) === normaliseRole(prod[m.p].role),
  ).length;
  const componentAccuracy = matches.length ? correctRole / matches.length : 0;

  // Order is compared over matched nodes only — a node that was never found
  // cannot be mis-ordered, and would otherwise be penalised twice.
  const refOrder = [...matches]
    .sort((a, b) => ref[a.r].order - ref[b.r].order)
    .map((m) => ref[m.r].id);
  const prodOrder = [...matches]
    .sort((a, b) => prod[a.p].order - prod[b.p].order)
    .map((m) => ref[m.r].id);
  const order = kendall(refOrder, prodOrder);

  const fidelity = 0.6 * geometry + 0.25 * order + 0.15 * coverage;

  return {
    geometry,
    order,
    coverage,
    componentAccuracy,
    fidelity,
    matched: matches.length,
    referenceCount: ref.length,
    producedCount: prod.length,
    perNode: ref.map((r, ri) => {
      const m = matches.find((x) => x.r === ri);
      return {
        referenceId: r.id,
        producedId: m ? prod[m.p].id : null,
        iou: m ? m.iou : 0,
        expectedRole: String(r.role),
        actualRole: m ? String(prod[m.p].role) : null,
      };
    }),
  };
}

/**
 * `grid` and `card` describe the same drawn rectangle at different levels of
 * interpretation, and ground truth annotates the container while detection may
 * report either. Treating them as interchangeable avoids penalising a
 * disagreement that has no effect on the rendered output.
 */
function normaliseRole(role: string): string {
  if (role === "grid") return "container-group";
  if (role === "card") return "container-group";
  return role;
}

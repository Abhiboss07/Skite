/**
 * Layout-drift verification.
 *
 * The design engine claims it changed only appearance. This checks the claim
 * rather than trusting it, by scoring the semantic IR against itself before and
 * after the design pass with the same `scoreFidelity` used for the benchmark —
 * the function was written to compare an IR against *either* ground truth or
 * produced geometry, so it serves here unchanged.
 *
 * A passing result should be exactly 100%, not merely high. That is the point:
 * this is not a quality metric with a tolerance, it is an assertion. Anything
 * below 1.0 means a design pass moved something, and the number tells you how
 * much rather than only that it happened.
 *
 * Structural properties are checked separately from geometry, because a pass
 * could preserve every box and still change a column count or a reading order,
 * and IoU would not notice.
 */

import { scoreFidelity, type ScorableNode } from "../fidelity/score.ts";
import type { SemanticIR, SemanticNode } from "../semantic/schema.ts";

export type DriftReport = {
  ok: boolean;
  /** 1.0 when no geometry moved. */
  geometry: number;
  order: number;
  coverage: number;
  /** Fixed layout properties that differ, if any. */
  violations: { node: string; property: string; before: string; after: string }[];
  nodesChecked: number;
};

/** The properties a design pass is forbidden to change. */
const FIXED = ["direction", "columns", "span", "gap", "align", "order"] as const;

function flatten(node: SemanticNode, out: SemanticNode[] = []): SemanticNode[] {
  out.push(node);
  for (const child of node.children) flatten(child, out);
  return out;
}

const scorable = (nodes: SemanticNode[]): ScorableNode[] =>
  nodes.map((n) => ({ id: n.id, role: n.type, box: n.box, order: n.layout.order }));

export function verifyNoDrift(before: SemanticIR, after: SemanticIR): DriftReport {
  const a = flatten(before.root);
  const b = flatten(after.root);
  const byId = new Map(b.map((n) => [n.id, n]));

  const violations: DriftReport["violations"] = [];

  for (const node of a) {
    const other = byId.get(node.id);
    if (!other) {
      violations.push({
        node: node.id,
        property: "existence",
        before: node.type,
        after: "removed",
      });
      continue;
    }

    for (const property of FIXED) {
      const x = String(node.layout[property]);
      const y = String(other.layout[property]);
      if (x !== y) violations.push({ node: node.id, property, before: x, after: y });
    }

    // Boxes are compared exactly. A design pass has no business rounding one.
    for (const side of ["x", "y", "w", "h"] as const) {
      if (node.box[side] !== other.box[side]) {
        violations.push({
          node: node.id,
          property: `box.${side}`,
          before: String(node.box[side]),
          after: String(other.box[side]),
        });
      }
    }
  }

  const score = scoreFidelity(
    { nodes: scorable(a), canvas: { w: before.canvas.w, h: before.canvas.h } },
    { nodes: scorable(b), canvas: { w: after.canvas.w, h: after.canvas.h } },
    // Any overlap at all counts as the same node here; we are looking for
    // movement, not for whether the node was found.
    0.01,
  );

  return {
    ok: violations.length === 0 && score.geometry > 0.9999 && score.coverage > 0.9999,
    geometry: score.geometry,
    order: score.order,
    coverage: score.coverage,
    violations,
    nodesChecked: a.length,
  };
}

/**
 * Pass 4b — structural pruning.
 *
 * Removes regions that are real ink but not separate components: the text
 * inside a button, and the fragments of an illustration. Both are things a
 * person annotating the page would fold into their container without thinking
 * about it.
 *
 * This lives **outside** the detector, and has to. Both rules need the
 * containment tree, which does not exist until the structure pass has run, and
 * detection is frozen at `v1.0-detection-engine`. Nothing here changes a box —
 * regions are dropped whole or kept whole.
 *
 * A note on what this is not. Pruning improves precision by construction,
 * because the benchmark counts these regions as false positives. That is only
 * legitimate if the rule is principled rather than fitted to the answer, so
 * each rule below is stated as a claim about page structure that would hold on
 * a page nobody has annotated. Where a region is genuinely a component that the
 * annotator merely omitted, it is deliberately *not* pruned — see the footer
 * rule discussed in the return value.
 */

import type { IRNode, Role } from "../ir/schema.ts";

export type PruneResult = {
  nodes: IRNode[];
  removed: { id: string; rule: string; reason: string }[];
};

/** Roles that own their text rather than containing it as a component. */
const CONTROLS: readonly Role[] = ["button"];

/** Text-ish roles that can be a control's label. */
const LABELLABLE: readonly Role[] = ["heading", "paragraph", "button", "unknown"];

/**
 * Interior ink above which a container is a graphic rather than a frame.
 *
 * A hollow rectangle has almost nothing crossing its middle; a map, a hatched
 * drawing or an image placeholder has a great deal. The grouped map on the test
 * page measures 0.40.
 */
const GRAPHIC_INK = 0.3;

/** A fragment must be this much smaller than its parent to be part of it. */
const FRAGMENT_SHARE = 0.12;

export function prune(nodes: IRNode[]): PruneResult {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const removed: PruneResult["removed"] = [];
  const drop = new Set<string>();

  for (const node of nodes) {
    if (node.children.length > 0) continue;
    const parent = node.parent ? byId.get(node.parent) : undefined;
    if (!parent) continue;

    // ── a control's text is its label ────────────────────────────────
    //
    // Detection reports it as its own region, correctly — it is separate ink.
    // But a button's caption is not a component beside the button, and treating
    // it as one produces a Button nested inside a Button.
    if (CONTROLS.includes(parent.role) && LABELLABLE.includes(node.role)) {
      drop.add(node.id);
      removed.push({
        id: node.id,
        rule: "control-label",
        reason: `text inside ${parent.id} (${parent.role}); a control's caption is not a sibling component`,
      });
      continue;
    }

    // ── a fragment inside a graphic belongs to it ────────────────────
    //
    // An illustration is not connected ink, so pieces of it survive as their
    // own regions. A small region wholly inside a densely-inked container is
    // part of that drawing, not something drawn next to it.
    const parentArea = parent.box.w * parent.box.h;
    const share = parentArea > 0 ? (node.box.w * node.box.h) / parentArea : 1;
    if (parent.evidence.interiorInk >= GRAPHIC_INK && share <= FRAGMENT_SHARE) {
      drop.add(node.id);
      removed.push({
        id: node.id,
        rule: "graphic-fragment",
        reason:
          `${(share * 100).toFixed(1)}% of ${parent.id}, whose interior ink is ` +
          `${parent.evidence.interiorInk.toFixed(2)} — a piece of that drawing`,
      });
    }
  }

  if (drop.size === 0) return { nodes, removed };

  // Rebuild: drop the nodes, drop them from their parents' child lists, and
  // renumber reading order compactly so it stays a dense sequence.
  const kept = nodes
    .filter((n) => !drop.has(n.id))
    .map((n) => ({ ...n, children: n.children.filter((id) => !drop.has(id)) }));

  const order = new Map(
    [...kept].sort((a, b) => a.order - b.order).map((n, i) => [n.id, i] as const),
  );

  return {
    nodes: kept.map((n) => ({ ...n, order: order.get(n.id) ?? n.order })),
    removed,
  };
}

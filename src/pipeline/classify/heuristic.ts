/**
 * Pass 4a — heuristic classification (offline path).
 *
 * Assigns roles from geometry alone: position, size, nesting, sibling structure
 * and ink distribution. No model, no network, no API key.
 *
 * Two reasons this exists rather than always calling the vision model:
 *
 *   1. The demo has to work without connectivity. A viva where the wifi drops
 *      should not become a viva with no demo.
 *   2. It is the baseline the model has to beat. "The vision pass improves
 *      component accuracy from X to Y" is a far stronger claim than "we used a
 *      model", and it is only measurable if the baseline exists.
 *
 * The vision classifier in `vision.ts` implements the same interface.
 */

import type { Structured } from "../geometry/grid.ts";
import type { Classification, Role } from "../ir/schema.ts";

type Node = Structured["nodes"][number];

/** Siblings that share a horizontal band and have similar dimensions. */
function isRepeatedRow(node: Node, all: Map<string, Node>): boolean {
  const children = node.children.map((id) => all.get(id)!).filter((c) => c?.primitive === "container");
  if (children.length < 2) return false;

  const first = children[0];
  const sameRow = children.every(
    (c) => Math.abs(c.box.y - first.box.y) < Math.max(first.box.h, c.box.h) * 0.5,
  );
  const similarSize = children.every(
    (c) =>
      Math.abs(c.box.w - first.box.w) < first.box.w * 0.28 &&
      Math.abs(c.box.h - first.box.h) < first.box.h * 0.35,
  );
  return sameRow && similarSize;
}

/**
 * Peers of `node` under the same parent that share its horizontal band and
 * dimensions — a drawn row of cards with no container drawn around it.
 *
 * People rarely draw the box around a card row; the row itself is the signal.
 * Detecting it here is what lets synthesis emit a Grid nobody drew.
 */
function repeatedSiblings(node: Node, nodes: Node[]): Node[] {
  const peers = nodes.filter(
    (c) =>
      c.primitive === "container" &&
      c.parent === node.parent &&
      Math.abs(c.box.y - node.box.y) < Math.max(node.box.h, c.box.h) * 0.4 &&
      Math.abs(c.box.w - node.box.w) < node.box.w * 0.3 &&
      Math.abs(c.box.h - node.box.h) < node.box.h * 0.35,
  );
  return peers.length >= 2 ? peers : [];
}

export function classifyHeuristic(structured: Structured): Classification & { engine: string } {
  const { nodes, canvasW, canvasH } = structured;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Median text height, used to separate a heading from body copy: a heading is
  // drawn noticeably larger than the paragraph beneath it.
  const textHeights = nodes
    .filter((n) => n.primitive === "text")
    .map((n) => n.box.h / Math.max(1, n.evidence.lines))
    .sort((a, b) => a - b);
  const medianTextH = textHeights.length ? textHeights[Math.floor(textHeights.length / 2)] : 20;

  const roles = new Map<string, { role: Role; confidence: number }>();

  // Containers first — text roles depend on what contains them.
  for (const n of nodes) {
    if (n.primitive !== "container") continue;

    const yTop = n.box.y / canvasH;
    const yBottom = (n.box.y + n.box.h) / canvasH;
    const wRatio = n.box.w / canvasW;
    const hRatio = n.box.h / canvasH;
    const containerChildren = n.children
      .map((id) => byId.get(id)!)
      .filter((c) => c?.primitive === "container");
    const textChildren = n.children.map((id) => byId.get(id)!).filter((c) => c?.primitive === "text");

    let role: Role = "card";
    let confidence = 0.5;

    if (
      n.children.length === 0 &&
      (n.evidence.interiorInk > 0.012 || n.evidence.interiorFill > 0.55)
    ) {
      // Ink crossing the middle, or a solidly toned middle, with nothing nested
      // inside: the two ways a wireframe draws an image. Hand drawings use
      // crossed diagonals; vector exports use a filled rectangle.
      // The test is "no children at all", not "no container children" — a card
      // holding two lines of text also has interior ink, and requiring only the
      // weaker condition labelled every card an image.
      role = "image";
      confidence = 0.82;
    } else if (
      containerChildren.length === 0 &&
      wRatio < 0.22 &&
      hRatio < 0.075 &&
      n.parent !== null
    ) {
      // Small enclosed shape with at most a label inside it.
      role = "button";
      confidence = 0.78;
    } else if (yTop < 0.1 && wRatio > 0.5 && hRatio < 0.11) {
      role = "navbar";
      confidence = 0.9;
    } else if (yBottom > 0.86 && wRatio > 0.5) {
      role = "footer";
      confidence = 0.88;
    } else if (isRepeatedRow(n, byId)) {
      role = "grid";
      confidence = 0.85;
    } else if (n.parent && byId.get(n.parent) && isRepeatedRow(byId.get(n.parent)!, byId)) {
      role = "card";
      confidence = 0.8;
    } else if (repeatedSiblings(n, nodes).length > 0) {
      // One of a repeated row. The row's container is inferred downstream.
      role = "card";
      confidence = 0.79;
    } else if (hRatio > 0.12 && yTop < 0.55 && (textChildren.length > 0 || containerChildren.length > 0)) {
      role = "hero";
      confidence = 0.72;
    }

    roles.set(n.id, { role, confidence });
  }

  // Text: heading vs paragraph.
  for (const n of nodes) {
    if (n.primitive !== "text") continue;

    const parentRole = n.parent ? roles.get(n.parent)?.role : undefined;

    // A label inside a button is part of the button, not a separate heading.
    if (parentRole === "button") {
      roles.set(n.id, { role: "button", confidence: 0.6 });
      continue;
    }

    const lines = n.evidence.lines;
    const perLine = n.box.h / Math.max(1, lines);
    const isLarge = perLine > medianTextH * 1.25;

    if (lines >= 2 && !isLarge) {
      roles.set(n.id, { role: "paragraph", confidence: 0.76 });
    } else {
      roles.set(n.id, { role: "heading", confidence: 0.7 });
    }
  }

  return {
    engine: "heuristic",
    regions: nodes.map((n) => {
      const assigned = roles.get(n.id) ?? { role: "unknown" as Role, confidence: 0.2 };
      return {
        id: n.id,
        role: assigned.role,
        confidence: assigned.confidence,
        // The offline path cannot read handwriting — only the vision model can.
        // Reporting empty text with zero confidence is honest; inventing
        // plausible copy here would silently fabricate content.
        text: "",
        textConfidence: 0,
      };
    }),
  };
}

/** Lists produced regions that matched no ground-truth region, with context. */
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { runPipeline } from "../src/pipeline/run.ts";
import { scoreFidelity, type ScorableNode } from "../src/pipeline/fidelity/score.ts";

type Box = { x: number; y: number; w: number; h: number };
type TruthNode = { id: string; role: string; box: Box };

const input = process.argv[2] ?? "Test Images/website-wireframe-services.jpg";
const slug = basename(input).replace(/\.[^.]+$/, "");
const result = await runPipeline(readFileSync(input), { classifier: "heuristic", sourceKind: "wireframe" });
const truth = JSON.parse(readFileSync(join(dirname(input), `${slug}.truth.json`), "utf8")) as {
  canvas: { w: number; h: number };
  nodes: TruthNode[];
};

const reference: ScorableNode[] = truth.nodes.map((n: TruthNode, i: number) => ({ id: n.id, role: n.role, box: n.box, order: i }));
const produced: ScorableNode[] = result.ir.nodes.map((n) => ({ id: n.id, role: n.role, box: n.box, order: n.order }));
const s = scoreFidelity({ nodes: reference, canvas: truth.canvas }, { nodes: produced, canvas: result.ir.canvas });
const matched = new Set(s.perNode.filter((p) => p.producedId).map((p) => p.producedId!));

const fps = result.ir.nodes.filter((n) => !matched.has(n.id));
console.log(`${fps.length} false positives of ${result.ir.nodes.length} detected (${s.referenceCount} annotated)\n`);

// Best IoU against any ground-truth box, to tell "near miss" from "invented".
const iou = (a: Box, b: Box) => {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a.w * a.h + b.w * b.h - inter);
};

for (const n of fps.sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h)) {
  let bestIoU = 0, bestId = "—", contained = "—";
  for (const t of truth.nodes) {
    const v = iou(n.box, t.box);
    if (v > bestIoU) { bestIoU = v; bestId = `${t.id}/${t.role}`; }
    // Fully inside a ground-truth region? Then it is a fragment of it.
    if (t.box.x <= n.box.x && t.box.y <= n.box.y &&
        t.box.x + t.box.w >= n.box.x + n.box.w && t.box.y + t.box.h >= n.box.y + n.box.h) {
      contained = `${t.id}/${t.role}`;
    }
  }
  console.log(
    `  ${n.id.padEnd(5)} ${n.role.padEnd(9)} ${String(Math.round(n.box.w)).padStart(4)}×${String(Math.round(n.box.h)).padStart(4)} ` +
    `at ${String(Math.round(n.box.x)).padStart(4)},${String(Math.round(n.box.y)).padStart(4)}  ` +
    `parent=${(n.parent ?? "—").padEnd(5)} kids=${String(n.children.length).padStart(2)}  ` +
    `bestIoU=${bestIoU.toFixed(2)} (${bestId})  inside=${contained}`,
  );
}

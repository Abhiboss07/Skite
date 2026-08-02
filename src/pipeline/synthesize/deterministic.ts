/**
 * Pass 6a — deterministic synthesis (offline path).
 *
 * Turns the IR into a component tree by rule. No model.
 *
 * This is the layout-preserving path: every layout decision is derived from
 * measured geometry, so the output cannot drift from the sketch. The LLM path
 * (`llm.ts`) uses the same output schema and improves *content* — real copy
 * instead of placeholders — while inheriting the same layout derivation.
 */

import type { ComponentName, ComponentNode, IR, IRNode, Role } from "../ir/schema.ts";

const ROLE_TO_COMPONENT: Record<Role, ComponentName> = {
  navbar: "Navbar",
  hero: "Hero",
  heading: "Heading",
  paragraph: "Paragraph",
  button: "Button",
  image: "Image",
  card: "Card",
  grid: "Grid",
  footer: "Footer",
  unknown: "Stack",
};

/** Placeholder copy. Visibly placeholder — never invented factual content. */
const PLACEHOLDER: Partial<Record<Role, string>> = {
  heading: "Heading goes here",
  paragraph:
    "Body copy from your sketch will appear here. Replace it with your own words.",
  button: "Get started",
};

type Layout = {
  direction: "row" | "column";
  columns: number;
  gap: number;
};

/**
 * Derive how a node's children are arranged from where they actually are.
 *
 * A row is children sharing a horizontal band; anything else stacks. The gap is
 * the median measured gap, quantised to the inferred base unit — quantisation is
 * what stops the output having forty arbitrary spacing values.
 */
function deriveLayout(node: IRNode, children: IRNode[], baseUnit: number): Layout {
  if (children.length === 0) return { direction: "column", columns: 1, gap: baseUnit * 2 };

  const sorted = [...children].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const first = sorted[0];
  const inOneRow =
    sorted.length > 1 &&
    sorted.every((c) => Math.abs(c.box.y - first.box.y) < Math.max(first.box.h, c.box.h) * 0.5);

  if (inOneRow) {
    const byX = [...sorted].sort((a, b) => a.box.x - b.box.x);
    const gaps: number[] = [];
    for (let i = 1; i < byX.length; i++) {
      gaps.push(byX[i].box.x - (byX[i - 1].box.x + byX[i - 1].box.w));
    }
    return {
      direction: "row",
      columns: sorted.length,
      gap: quantise(median(gaps), baseUnit),
    };
  }

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i].box.y - (sorted[i - 1].box.y + sorted[i - 1].box.h));
  }
  void node;
  return { direction: "column", columns: 1, gap: quantise(median(gaps), baseUnit) };
}

/**
 * Partition children into vertical columns by their horizontal extents.
 *
 * This is what recovers a split hero — headline and copy stacked on the left,
 * an image beside them on the right. Without it every hero flattens into one
 * column, which is a layout change, and layout changes are the one thing this
 * pipeline promises not to make.
 *
 * A new column opens when a child starts at or past the right edge of the
 * narrowest member of the current column. Using the narrowest member is what
 * keeps a wide headline from absorbing the image to its right.
 *
 * Returns `null` unless the split is real: at least two columns, and the columns
 * must overlap each other vertically. Side-by-side means side-by-side; two
 * groups that merely occupy different x ranges at different heights are a
 * stack, not a row.
 */
function groupColumns(children: IRNode[]): IRNode[][] | null {
  if (children.length < 3) return null;

  const byX = [...children].sort((a, b) => a.box.x - b.box.x);
  const columns: IRNode[][] = [];
  let edge = -Infinity;

  for (const node of byX) {
    if (columns.length === 0 || node.box.x >= edge) {
      columns.push([node]);
      edge = node.box.x + node.box.w;
    } else {
      columns[columns.length - 1].push(node);
      edge = Math.min(edge, node.box.x + node.box.w);
    }
  }

  if (columns.length < 2) return null;

  const extents = columns.map((col) => ({
    top: Math.min(...col.map((n) => n.box.y)),
    bottom: Math.max(...col.map((n) => n.box.y + n.box.h)),
  }));

  const overlapping = extents.every((a) =>
    extents.every((b) => {
      const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return overlap > Math.min(a.bottom - a.top, b.bottom - b.top) * 0.5;
    }),
  );

  if (!overlapping) return null;

  // Each column keeps reading order internally.
  return columns.map((col) => [...col].sort((a, b) => a.order - b.order));
}

/**
 * Group siblings that form a repeated row into runs.
 *
 * Almost nobody draws the rectangle around a row of cards — the row *is* the
 * drawing. So the grid has to be inferred, and it must be inferred narrowly:
 * a run only forms from siblings that share a role, a horizontal band and a
 * width. Grouping on the band alone folds a hero's heading and its adjacent
 * image into a bogus two-column grid.
 *
 * Returns runs in reading order; singletons come back as one-element runs.
 */
function groupRows(siblings: IRNode[]): IRNode[][] {
  const runs: IRNode[][] = [];

  for (const node of siblings) {
    const current = runs[runs.length - 1];
    const last = current?.[current.length - 1];

    const continuesRun =
      last !== undefined &&
      last.role === node.role &&
      Math.abs(last.box.w - node.box.w) < last.box.w * 0.3 &&
      Math.abs(last.box.h - node.box.h) < last.box.h * 0.4 &&
      // Vertical overlap, not merely proximity.
      Math.min(last.box.y + last.box.h, node.box.y + node.box.h) -
        Math.max(last.box.y, node.box.y) >
        Math.min(last.box.h, node.box.h) * 0.6 &&
      // To the right of it: a row, not a stack.
      node.box.x > last.box.x;

    if (continuesRun) current.push(node);
    else runs.push([node]);
  }

  return runs;
}

/** Median horizontal gap between adjacent columns of a split. */
function columnGap(columns: IRNode[][]): number {
  const gaps: number[] = [];
  for (let i = 1; i < columns.length; i++) {
    const prevRight = Math.max(...columns[i - 1].map((n) => n.box.x + n.box.w));
    const left = Math.min(...columns[i].map((n) => n.box.x));
    gaps.push(left - prevRight);
  }
  return median(gaps);
}

function median(values: number[]): number {
  const clean = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (clean.length === 0) return 16;
  return clean[Math.floor(clean.length / 2)];
}

function quantise(value: number, unit: number): number {
  return Math.max(unit, Math.round(value / unit) * unit);
}

export function synthesizeDeterministic(ir: IR): { tree: { root: ComponentNode }; engine: string } {
  const byId = new Map(ir.nodes.map((n) => [n.id, n]));
  const roots = ir.nodes.filter((n) => n.parent === null).sort((a, b) => a.order - b.order);
  const baseUnit = ir.canvas.grid.baseUnit;

  /**
   * `parent` describes the container this node sits in, when that container
   * lays its children out as a row. A column span is only meaningful inside a
   * grid, and only against *that* grid's column count — computing it against
   * the page's columns and emitting it inside a three-column card row produced
   * spans that meant nothing.
   */
  type RowContext = { columns: number; x: number; w: number } | null;

  const build = (node: IRNode, parent: RowContext = null): ComponentNode => {
    const children = node.children
      .map((id) => byId.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);

    const split = groupColumns(children);
    const layout: Layout = split
      ? {
          direction: "row",
          columns: split.length,
          gap: quantise(columnGap(split), baseUnit),
        }
      : deriveLayout(node, children, baseUnit);
    const component = ROLE_TO_COMPONENT[node.role];

    const props: ComponentNode["props"] = {
      direction: layout.direction,
      columns: layout.columns,
      gap: layout.gap,
      // Preserves vertical proportion without freezing height: content can grow
      // past it, so the page stays responsive.
      minHeight: Math.round(node.box.h),
    };

    if (parent) {
      // Fraction of the parent row this node occupies, in that row's columns.
      const share = node.box.w / Math.max(1, parent.w);
      props.spanCols = Math.max(1, Math.min(parent.columns, Math.round(share * parent.columns)));
      props.parentColumns = parent.columns;
    }

    // Text content comes from the IR when the vision pass read it, otherwise a
    // visibly-placeholder string. Never invented prose presented as real.
    const extracted = node.content?.text?.trim();
    if (extracted) {
      props.text = extracted;
      props.textSource = "extracted";
    } else if (PLACEHOLDER[node.role]) {
      props.text = PLACEHOLDER[node.role]!;
      props.textSource = "placeholder";
    }

    if (node.role === "paragraph") props.lines = node.evidence.lines;

    // A button's label is part of the button. Detection reports it as a nested
    // text region, and rendering that region as its own component produced a
    // <button> inside a <button> — invalid HTML that React will warn about and
    // that no browser lays out sensibly. Fold the label in and stop.
    if (node.role === "button") {
      const label = children.map((c) => c.content?.text?.trim()).find(Boolean);
      if (label) {
        props.text = label;
        props.textSource = "extracted";
      }
      return { component, irNode: node.id, props, children: [] };
    }

    const childContext: RowContext =
      layout.direction === "row"
        ? { columns: layout.columns, x: node.box.x, w: node.box.w }
        : null;

    return {
      component,
      irNode: node.id,
      props,
      children: split
        ? split.map((col) => buildColumn(col, childContext!))
        : buildChildren(children, childContext),
    };
  };

  /**
   * One column of a split. A single element needs no wrapper; several become a
   * Stack so they flow vertically inside their column.
   */
  const buildColumn = (column: IRNode[], parent: RowContext): ComponentNode => {
    if (column.length === 1) return build(column[0], parent);

    const left = Math.min(...column.map((n) => n.box.x));
    const right = Math.max(...column.map((n) => n.box.x + n.box.w));
    const gaps: number[] = [];
    for (let i = 1; i < column.length; i++) {
      gaps.push(column[i].box.y - (column[i - 1].box.y + column[i - 1].box.h));
    }

    return {
      component: "Stack",
      irNode: null,
      props: {
        direction: "column",
        columns: 1,
        gap: quantise(median(gaps), baseUnit),
        ...(parent
          ? {
              spanCols: Math.max(
                1,
                Math.min(
                  parent.columns,
                  Math.round(((right - left) / Math.max(1, parent.w)) * parent.columns),
                ),
              ),
              parentColumns: parent.columns,
            }
          : {}),
        inferred: true,
      },
      children: buildChildren(column, null),
    };
  };

  /**
   * Build a sibling list, wrapping repeated rows in an inferred Grid.
   *
   * The Grid carries no `irNode`: it corresponds to nothing in the drawing, and
   * saying so keeps the fidelity scorer from counting a node the author never
   * made against the sketch.
   */
  const buildChildren = (siblings: IRNode[], parent: RowContext = null): ComponentNode[] =>
    groupRows(siblings).map((run) => {
      if (run.length < 2) return build(run[0], parent);

      const gaps: number[] = [];
      for (let i = 1; i < run.length; i++) {
        gaps.push(run[i].box.x - (run[i - 1].box.x + run[i - 1].box.w));
      }
      const left = Math.min(...run.map((n) => n.box.x));
      const right = Math.max(...run.map((n) => n.box.x + n.box.w));

      return {
        component: "Grid" as const,
        irNode: null,
        props: {
          direction: "row" as const,
          columns: run.length,
          gap: quantise(median(gaps), baseUnit),
          minHeight: Math.round(Math.max(...run.map((n) => n.box.h))),
          inferred: true,
        },
        children: run.map((n) =>
          build(n, { columns: run.length, x: left, w: right - left }),
        ),
      };
    });

  const pageLayout = deriveLayout(
    { children: roots.map((r) => r.id) } as IRNode,
    roots,
    baseUnit,
  );

  return {
    engine: "deterministic",
    tree: {
      root: {
        component: "Page",
        irNode: null,
        props: {
          columns: ir.canvas.grid.columns,
          gap: pageLayout.gap,
          maxWidth: ir.canvas.w,
        },
        children: buildChildren(roots, null),
      },
    },
  };
}

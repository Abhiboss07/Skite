/**
 * The single mapping from a component node to markup.
 *
 * Both emitters consume this: the TSX writer and the live preview renderer.
 * That is deliberate — if they each had their own mapping, the code shown in
 * the "Generated Code" tab could silently diverge from what the "Live Preview"
 * tab renders, which would make the whole debug UI untrustworthy.
 *
 * Layout preservation lives here. Every class that positions something is
 * derived from measured geometry:
 *   spanCols   → column span, so proportions hold at any width
 *   gap        → quantised to the sketch's inferred base unit
 *   minHeight  → vertical proportion without freezing height
 *   direction  → row or column, from where the children actually were
 *
 * Only appearance is invented: colour, type scale, radius, shadow, transition.
 */

import type { ComponentNode } from "../ir/schema.ts";

export type Emitted = {
  tag: string;
  className: string;
  style?: Record<string, string | number>;
  /** Text content, when the node renders text directly. */
  text?: string;
  /** Renders decorative inner markup (e.g. the image placeholder glyph). */
  decoration?: "image" | "avatar" | "none";
  selfClosing?: boolean;
};

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

/** Tailwind's spacing scale is 0.25rem per step. */
const spacing = (px: number) => Math.max(0, Math.round(px / 4));

export function emit(node: ComponentNode, totalColumns: number): Emitted {
  const { props } = node;
  const direction = str(props.direction, "column");
  const columns = num(props.columns, 1);
  const gap = num(props.gap, 16);
  const spanCols = typeof props.spanCols === "number" ? props.spanCols : null;
  const parentColumns = num(props.parentColumns, totalColumns);
  const minHeight = num(props.minHeight, 0);
  const text = str(props.text);

  // Layout classes shared by every container-ish component.
  const flow =
    direction === "row"
      ? `grid grid-cols-1 md:grid-cols-${Math.min(12, Math.max(1, columns))} gap-${spacing(gap)} items-start`
      : `flex flex-col gap-${spacing(gap)}`;

  // Column span, only inside a grid. Synthesis omits it entirely when the
  // parent stacks its children, because a span there styles nothing. A child
  // filling its parent needs no class either.
  const span =
    spanCols === null || spanCols <= 1 || spanCols >= parentColumns
      ? ""
      : ` md:col-span-${Math.min(12, Math.max(1, spanCols))}`;

  switch (node.component) {
    case "Page":
      return {
        tag: "main",
        className: `mx-auto w-full max-w-[${num(props.maxWidth, 1440)}px] px-6 py-8 md:px-10 flex flex-col gap-${spacing(gap)}`,
      };

    case "Navbar":
      return {
        tag: "header",
        className: `flex items-center justify-between gap-6 rounded-xl border border-slate-200/70 bg-white/70 px-6 py-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5`,
        style: minHeight ? { minHeight: `${Math.min(96, minHeight)}px` } : undefined,
      };

    case "Hero":
      return {
        tag: "section",
        className: `${flow} rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-8 md:p-12 dark:border-white/10 dark:from-white/[0.06] dark:to-transparent`,
        style: minHeight ? { minHeight: `${minHeight}px` } : undefined,
      };

    case "Grid":
      return {
        tag: "section",
        className: `${flow}`,
        style: minHeight ? { minHeight: `${minHeight}px` } : undefined,
      };

    case "Card":
      return {
        tag: "article",
        className: `${flow}${span} rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/5`,
        style: minHeight ? { minHeight: `${minHeight}px` } : undefined,
      };

    case "Footer":
      return {
        tag: "footer",
        className: `${flow} rounded-xl border-t border-slate-200/70 bg-slate-50/60 px-6 py-8 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400`,
        style: minHeight ? { minHeight: `${minHeight}px` } : undefined,
      };

    case "Heading": {
      // Size from the measured box: a heading drawn twice as tall was meant to
      // be twice as loud.
      const scale = minHeight >= 88 ? "text-4xl md:text-5xl" : minHeight >= 56 ? "text-2xl md:text-3xl" : "text-xl";
      return {
        tag: "h2",
        className: `${scale}${span} font-semibold tracking-tight text-slate-900 dark:text-slate-50`,
        text: text || "Heading",
      };
    }

    case "Paragraph":
      return {
        tag: "p",
        className: `${span} max-w-prose text-base leading-relaxed text-slate-600 dark:text-slate-400`,
        text: text || "Body copy",
      };

    case "Button":
      return {
        tag: "button",
        className: `inline-flex w-fit items-center justify-center rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200`,
        text: text || "Get started",
      };

    case "Image":
      return {
        tag: "div",
        className: `${span} relative w-full overflow-hidden rounded-xl border border-slate-200/70 bg-slate-100 dark:border-white/10 dark:bg-white/5`,
        style: { minHeight: `${Math.max(120, minHeight)}px` },
        decoration: "image",
      };

    case "Stack":
    default:
      return {
        tag: "div",
        className: `${flow}${span}`,
        style: minHeight ? { minHeight: `${minHeight}px` } : undefined,
      };
  }
}

/** Inner markup for the image placeholder — the familiar crossed rectangle. */
export const IMAGE_DECORATION_CLASSES = {
  wrap: "pointer-events-none absolute inset-0 grid place-items-center",
  label: "text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500",
};

/**
 * The single mapping from a component node to markup.
 *
 * Both emitters consume this: the TSX writer and the live preview renderer.
 * That is deliberate — if they each had their own mapping, the code shown in
 * the "Generated Code" tab could silently diverge from what the "Live Preview"
 * tab renders, which would make the whole debug UI untrustworthy.
 *
 * ── The split that matters ──────────────────────────────────────────
 *
 * `className` carries **layout only**, and every class in it is derived from
 * measured geometry:
 *   spanCols   → column span, so proportions hold at any width
 *   gap        → quantised to the sketch's inferred base unit
 *   direction  → row or column, from where the children actually were
 *
 * `style` carries **appearance only**, and every value in it comes from the
 * design tokens: colour, type step, radius, shadow, transition.
 *
 * Keeping them in separate fields is not tidiness. It means a change to the
 * design engine can only ever touch `style`, so it is structurally incapable of
 * moving a box — the same enforcement used on the token schema itself, which
 * has no positional field. `minHeight` is the one appearance-shaped value that
 * is measured rather than generated, and it stays in `style` beside the tokens
 * because it is a rendering hint; it is written from geometry, never from a
 * token.
 *
 * Appearance is emitted as `var(--sk-*)` references rather than literal values.
 * The Page root declares the custom properties once, so the generated component
 * is themeable by overriding six variables, and — importantly for the preview —
 * needs no Tailwind configuration to render correctly, because none of the
 * generated colour or type values pass through Tailwind's class scanner.
 */

import type { ComponentNode } from "../ir/schema.ts";
import type { DesignTokens, TypeScale } from "../design/tokens.ts";

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

/* ── tokens as CSS custom properties ───────────────────────────────── */

/**
 * The variables the Page root declares.
 *
 * Emitted as a plain style object so the generated TSX carries its own design
 * with no stylesheet, no config and no build step. Overriding these six colours
 * retheme the whole page.
 */
export function tokenVariables(tokens: DesignTokens): Record<string, string> {
  const t = tokens.type;
  const step = (name: keyof TypeScale) => {
    const s = t[name];
    return typeof s === "object" ? s : null;
  };

  const vars: Record<string, string> = {
    "--sk-bg": tokens.palette.background,
    "--sk-surface": tokens.palette.surface,
    "--sk-fg": tokens.palette.foreground,
    "--sk-muted": tokens.palette.muted,
    "--sk-border": tokens.palette.border,
    "--sk-accent": tokens.palette.accent,
    "--sk-accent-fg": tokens.palette.accentForeground,
    "--sk-radius-sm": `${tokens.radius.sm}px`,
    "--sk-radius-md": `${tokens.radius.md}px`,
    "--sk-radius-lg": `${tokens.radius.lg}px`,
    "--sk-shadow-sm": tokens.shadow.sm,
    "--sk-shadow-md": tokens.shadow.md,
    "--sk-shadow-lg": tokens.shadow.lg,
    "--sk-motion": `${tokens.motion.base}ms ${tokens.motion.easing}`,
  };

  for (const name of ["display", "heading", "subheading", "body", "label", "caption"] as const) {
    const s = step(name);
    if (!s) continue;
    vars[`--sk-${name}-size`] = `${s.size}rem`;
    vars[`--sk-${name}-lh`] = String(s.lineHeight);
    vars[`--sk-${name}-weight`] = String(s.weight);
    vars[`--sk-${name}-tracking`] = `${s.tracking}em`;
  }

  return vars;
}

/**
 * Every token reference carries a fallback.
 *
 * Without them the emitted component collapses to unstyled markup the moment
 * the token block is missing — `background-color: var(--sk-bg)` with no
 * definition resolves to nothing, not to white. That was the first version, and
 * it rendered as bare text on a blank page: the build passed, the validator was
 * happy, and only looking at the render showed it.
 *
 * The fallbacks are the restrained monochrome the generator used before tokens
 * existed, so a page stripped of its token block still looks deliberate. This
 * also makes the generated file genuinely standalone — someone can delete
 * `designTokens` and still have a working component.
 */
const FALLBACK: Record<string, string> = {
  "--sk-bg": "#ffffff",
  "--sk-surface": "#f8fafc",
  "--sk-fg": "#0f172a",
  "--sk-muted": "#64748b",
  "--sk-border": "#e2e8f0",
  "--sk-accent": "#0f172a",
  "--sk-accent-fg": "#ffffff",
  "--sk-radius-sm": "6px",
  "--sk-radius-md": "12px",
  "--sk-radius-lg": "16px",
  "--sk-shadow-sm": "0 1px 2px rgb(15 23 42 / 0.06)",
  "--sk-shadow-md": "0 4px 12px rgb(15 23 42 / 0.08)",
  "--sk-shadow-lg": "0 12px 32px rgb(15 23 42 / 0.10)",
  "--sk-motion": "200ms ease",
  "--sk-display-size": "2.5rem", "--sk-display-lh": "1.1", "--sk-display-weight": "700", "--sk-display-tracking": "-0.02em",
  "--sk-heading-size": "1.75rem", "--sk-heading-lh": "1.2", "--sk-heading-weight": "600", "--sk-heading-tracking": "-0.01em",
  "--sk-subheading-size": "1.25rem", "--sk-subheading-lh": "1.3", "--sk-subheading-weight": "600", "--sk-subheading-tracking": "0em",
  "--sk-body-size": "1rem", "--sk-body-lh": "1.6", "--sk-body-weight": "400", "--sk-body-tracking": "0em",
  "--sk-label-size": "0.875rem", "--sk-label-lh": "1.4", "--sk-label-weight": "500", "--sk-label-tracking": "0.01em",
  "--sk-caption-size": "0.75rem", "--sk-caption-lh": "1.4", "--sk-caption-weight": "400", "--sk-caption-tracking": "0.02em",
};

/** `var(--sk-x, fallback)` — never a bare reference. */
const v = (name: string) => `var(${name}, ${FALLBACK[name] ?? "initial"})`;

export const TYPE_STEPS = [
  "display", "heading", "subheading", "body", "label", "caption",
] as const;
export type TypeStepName = (typeof TYPE_STEPS)[number];

/** Inline style for one step of the type scale. */
function typeStyle(name: TypeStepName) {
  return {
    fontSize: v(`--sk-${name}-size`),
    lineHeight: v(`--sk-${name}-lh`),
    fontWeight: v(`--sk-${name}-weight`),
    letterSpacing: v(`--sk-${name}-tracking`),
  };
}

/* ── the mapping ───────────────────────────────────────────────────── */

export function emit(
  node: ComponentNode,
  totalColumns: number,
  tokens?: DesignTokens,
): Emitted {
  const { props } = node;
  const direction = str(props.direction, "column");
  const columns = num(props.columns, 1);
  const gap = num(props.gap, 16);
  const spanCols = typeof props.spanCols === "number" ? props.spanCols : null;
  const parentColumns = num(props.parentColumns, totalColumns);
  const minHeight = num(props.minHeight, 0);
  const text = str(props.text);

  // Layout classes shared by every container-ish component. Unchanged by the
  // design engine, and unchangeable by it.
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

  // Typed as the same record the caller expects, so spreading it never widens
  // a property to `undefined`.
  const h: Record<string, string | number> = minHeight ? { minHeight: `${minHeight}px` } : {};

  switch (node.component) {
    case "Page":
      return {
        tag: "main",
        className: `mx-auto w-full max-w-[${num(props.maxWidth, 1440)}px] px-6 py-8 md:px-10 flex flex-col gap-${spacing(gap)}`,
        style: {
          // The whole token set is declared once, here.
          ...(tokens ? tokenVariables(tokens) : {}),
          backgroundColor: v("--sk-bg"),
          color: v("--sk-fg"),
          ...typeStyle("body"),
        },
      };

    case "Navbar":
      return {
        tag: "header",
        className: `flex items-center justify-between gap-6 px-6 py-4`,
        style: {
          backgroundColor: v("--sk-surface"),
          border: `1px solid ${v("--sk-border")}`,
          borderRadius: v("--sk-radius-md"),
          boxShadow: v("--sk-shadow-sm"),
          ...(minHeight ? { minHeight: `${Math.min(96, minHeight)}px` } : {}),
        },
      };

    case "Hero":
      return {
        tag: "section",
        className: `${flow} p-8 md:p-12`,
        style: {
          backgroundColor: v("--sk-surface"),
          border: `1px solid ${v("--sk-border")}`,
          borderRadius: v("--sk-radius-lg"),
          ...h,
        },
      };

    case "Grid":
      return { tag: "section", className: `${flow}`, style: { ...h } };

    case "Card":
      return {
        tag: "article",
        className: `${flow}${span} p-6`,
        style: {
          backgroundColor: v("--sk-surface"),
          border: `1px solid ${v("--sk-border")}`,
          borderRadius: v("--sk-radius-md"),
          boxShadow: v("--sk-shadow-sm"),
          transition: `box-shadow ${v("--sk-motion")}`,
          ...h,
        },
      };

    case "Footer":
      return {
        tag: "footer",
        className: `${flow} px-6 py-8`,
        style: {
          backgroundColor: v("--sk-surface"),
          borderTop: `1px solid ${v("--sk-border")}`,
          borderRadius: v("--sk-radius-md"),
          color: v("--sk-muted"),
          ...typeStyle("label"),
          ...h,
        },
      };

    case "Heading": {
      // The step is decided in synthesis, relative to the page's own text —
      // see `typeStepFor`. The fallback keeps this function total for a tree
      // built before that prop existed.
      const step = TYPE_STEPS.includes(str(props.typeStep) as TypeStepName)
        ? (str(props.typeStep) as TypeStepName)
        : minHeight >= 88
          ? "display"
          : minHeight >= 56
            ? "heading"
            : "subheading";
      return {
        tag: "h2",
        className: `${span}`.trim(),
        style: { color: v("--sk-fg"), ...typeStyle(step) },
        text: text || "Heading",
      };
    }

    case "Paragraph": {
      const step = TYPE_STEPS.includes(str(props.typeStep) as TypeStepName)
        ? (str(props.typeStep) as TypeStepName)
        : "body";
      return {
        tag: "p",
        className: `${span} max-w-prose`.trim(),
        style: { color: v("--sk-muted"), ...typeStyle(step) },
        text: text || "Body copy",
      };
    }

    case "Button":
      return {
        tag: "button",
        className: `inline-flex w-fit items-center justify-center px-6 py-3`,
        style: {
          backgroundColor: v("--sk-accent"),
          color: v("--sk-accent-fg"),
          borderRadius: v("--sk-radius-sm"),
          boxShadow: v("--sk-shadow-sm"),
          transition: `background-color ${v("--sk-motion")}`,
          ...typeStyle("label"),
        },
        text: text || "Get started",
      };

    case "Image":
      return {
        tag: "div",
        className: `${span} relative w-full overflow-hidden`.trim(),
        style: {
          backgroundColor: v("--sk-surface"),
          border: `1px solid ${v("--sk-border")}`,
          borderRadius: v("--sk-radius-md"),
          minHeight: `${Math.max(120, minHeight)}px`,
        },
        decoration: "image",
      };

    case "Stack":
    default:
      return { tag: "div", className: `${flow}${span}`, style: { ...h } };
  }
}

/**
 * Inner markup for the image placeholder — the familiar crossed rectangle.
 *
 * The label's colour comes from a token like everything else; only its layout
 * stays a class.
 */
export const IMAGE_DECORATION_CLASSES = {
  wrap: "pointer-events-none absolute inset-0 grid place-items-center",
  label: "uppercase",
};

export const IMAGE_DECORATION_STYLE: Record<string, string> = {
  color: v("--sk-muted"),
  fontSize: v("--sk-caption-size"),
  fontWeight: v("--sk-caption-weight"),
  letterSpacing: "0.12em",
};

import { z } from "zod";

/**
 * Design tokens — the appearance half of generation.
 *
 * The split this file depends on: **layout is measured, appearance is
 * invented**. A generator may choose a hue, a type scale, a radius or a shadow.
 * It may not choose a direction, a column count, a span, a gap, an order or an
 * alignment — those come from the drawing and changing one is a layout change,
 * which is the single thing this project promises not to do.
 *
 * So the token set below contains no positional field of any kind. That is not
 * an oversight to be filled in later; it is the same structural enforcement
 * used on the classification schema, where the absence of a coordinate field is
 * what prevents a model from moving a box. A design engine that cannot express
 * a position cannot drift the layout.
 *
 * `spacing` is the one entry that looks positional and is not: it is a rhythm —
 * the ladder of permitted values — derived from the base unit the detector
 * already measured. Which rung a given gap uses was decided by the drawing.
 */

/* ── colour ────────────────────────────────────────────────────────── */

export const PaletteSchema = z.object({
  /** Where the palette came from, and therefore how much to trust it. */
  source: z.enum(["extracted", "derived", "default"]),
  /** Page background. */
  background: z.string(),
  /** Raised surfaces: cards, panels. */
  surface: z.string(),
  /** Body text. */
  foreground: z.string(),
  /** Secondary text. */
  muted: z.string(),
  /** Hairlines and dividers. */
  border: z.string(),
  /** The one colour that draws the eye. */
  accent: z.string(),
  /** Text on the accent. */
  accentForeground: z.string(),
  /** Measured contrast of foreground on background, for the report. */
  contrast: z.object({ foreground: z.number(), muted: z.number(), accent: z.number() }),
});

export type Palette = z.infer<typeof PaletteSchema>;

/* ── type ──────────────────────────────────────────────────────────── */

export const TypeStepSchema = z.object({
  /** rem */
  size: z.number(),
  lineHeight: z.number(),
  weight: z.number().int(),
  /** em */
  tracking: z.number(),
});

export const TypeScaleSchema = z.object({
  /** Ratio between adjacent steps. Chosen from the drawing's own contrast. */
  ratio: z.number(),
  baseSize: z.number(),
  display: TypeStepSchema,
  heading: TypeStepSchema,
  subheading: TypeStepSchema,
  body: TypeStepSchema,
  label: TypeStepSchema,
  caption: TypeStepSchema,
});

export type TypeScale = z.infer<typeof TypeScaleSchema>;

/* ── the rest of appearance ────────────────────────────────────────── */

export const DesignTokensSchema = z.object({
  version: z.literal("tokens-1.0"),
  derivedFrom: z.string(),
  palette: PaletteSchema,
  type: TypeScaleSchema,
  /**
   * The permitted spacing ladder, in pixels, quantised to the measured base
   * unit. Layout chooses a rung; this decides what the rungs are.
   */
  spacing: z.array(z.number()),
  baseUnit: z.number(),
  radius: z.object({ sm: z.number(), md: z.number(), lg: z.number(), full: z.number() }),
  shadow: z.object({ sm: z.string(), md: z.string(), lg: z.string() }),
  /** Motion, in ms and an easing curve. */
  motion: z.object({ fast: z.number(), base: z.number(), slow: z.number(), easing: z.string() }),
  /** Why each choice was made, for the report and the viva. */
  rationale: z.array(z.object({ token: z.string(), because: z.string() })),
  engine: z.string(),
  ms: z.number(),
});

export type DesignTokens = z.infer<typeof DesignTokensSchema>;

/**
 * Fields a design pass is forbidden to emit.
 *
 * Checked at runtime by `assertNoLayoutTokens`. A list plus an assertion is
 * weaker than a schema that cannot express them — which is why the schema above
 * has no such fields — but it catches the case where a future pass merges extra
 * keys into a token object before handing it on.
 */
export const FORBIDDEN_TOKEN_FIELDS = [
  "direction", "columns", "span", "gap", "order", "align",
  "x", "y", "width", "height", "top", "left", "position",
] as const;

export function assertNoLayoutTokens(tokens: unknown, where: string): void {
  const walk = (value: unknown, path: string) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if ((FORBIDDEN_TOKEN_FIELDS as readonly string[]).includes(key)) {
        throw new Error(
          `${where}: design tokens must not carry layout. Found "${key}" at ${path}${key}. ` +
            `Layout comes from the drawing; only appearance may be generated.`,
        );
      }
      walk(child, `${path}${key}.`);
    }
  };
  walk(tokens, "");
}

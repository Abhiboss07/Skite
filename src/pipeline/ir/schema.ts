import { z } from "zod";

/**
 * The Layout IR — MVP subset.
 *
 * This is the artefact the whole pipeline exists to produce. Geometry is frozen
 * by the deterministic passes before any model runs; the classification pass can
 * only write `role`, `roleConfidence` and `content`, because those are the only
 * fields its output schema exposes. See docs/architecture/02-layout-ir.md.
 *
 * MVP scope: one page, nine component roles, no flows/annotations/style layer.
 */

/** The nine components the MVP supports, plus an explicit unknown. */
export const RoleEnum = z.enum([
  "navbar",
  "hero",
  "heading",
  "paragraph",
  "button",
  "image",
  "card",
  "grid",
  "footer",
  "unknown",
]);
export type Role = z.infer<typeof RoleEnum>;

/** What the geometry passes could tell about a region without semantics. */
export const PrimitiveEnum = z.enum(["container", "text", "control", "media", "rule"]);
export type Primitive = z.infer<typeof PrimitiveEnum>;

export const BoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type Box = z.infer<typeof BoxSchema>;

export const NodeSchema = z.object({
  id: z.string(),
  parent: z.string().nullable(),
  children: z.array(z.string()),

  // ── structure: frozen after the geometry passes ──────────────────
  box: BoxSchema,
  /** Column span once snapped to the inferred grid. Null when it did not snap. */
  grid: z.object({ colStart: z.number(), colEnd: z.number() }).nullable(),
  /** Reading order within the parent. Independent of visual position. */
  order: z.number(),

  // ── semantics: written by the classification pass only ───────────
  primitive: PrimitiveEnum,
  role: RoleEnum,
  roleConfidence: z.number().min(0).max(1),

  // ── content: extracted, never invented ───────────────────────────
  content: z
    .object({
      text: z.string(),
      lines: z.number(),
      /** The model's own score. Not calibrated — see `fits`. */
      confidence: z.number().min(0).max(1),
      /**
       * Whether the transcription is a plausible length for the box it came
       * from, measured independently of what the model claimed.
       *
       * A model's confidence is its opinion of itself, and it has been observed
       * reporting 96% while attributing one region's text to another. This is a
       * second opinion that cannot be talked into agreeing: a 79×20 box does not
       * hold sixty characters, whatever the model says about it.
       */
      fits: z.boolean().optional(),
    })
    .nullable(),

  /** Geometric evidence: debugging, the fidelity report, and heuristic classification. */
  evidence: z.object({
    fillRatio: z.number(),
    interiorInk: z.number(),
    interiorFill: z.number(),
    strokePixels: z.number(),
    lines: z.number(),
    snapped: z.boolean(),
  }),
});
export type IRNode = z.infer<typeof NodeSchema>;

export const GridSchema = z.object({
  columns: z.number(),
  gutter: z.number(),
  margin: z.number(),
  baseUnit: z.number(),
  confidence: z.number().min(0).max(1),
});
export type GridSpec = z.infer<typeof GridSchema>;

export const ConfidenceSchema = z.object({
  ocr: z.number().min(0).max(1),
  layout: z.number().min(0).max(1),
  component: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
});
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const IRSchema = z.object({
  irVersion: z.literal("1.0.0-mvp"),
  id: z.string(),
  source: z.object({
    kind: z.enum(["photo", "scan", "wireframe", "figma", "synthetic"]),
    sha256: z.string(),
    pixels: z.object({ w: z.number(), h: z.number() }),
  }),
  canvas: z.object({
    w: z.number(),
    h: z.number(),
    grid: GridSchema,
  }),
  nodes: z.array(NodeSchema),
  confidence: ConfidenceSchema,
  provenance: z.array(
    z.object({
      pass: z.string(),
      engine: z.string(),
      ms: z.number(),
    }),
  ),
});
export type IR = z.infer<typeof IRSchema>;

/* ────────────────────────────────────────────────────────────────────
 * The classification pass's output schema.
 *
 * Note what is absent: there is no box, no x/y/w/h, no size. A model that
 * wanted to move a region has no field in which to say so. This is the
 * structural enforcement of layout preservation — it is a property of the
 * schema, not a request in a prompt.
 * ──────────────────────────────────────────────────────────────────── */
export const ClassificationSchema = z.object({
  regions: z.array(
    z.object({
      id: z.string(),
      role: RoleEnum,
      confidence: z.number().min(0).max(1),
      /** Transcribed text if this region contains writing, else empty. */
      text: z.string(),
      textConfidence: z.number().min(0).max(1),
    }),
  ),
});
export type Classification = z.infer<typeof ClassificationSchema>;

/* ────────────────────────────────────────────────────────────────────
 * The synthesis pass's output schema: a component tree, never code.
 * `irNode` is mandatory — it is the back-reference that makes fidelity
 * measurable after rendering.
 * ──────────────────────────────────────────────────────────────────── */
export const ComponentNameEnum = z.enum([
  "Page",
  "Navbar",
  "Hero",
  "Heading",
  "Paragraph",
  "Button",
  "Image",
  "Card",
  "Grid",
  "Footer",
  "Stack",
]);
export type ComponentName = z.infer<typeof ComponentNameEnum>;

export type ComponentNode = {
  component: ComponentName;
  irNode: string | null;
  props: Record<string, string | number | boolean | string[]>;
  children: ComponentNode[];
};

/** Recursive schemas need the explicit annotation; zod cannot infer the cycle. */
export const ComponentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z.object({
    component: ComponentNameEnum,
    irNode: z.string().nullable(),
    props: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    ),
    children: z.array(ComponentNodeSchema),
  }),
);

export const ComponentTreeSchema = z.object({ root: ComponentNodeSchema });
export type ComponentTree = z.infer<typeof ComponentTreeSchema>;

import { z } from "zod";

/**
 * The semantic layer.
 *
 * Detection answers "what shapes are on this page, and where". This answers
 * "what are they". The two are deliberately separate objects: detection is
 * frozen, and a semantic pass that could edit geometry would quietly become a
 * second detector.
 *
 * Every semantic node points back at the detection node it came from, so any
 * claim made here can be traced to measured ink. Nodes that exist only as
 * grouping — a Section wrapping a heading and a paragraph that were never drawn
 * inside a box — carry `source: null` and are marked inferred.
 */

/* ── the taxonomy ──────────────────────────────────────────────────── */

/**
 * Semantic types, grouped by what decides them.
 *
 * The grouping is not cosmetic. Everything in `structural` and `content` is
 * decidable from geometry alone, which is why the offline path can produce
 * them. Everything in `textual` needs to know what a region *says* — a pricing
 * card and a testimonial card are the same rectangle until you read them — and
 * is only reachable when OCR has run. The rule-based classifier will never emit
 * a `textual` type, and says so rather than guessing.
 */
export const SEMANTIC_TYPES = [
  // Page-level structure
  "Page", "Navigation", "Hero", "Section", "Footer",
  // Grouping
  "Grid", "Gallery", "List", "Card", "Stack", "Form",
  // Content
  "Logo", "Heading", "Subheading", "Label", "Paragraph", "Image", "Icon", "Divider",
  // Interactive
  "Button", "CTAButton", "Link", "Input",
  // Text-dependent — never emitted without OCR
  "PricingCard", "Testimonial", "FAQItem", "Stat", "FeatureItem",
  // Honest fallback
  "Unknown",
] as const;

export const SemanticTypeEnum = z.enum(SEMANTIC_TYPES);
export type SemanticType = z.infer<typeof SemanticTypeEnum>;

/** Types this pass cannot decide from geometry. Documented, not aspirational. */
export const TEXT_DEPENDENT: readonly SemanticType[] = [
  "PricingCard", "Testimonial", "FAQItem", "Stat", "FeatureItem",
];

/* ── layout facts, preserved ───────────────────────────────────────── */

/**
 * How a node's children are arranged, and where the node sits.
 *
 * This is the part a downstream model must not be free to reinterpret. It is
 * measured, not styled: a generator may change a colour, a radius or a font,
 * but `direction`, `columns`, `spans` and `order` describe the drawing.
 */
export const LayoutSchema = z.object({
  direction: z.enum(["row", "column", "none"]),
  /** Columns this node's children occupy, when the direction is a row. */
  columns: z.number().int().min(1).max(12),
  /** Columns this node itself spans within its parent. */
  span: z.number().int().min(1).max(12),
  /** Median measured gap between children, quantised to the page base unit. */
  gap: z.number().min(0),
  /** Fraction of the canvas width this node occupies. */
  widthRatio: z.number().min(0).max(1),
  /** Alignment of children along the cross axis, measured from their edges. */
  align: z.enum(["start", "center", "end", "stretch", "mixed"]),
  /** Position in reading order among all nodes. */
  order: z.number().int().min(0),
});

export type Layout = z.infer<typeof LayoutSchema>;

/* ── evidence ──────────────────────────────────────────────────────── */

/**
 * Why this type was assigned.
 *
 * Named rules rather than a score alone. When a semantic tree looks wrong, the
 * useful question is which rule fired, and a bare confidence number cannot
 * answer it — this is the same reasoning behind the Studio's stage tabs.
 */
export const SemanticEvidenceSchema = z.object({
  rule: z.string(),
  confidence: z.number().min(0).max(1),
  /** Short human-readable reasons, in the order they were checked. */
  because: z.array(z.string()),
});

export type SemanticEvidence = z.infer<typeof SemanticEvidenceSchema>;

/* ── the node ──────────────────────────────────────────────────────── */

export type SemanticNode = {
  id: string;
  type: SemanticType;
  /** The detection node this came from; null when the node is pure grouping. */
  source: string | null;
  /** True when nothing in the drawing corresponds to this node directly. */
  inferred: boolean;
  box: { x: number; y: number; w: number; h: number };
  layout: Layout;
  evidence: SemanticEvidence;
  /** Transcribed text, when a pass that can read has run. */
  text: string | null;
  children: SemanticNode[];
};

export const SemanticNodeSchema: z.ZodType<SemanticNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: SemanticTypeEnum,
    source: z.string().nullable(),
    inferred: z.boolean(),
    box: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
    layout: LayoutSchema,
    evidence: SemanticEvidenceSchema,
    text: z.string().nullable(),
    children: z.array(SemanticNodeSchema),
  }),
);

export const SemanticIRSchema = z.object({
  version: z.literal("semantic-1.0"),
  /** The detection IR this was derived from, by id. */
  derivedFrom: z.string(),
  canvas: z.object({
    w: z.number(),
    h: z.number(),
    columns: z.number().int(),
    baseUnit: z.number(),
  }),
  root: SemanticNodeSchema,
  /** Counts per type, for the report. */
  summary: z.record(z.string(), z.number()),
  /**
   * Types that were considered and rejected for want of text, so a reader of
   * the IR knows the difference between "not present" and "not decidable".
   */
  undecidable: z.array(z.string()),
  engine: z.string(),
  ms: z.number(),
});

export type SemanticIR = z.infer<typeof SemanticIRSchema>;

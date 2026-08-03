/**
 * The pipeline orchestrator.
 *
 * Runs every pass, records timings and confidences, and produces both the
 * artefacts and the run report. Deliberately a plain sequential function: the
 * topology is fixed, so there is nothing here for an agent framework to decide.
 *
 * Every intermediate is retained, because the debug UI shows all of them —
 * being able to see exactly where a bad output came from is the difference
 * between a demo and something you can improve.
 */

import { preprocess } from "./geometry/preprocess.ts";
import { detect } from "./geometry/detect.ts";
import { buildStructure } from "./geometry/grid.ts";
import { classifyHeuristic } from "./classify/heuristic.ts";
import { buildClassificationPrompt } from "./prompts/classify.ts";
import { synthesizeDeterministic } from "./synthesize/deterministic.ts";
import { emitTsx, usedComponents } from "./emit/tsx.ts";
import { validateCode, type Validation } from "./validate/check.ts";
import { prune } from "./prune/prune.ts";
import { classifySemantics } from "./semantic/classify.ts";
import { generateDesign } from "./design/engine.ts";
import { verifyNoDrift, type DriftReport } from "./design/verify.ts";
import { DesignTokensSchema, type DesignTokens } from "./design/tokens.ts";
import { SemanticIRSchema, type SemanticIR } from "./semantic/schema.ts";
import type { Classification, ComponentTree, IR, IRNode } from "./ir/schema.ts";
import { IRSchema } from "./ir/schema.ts";

export type PipelineOptions = {
  /** "auto" uses the vision model when a key is available, else the heuristic. */
  classifier?: "auto" | "heuristic" | "vision";
  sourceKind?: IR["source"]["kind"];
};

export type PipelineResult = {
  ok: boolean;
  ir: IR;
  tree: ComponentTree;
  /** The semantic layer: what the regions mean, derived after the IR validates. */
  semantic: SemanticIR;
  /** Appearance only — the design pass may not express a position. */
  design: DesignTokens;
  /** Proof that the design pass moved nothing. */
  drift: DriftReport;
  code: string;
  prompt: string;
  /** Base64 PNGs for the debug UI. */
  images: { working: string; cleaned: string };
  detection: ReturnType<typeof detect>;
  report: RunReport;
  warnings: string[];
};

export type RunReport = {
  totalMs: number;
  passes: { pass: string; engine: string; ms: number }[];
  models: string[];
  confidence: IR["confidence"];
  components: Record<string, number>;
  nodeCount: number;
  grid: IR["canvas"]["grid"];
  buildStatus: "passed" | "failed";
  validation: Validation;
  textExtracted: boolean;
};

export async function runPipeline(
  input: Buffer,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const started = Date.now();
  const warnings: string[] = [];
  const passes: { pass: string; engine: string; ms: number }[] = [];
  const models: string[] = [];

  // ── 1 preprocess ─────────────────────────────────────────────────
  const pre = await preprocess(input);
  passes.push({ pass: "preprocess", engine: "cv", ms: pre.ms });
  if (pre.quality < 0.6) {
    warnings.push(
      `Input quality is low (ink coverage ${(pre.inkRatio * 100).toFixed(1)}%). ` +
        `This is usually a blank page, a photo of something that is not a wireframe, or very faint strokes.`,
    );
  }

  // ── 2 detect ─────────────────────────────────────────────────────
  const detection = detect(pre.mask, pre.width, pre.height, {
    grey: pre.grey,
    paperLevel: pre.paperLevel,
  });
  passes.push({ pass: "detect", engine: "cv", ms: detection.ms });
  if (detection.regions.length === 0) {
    warnings.push("No regions detected. Nothing downstream can run.");
  }

  // ── 3 structure ──────────────────────────────────────────────────
  const structured = buildStructure(detection.regions, pre.width, pre.height);
  passes.push({ pass: "structure", engine: "cv", ms: structured.ms });
  if (structured.grid.confidence < 0.45 && structured.nodes.length > 2) {
    warnings.push(
      `Weak grid signal (${(structured.grid.confidence * 100).toFixed(0)}%). ` +
        `The drawing may be freehand rather than aligned; layout fidelity will be lower.`,
    );
  }

  // ── 4 classify ───────────────────────────────────────────────────
  // The prompt is always built, whether or not it is sent — the debug UI shows
  // it either way, which is how you inspect what the model would receive.
  const prompt = buildClassificationPrompt(structured);

  const wantsVision =
    options.classifier === "vision" ||
    (options.classifier !== "heuristic" && Boolean(process.env.ANTHROPIC_API_KEY));

  let classification: Classification & { engine: string };
  const classifyStart = Date.now();

  if (wantsVision) {
    try {
      const { classifyWithVision } = await import("./classify/vision.ts");
      classification = await classifyWithVision(structured, pre.workingPng, prompt);
      models.push(classification.engine);
    } catch (error) {
      warnings.push(
        `Vision classification unavailable (${(error as Error).message}). Fell back to the heuristic classifier.`,
      );
      classification = classifyHeuristic(structured);
    }
  } else {
    classification = classifyHeuristic(structured);
    if (options.classifier !== "heuristic") {
      warnings.push(
        "ANTHROPIC_API_KEY is not set, so the offline heuristic classifier was used. " +
          "Roles are inferred from geometry only and no handwriting is read.",
      );
    }
  }
  passes.push({ pass: "classify", engine: classification.engine, ms: Date.now() - classifyStart });

  // ── assemble the IR ──────────────────────────────────────────────
  const roleById = new Map(classification.regions.map((r) => [r.id, r]));

  const classified: IRNode[] = structured.nodes.map((n) => {
    const assigned = roleById.get(n.id);
    const text = assigned?.text?.trim() ?? "";
    return {
      ...n,
      role: assigned?.role ?? "unknown",
      roleConfidence: assigned?.confidence ?? 0.2,
      content: text
        ? { text, lines: n.evidence.lines, confidence: assigned?.textConfidence ?? 0 }
        : null,
    };
  });

  // ── 4b prune ─────────────────────────────────────────────────────
  // Regions that are real ink but not separate components. Needs the
  // containment tree, so it cannot live in the frozen detector.
  const pruneStart = Date.now();
  const pruned = prune(classified);
  passes.push({ pass: "prune", engine: "structural", ms: Date.now() - pruneStart });
  for (const cut of pruned.removed) {
    warnings.push(`Pruned ${cut.id} (${cut.rule}): ${cut.reason}`);
  }

  const nodes = pruned.nodes;

  const componentConfidence = nodes.length
    ? nodes.reduce((sum, n) => sum + n.roleConfidence, 0) / nodes.length
    : 0;
  const ocrConfidence = nodes.filter((n) => n.content).length
    ? nodes.filter((n) => n.content).reduce((s, n) => s + (n.content?.confidence ?? 0), 0) /
      nodes.filter((n) => n.content).length
    : 0;
  // Weighted mean of the two structural signals, scaled by input quality.
  //
  // Multiplying them compounds: three independent 0.7s become 0.34, which reads
  // as "this went badly" for a run that measured 84% fidelity against ground
  // truth. Quality stays a multiplier because it is not a peer signal — if the
  // photograph is unusable, nothing downstream is trustworthy regardless of how
  // confidently the grid was fitted.
  const layoutConfidence =
    (structured.confidence * 0.55 + detection.confidence * 0.45) * pre.quality;

  const ir: IR = {
    irVersion: "1.0.0-mvp",
    id: `ir_${pre.sha256.slice(0, 16)}`,
    source: {
      kind: options.sourceKind ?? "photo",
      sha256: pre.sha256,
      pixels: pre.sourcePixels,
    },
    canvas: { w: structured.canvasW, h: structured.canvasH, grid: structured.grid },
    nodes,
    confidence: {
      ocr: round(ocrConfidence),
      layout: round(layoutConfidence),
      component: round(componentConfidence),
      // Layout is weighted hardest: it is the product claim.
      overall: round(layoutConfidence * 0.5 + componentConfidence * 0.35 + ocrConfidence * 0.15),
    },
    provenance: passes,
  };

  // Validating our own output catches schema drift at the boundary rather than
  // three passes later in the UI.
  const parsed = IRSchema.safeParse(ir);
  if (!parsed.success) {
    warnings.push(`IR failed its own schema: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }

  // ── 5 semantics ──────────────────────────────────────────────────
  // Runs on the validated IR, and reads it without writing to it. Detection is
  // frozen; a semantic pass able to adjust a box would be a second detector.
  const semantic = classifySemantics(ir);
  passes.push({ pass: "semantics", engine: semantic.engine, ms: semantic.ms });

  const semanticCheck = SemanticIRSchema.safeParse(semantic);
  if (!semanticCheck.success) {
    warnings.push(`Semantic IR failed its own schema: ${semanticCheck.error.issues[0]?.message ?? "unknown"}`);
  }

  // ── 5b design ────────────────────────────────────────────────────
  // Appearance is generated from the semantic IR and the source pixels. The
  // token schema has no positional field, so this pass cannot express a layout
  // change; `verifyNoDrift` then confirms it did not make one anyway.
  const designStart = Date.now();
  const design = await generateDesign(semantic, input);
  passes.push({ pass: "design", engine: design.engine, ms: Date.now() - designStart });

  const designCheck = DesignTokensSchema.safeParse(design);
  if (!designCheck.success) {
    warnings.push(`Design tokens failed their schema: ${designCheck.error.issues[0]?.message ?? "unknown"}`);
  }

  // Re-derive the semantic IR and compare. Identical input must give identical
  // layout; anything else means the design pass reached somewhere it should not.
  const drift = verifyNoDrift(semantic, classifySemantics(ir));
  if (!drift.ok) {
    warnings.push(
      `Design drift detected across ${drift.violations.length} propert(ies) — ` +
        drift.violations.slice(0, 3).map((v) => `${v.node}.${v.property} ${v.before}→${v.after}`).join(", "),
    );
  }

  // ── 6 synthesise + emit ──────────────────────────────────────────
  const synthStart = Date.now();
  const { tree, engine } = synthesizeDeterministic(ir);
  passes.push({ pass: "synthesise", engine, ms: Date.now() - synthStart });

  const emitStart = Date.now();
  const code = emitTsx(tree, ir.canvas.grid.columns);
  passes.push({ pass: "emit", engine: "deterministic", ms: Date.now() - emitStart });

  // ── 7 validate ───────────────────────────────────────────────────
  // Checking our own output before returning it: a generator that ships code it
  // never parsed is asking the user to find the bug for it.
  const validation = validateCode(code);
  passes.push({ pass: "validate", engine: "typescript", ms: validation.ms });
  for (const issue of validation.issues.filter((i) => i.level === "error")) {
    warnings.push(`Generated code failed validation (${issue.rule}): ${issue.message}`);
  }

  const report: RunReport = {
    totalMs: Date.now() - started,
    passes,
    models,
    confidence: ir.confidence,
    components: usedComponents(tree),
    nodeCount: nodes.length,
    grid: ir.canvas.grid,
    buildStatus: validation.ok ? "passed" : "failed",
    validation,
    textExtracted: nodes.some((n) => n.content !== null),
  };

  return {
    ok: nodes.length > 0 && validation.ok,
    ir,
    tree,
    semantic,
    design,
    drift,
    code,
    prompt,
    images: {
      working: `data:image/png;base64,${pre.workingPng.toString("base64")}`,
      cleaned: `data:image/png;base64,${pre.cleanedPng.toString("base64")}`,
    },
    detection,
    report,
    warnings,
  };
}

const round = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 1000) / 1000;

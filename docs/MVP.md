# Vertical slice MVP

A single wireframe goes in; a working, layout-preserving React component comes
out. Every intermediate is retained and inspectable.

This is deliberately *not* the production system described in
[`docs/architecture/`](./architecture/). It is one page, one path, end to end,
built to answer one question — does the pipeline actually work — with numbers
rather than a demo video.

**Try it:** `npm run build && npm start`, then open `/studio` and drop in
anything from `test-dataset/synthetic/`.

---

## 1. What it does

```
upload → preprocess → detect → structure → classify → IR → synthesise → emit → validate → preview
          ─────────── deterministic CV ───────────    ↑
                                             optional vision model
```

| Pass | File | Engine | What it produces |
|---|---|---|---|
| 1 Preprocess | `geometry/preprocess.ts` | classical CV | Binary stroke mask, quality signal |
| 2 Detect | `geometry/detect.ts` | classical CV | Regions with primitive type and ink evidence |
| 3 Structure | `geometry/grid.ts` | classical CV | Grid, containment tree, reading order |
| 4 Classify | `classify/heuristic.ts` or `classify/vision.ts` | rules **or** `claude-opus-5` | A role and any text per region |
| 5 IR | `ir/schema.ts` | Zod | The validated contract every later pass reads |
| 6 Synthesise | `synthesize/deterministic.ts` | rules | Component tree with derived layout |
| 7 Emit | `emit/tsx.ts` + `emit/classes.ts` | deterministic | React/Tailwind source |
| 8 Validate | `validate/check.ts` | TypeScript | Parse check and responsive lint |

The whole run is ~250 ms and, without an API key, involves no network call at
all. That is not a fallback path bolted on afterwards — the deterministic route
is the primary one, and the model is an optional accuracy improvement on a single
pass. A viva where the wifi drops is still a viva with a working demo.

### Supported components

`Navbar` · `Hero` · `Heading` · `Paragraph` · `Button` · `Image` · `Card` ·
`Grid` · `Footer`, inside a `Page`, with `Stack` for grouping.

---

## 2. How layout preservation is enforced

The requirement is that the system must not redesign. Asking a model nicely does
not achieve that, so it is enforced three ways, none of which is a prompt.

**The model has no channel to move anything.** The classification schema
(`ClassificationSchema`, and the `OUTPUT_SCHEMA` sent as `output_config.format`)
contains `id`, `role`, `confidence`, `text`, `textConfidence` — and no coordinate
field, with `additionalProperties: false`. Geometry is measured before the model
is called and is not part of what it returns. A model that wanted to reposition a
section could not express it.

**Every layout value is derived from measurement.** Column spans come from the
fraction of the parent a region occupies; gaps are the median measured gap,
quantised to the base unit inferred from the drawing; `min-height` comes from the
drawn height; row versus column comes from where children actually sit. The
generator invents only appearance — colour, type scale, radius, shadow,
transition.

**Two structures are inferred rather than read**, because people do not draw
them:

- *Implicit grids.* Nobody draws a rectangle around a row of cards; the row is
  the drawing. A run of siblings sharing a role, a band and a width becomes a
  `Grid`.
- *Column splits.* A hero with a headline on the left and an image on the right
  is two columns. Partitioning children by horizontal extent recovers it —
  without this every split hero flattens into a stack, which is a layout change.

Both inferred wrappers carry `irNode: null`, so the fidelity scorer never counts
a node the author did not draw against the sketch.

---

## 3. Measured results

60 synthetic samples, offline classifier, no model in the loop.
Reproduce with `npm run evaluate`.

| | sketch | wireframe | figma | **overall** |
|---|---|---|---|---|
| **Layout fidelity** | 84.1% | 89.4% | 87.5% | **87.0%** |
| ↳ geometry (IoU) | 78.3% | 87.0% | 85.4% | 83.6% |
| ↳ reading order | 98.6% | 99.4% | 97.7% | 98.6% |
| ↳ coverage | 83.2% | 82.7% | 79.0% | 81.6% |
| **Component accuracy** | 89.7% | 89.3% | 85.3% | **88.1%** |
| **Build success rate** | 100% | 100% | 100% | **100%** |
| **Responsive pass rate** | 100% | 100% | 100% | **100%** |
| **Median time** | 305 ms | 241 ms | 251 ms | **263 ms** |
| **p95 time** | 441 ms | 296 ms | 277 ms | 343 ms |

OCR accuracy is `n/a`: the offline classifier reads geometry only. It reports
empty text at zero confidence rather than inventing plausible copy, and the
harness records that as absent rather than as zero — averaging a structural
zero into a text metric would report a score for a pass that never ran.

**These numbers are an upper bound.** The corpus is synthetic, so ground truth
is exact and the strokes are generated rather than drawn. See
[`test-dataset/README.md`](../test-dataset/README.md) for what that does and does
not establish, and for how to populate `test-dataset/real/`.

The gap that matters is coverage, not geometry: what is found is located
accurately (83.6% IoU), but roughly one region in five is not found at all.
Adjacent regions merging under dilation, and light strokes falling under the
noise floor, are the two causes.

---

## 4. The Studio

`/studio` — upload, then nine tabs, one per stage: **Original · Cleaned · OCR ·
Components · Layout boxes · IR · Prompt · Code · Preview**.

A generative pipeline fails in the middle far more often than at the end, and the
failure is usually invisible in the output: a wrong role three stages back
becomes a plausible-looking page that is subtly not the sketch. The tabs exist so
a bad result can be traced to the stage that caused it.

Two details worth knowing:

- **The Prompt tab is always populated**, whether or not the model was called.
  Inspecting what *would* be sent does not require reproducing the failure.
- **Preview and Code share one mapping** (`emit/classes.ts`). If they each had
  their own, the two tabs could disagree — and a debug UI whose tabs contradict
  each other is worse than none. The preview renders the component *tree*
  directly with React; it never evaluates generated source.

Each run also produces a report: per-pass timings, models used, confidences,
components emitted, build status and validation issues.

### Confidence is not fidelity

The Studio reports **confidences** — the pipeline's own estimate, computed
without ever seeing a correct answer. **Fidelity** is measured against ground
truth and comes only from the harness. They are different numbers and the UI
labels them as such; letting a self-assessment pass as a result would be the
easiest way to make this look better than it is.

---

## 5. Deliberately not built

Authentication · billing · teams · multi-page generation · sketch-to-3D ·
production scaling. All are in the architecture; none is in the slice.

Also absent, and worth naming because their absence changes how the numbers
should be read:

- **No rendered responsive test.** The responsive metric is a static lint (no
  fixed pixel widths, no unbreakpointed multi-column grids). A real test renders
  at each breakpoint in a browser.
- **No `tsc --noEmit` on generated output.** Validation is a parse check plus the
  lint. Since the emitter produces a dependency-free component from a closed set
  of shapes, a syntax error is the realistic failure mode — but "build success"
  here means "parses and lints", not "type-checks against a project".
- **No real-sketch corpus.** See above.

---

## 6. Known weaknesses

| Symptom | Cause | Where |
|---|---|---|
| ~18% of regions undetected | Adjacent regions merge under dilation; faint strokes fall below the noise floor | `geometry/detect.ts` |
| Heading and paragraph sometimes merge into one block | Vertical text merging uses a spacing window that cannot separate tight blocks | `mergeTextBlocks` |
| Solid-fill image placeholders need even lighting | The fill test reads uncorrected greyscale against a local paper level; illumination correction removes large uniform tone by design | `detect.ts`, interior fill |
| Grid inference weak on freehand drawings | Column fitting expects some regularity; a genuinely freehand sketch has none, and confidence correctly drops | `geometry/grid.ts` |

Each is reported honestly at run time rather than silently absorbed: low input
quality, weak grid signal and fallback to the offline classifier all surface as
warnings in the report.

---

## 7. Layout of the code

```
src/pipeline/
  ir/schema.ts              the contract — IR, classification, component tree
  geometry/preprocess.ts    illumination correction, adaptive threshold
  geometry/detect.ts        connected components, text merging, ink evidence
  geometry/grid.ts          base unit, grid fit, containment, reading order
  classify/heuristic.ts     offline role assignment from geometry
  classify/vision.ts        claude-opus-5, schema-constrained
  prompts/classify.ts       versioned prompt builder
  synthesize/deterministic.ts  IR → component tree, layout derived
  emit/classes.ts           the single node → markup mapping
  emit/tsx.ts               component tree → React source
  emit/runtime.tsx          component tree → live preview
  validate/check.ts         parse check and responsive lint
  fidelity/score.ts         IoU, Kendall τ, coverage
  run.ts                    orchestrator and run report

src/app/api/generate/       the endpoint
src/app/studio/             the debug UI
scripts/evaluate.ts         benchmark harness
test-dataset/generate.ts    synthetic corpus generator
```

The pipeline imports nothing from Next and runs under plain `node` (via native
type stripping), which is what lets the harness execute it 60 times without a
server.

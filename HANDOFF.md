# SKITE — project handoff

**Paste this whole file into a new Claude session to bring it fully up to speed.**

You are joining a final-year major project mid-flight. It has a report and a viva
attached, so *why* a decision was made matters as much as the code. Read this
before proposing anything.

---

## 0 · The one-paragraph version

SKITE turns hand-drawn wireframes, whiteboard photos and Figma exports into
production-ready websites **while preserving the drawn layout exactly**. The
pipeline is deliberately computer-vision-first and deterministic; a language
model is optional and confined to jobs that genuinely need one. Phase 1 (the
marketing site) and Phase 2 (the detection engine) are complete and frozen.
Phase 3 (semantic understanding) is complete except for text-dependent types.
Phase 4 (the design engine) has two slices: a deterministic design constraint
engine that generates tokens, and an emitter that consumes them.

Repository: `git@github.com:Abhiboss07/Skite.git` · branch `main`

---

## 1 · What exists today

### Tags

| Tag | What it froze |
|---|---|
| `v1.0-landing` | The marketing site: 19 pages, Lighthouse-audited |
| `v1.1-ui-polish` | Sticky header, compact nav menu, INR pricing |
| `v2.0-mvp-vertical-slice` | End-to-end pipeline: sketch → working React component |
| `v1.0-detection-engine` | **Detection frozen.** Detector unchanged since. |
| `v1.1-semantic-design` | Post-structure pruning, List/Divider, design constraint engine. F1 95.4 % |
| `v1.2-tokenised-emit` | Emitter consumes design tokens; appearance and layout separated in the output |
| `v1.3-type-calibration` | Type scale anchored to the drawing; visual regression check added |

### Stack

Next.js 16.2.12 (App Router, Turbopack), React 19.2.4, TypeScript strict,
Tailwind CSS v4, Motion, Lenis, three.js + React Three Fiber, Zod, sharp.
Node 26 with native TypeScript type stripping — the pipeline runs under plain
`node` with no build step, which is what lets benchmarks execute it 60+ times
without starting a server.

~6,600 lines of pipeline/AI/script code, 56 site components, 4 tags, 30+ commits.

### Layout

```
src/pipeline/          the engine — imports nothing from Next
  ir/schema.ts         detection IR contract (Zod)
  geometry/            preprocess · detect · grid          ← FROZEN
  classify/            heuristic (offline) · vision (model)
  semantic/            schema · classify                    ← Phase 3, new
  synthesize/          IR → component tree
  emit/                classes (shared mapping) · tsx · runtime
  validate/            parse check + responsive lint
  fidelity/            IoU, Kendall τ, precision/recall/F1
  run.ts               orchestrator

src/ai/                provider-agnostic model layer
  types.ts             AIProvider interface, capabilities, task types
  base.ts              shared machinery + task presets
  providers/           ollama · anthropic · gemini · openai-compatible
  registry.ts          resolution + health probes

src/app/
  studio/              11-tab pipeline inspector
  annotate/            ground-truth annotation tool
  evaluation/          benchmark dashboard
  api/generate         run the pipeline
  api/providers        model health
  api/annotations      save annotations (dev only)

scripts/               evaluate · iterate · report · analyse · semantic ·
                       design · visual-check · false-positives · ai-probe ·
                       ai-vision-test · qa-ui
docs/                  architecture/ (11 files) · DETECTION-ENGINE.md ·
                       MVP.md · PHASE-2-PLAN.md
test-dataset/          synthetic/ (60, gitignored, regenerable) · real/
reports/               real-test-report.html · iterations.json
```

### Current measured state

**Real wireframe** (`Test Images/website-wireframe-services.jpg`, 1024×1536):

| Metric | Value |
|---|---|
| F1 | **95.4 %** |
| Precision | 96.9 % |
| Recall | 93.9 % |
| Geometry (mean IoU) | 85.8 % |
| Reading order | 100 % |
| Layout fidelity | 90.6 % |
| Component accuracy | 87.1 % |
| False positives / negatives | 1 / 2 |
| Regions detected / annotated | 32 / 33 |
| Time | ~394 ms |

**Synthetic corpus** (60 samples): fidelity 86.9 %, F1 82.9 %, component accuracy
87.7 %, build success 100 %, median 259 ms.

---

## 2 · Architecture, and why it is this way

```
image → preprocess → detect → structure → classify → prune → IR → semantics
      → design → synthesise → emit → validate
        └──────────── deterministic CV, no model, ~400 ms ────────────┘
                                          ↑
                              optional vision model (Ollama / Claude / …)
```

**AI is not the first step, and not the main step.** Everything that can be
computed is computed. A model is used only where the output is genuinely
open-ended: reading handwriting, writing copy, judging a role. This is not
minimalism for its own sake — it is what makes the pipeline fast, deterministic,
benchmarkable, and demonstrable with the wifi unplugged.

### Four invariants — do not break these

1. **Detection never invents geometry.** Every box comes from measured ink.
2. **The classification schema has no coordinate field**, and sets
   `additionalProperties: false`. A model asked to label regions has no channel
   through which to move one. Layout preservation is enforced by the *shape of
   the data*, not requested in a prompt.
3. **Confidence is not fidelity.** The pipeline reports its own estimate,
   computed without ever seeing a correct answer. Fidelity requires ground truth
   and comes only from the benchmark harness. The UI labels them separately.
   Never conflate them.
4. **The pipeline runs with no model and no network.** A missing or failed model
   degrades quality; it never breaks a run.

### Decisions already settled — do not re-litigate

- **Code emission stays deterministic.** The emitter turns a validated tree into
  TSX — a total function over a closed set of shapes. A model there can drop a
  node or silently change a span, and each is a layout change. It is also why
  build success is 100 %.
- **Both corpora are kept.** Synthetic ground truth is exact and never changes,
  so it is the only thing that distinguishes a real regression from annotation
  noise. Real photographs are the only thing that says whether it works. They
  answer different questions.
- **Ollama is the default provider**, and the project defaults to it whether or
  not it is running. Failing with "Ollama is not reachable" beats silently
  reaching for a paid API nobody asked for.
- **Detection is frozen** at `v1.0-detection-engine`. Chasing another 1–2 % is
  explicitly out of scope. All new work happens after detection.

---

## 3 · What each phase delivered

### Phase 1 — marketing site ✅ `v1.0-landing`, `v1.1-ui-polish`

19 pages, dark/light themes, command palette, custom cursor, 3D hero via R3F.
Audited with Lighthouse and Playwright across 8 breakpoints. Fixed real defects:
CLS 0.312 → 0, LCP 4.5 s (34 SSR `opacity:0` elements replaced with CSS
keyframes), horizontal overflow, WCAG contrast failures, reduced-motion
violations, focus loss on dialog close.

Later polish: the header no longer hides on scroll (it now never moves — 0.00 px
drift at every viewport), the nav menu is a 416 px panel anchored to its trigger
rather than a full-width sheet, and pricing is in INR (₹2,499/mo, ₹1,999 annual)
with `en-IN` digit grouping.

### Phase 2 — architecture + MVP ✅ `v2.0-mvp-vertical-slice`

`docs/architecture/` (11 documents) designed the production system before any AI
code was written. The MVP then proved the whole pipeline end to end on one page:
upload → preprocess → detect → structure → classify → IR → synthesise → emit →
validate → live preview, in ~270 ms with no network call.

Studio at `/studio` shows every intermediate across 10 tabs. The Code tab and the
Preview tab share **one** node-to-markup mapping (`emit/classes.ts`) so they
cannot disagree; the preview renders the component *tree* with React and never
evaluates generated source.

### Phase 2A — provider-agnostic AI layer ✅

`AIProvider` interface with `generate`, `generateVision`, `generateCode`,
`generatePrompt`, `summarize`. Six providers, four implementations — OpenAI,
OpenRouter, Antigravity and any other OpenAI-compatible endpoint share one
adapter parameterised by base URL.

Verified live against Ollama: plain generation and schema-constrained JSON both
round-trip, the latter in 809 ms. Vision verified against `qwen2.5vl:3b`.

**The Claude, OpenAI and Gemini adapters have never made a real request** — there
are no API keys in this project. They are written against documented wire formats
and each file says so at the top.

### Phase 2B — evaluation infrastructure ✅

Annotation tool at `/annotate` (draw boxes, assign roles, save — containment is
derived by the same rule the pipeline uses). Metrics extended with precision,
recall, F1 and the confusion matrix. Dashboard at `/evaluation`. Iteration
tracker at `scripts/iterate.ts` with an improvement gate.

### Phase 2C — detection accuracy ✅ `v1.0-detection-engine`

F1 53.7 % → 88.6 % over two sprints, every change measured and gated.

| Change | F1 |
|---|---|
| Baseline | 53.7 % |
| Frame decomposition by projection profile | 59.8 % |
| Illustration fragment grouping | 69.8 % |
| Duplicate suppression + cut validation | 79.5 % |
| Glyph runs merged into words | **88.6 %** |

One change (a page-relative text-height rule) was **reverted** for costing more
recall than it gained. Full history in `reports/iterations.json`.

### Phase 3 — semantic layer ✅ except text-dependent types

`src/pipeline/semantic/` turns regions into meaning: Navigation, Hero, Section,
Footer, Grid, Gallery, Card, Form, Logo, Heading, Subheading, Label, Paragraph,
Image, Icon, Button, CTAButton, Input.

Rule-based and deterministic — no model. Every assignment records the rule that
fired (`text.display`, `group.gallery`, `control.cta`) plus a plain-English
reason. The IR preserves hierarchy, reading order, direction, columns, span,
measured gap, alignment and width ratio. Inferred grouping nodes carry
`source: null` so a reader can tell which nodes correspond to ink.

Text-dependent types (PricingCard, Testimonial, FAQItem, Stat, FeatureItem) are
returned in an `undecidable` list rather than guessed — they are the same
rectangle as an ordinary card until you read them.

`List` and `Divider` now emit. A List forms from a run of repeated text items —
navigation links, captions — where a Gallery forms from pictures and a Grid from
a mix. Divider is deliberately narrow, because in a wireframe a drawn line *is*
the convention for a line of text: the test is single-line, at most half the
page's median text height, aspect ≥ 20:1.

A **structural pruning pass** (`src/pipeline/prune/`) removes regions that are
real ink but not separate components — a control's caption, and fragments inside
a densely-inked graphic. It runs after structure because both rules need the
containment tree, and detection is frozen. F1 88.6 % → 95.4 %, precision
83.8 % → 96.9 %, recall unchanged.

Visualised in the Studio's **Semantic** tab: colour-coded overlay beside the tree.

---

## 4 · What remains

### Phase 3, second half — finish semantics

- [ ] **Independent annotation of the real corpus.** See §5; this gates every
      number in this document.
- [ ] **Semantic accuracy metrics.** There is currently no benchmark for semantic
      *type* correctness — only detection metrics. Ground truth would need a
      semantic type per region, which the annotation tool does not yet capture.
- [ ] **Post-structure pruning pass** for the 6 remaining false positives
      (3 control labels, 3 map fragments). Both need the containment tree, which
      detection does not have — so this belongs *after* structure, not inside the
      frozen detector.
- [ ] **Text-dependent types**, once OCR runs: PricingCard, Testimonial, FAQItem,
      Stat, FeatureItem.
- [ ] **List and Divider** types are declared in the schema but no rule emits
      them yet.

### Phase 4 — design engine 🟡 first slice done

- [x] **Design constraint engine** (`src/pipeline/design/`). Palette, type scale,
      spacing rhythm, radius, shadow, motion — deterministic, no model.
- [x] **Colours the author drew are preserved.** Hue is kept; only lightness
      moves, until contrast clears 4.5:1. Monochrome input gets a restrained
      default that is reported as a default.
- [x] **Layout drift verification.** `DesignTokensSchema` has no positional
      field, so the pass cannot express a layout change; `verifyNoDrift` then
      confirms it did not make one. Asserts 100.00%, does not tolerate a
      threshold. Currently no drift across 36 nodes.
- [x] Studio **Design** tab with swatches, type ladder, spacing ladder and the
      drift verdict.
- [x] **The emitter consumes the tokens.** `emit/classes.ts` is still the single
      mapping; `className` now carries layout only and `style` carries appearance
      only, every value a `var(--sk-*)` reference with a fallback. The generated
      page hoists its tokens into a `designTokens` constant and needs no
      stylesheet, config or build step.
- [x] **Type is calibrated against the drawing.** The step is chosen relative to
      the page's median line height, in synthesis; `baseSize` is anchored to the
      measured text ink height, clamped to 0.875–1.25rem because a drawing fixes
      proportions rather than absolute type size. Headings wrapping onto two
      lines went 5 → 1, and the remaining one is a heading in a 271px column.
- [ ] Generate missing assets — icons, illustrations, placeholder images.
- [ ] Rendered-geometry fidelity gate: score the *rendered* page against the IR,
      not just IR against IR.
- [ ] Optional model pass for stylistic judgment, on top of the deterministic
      version rather than replacing it.

### Deferred, with reasons

- **Multi-page generation** — one page is not solved well enough yet.
- **Sketch-to-3D** — a separate idea; keep it as an "Experimental AI Lab" bonus,
  not mixed into the main pipeline.
- **Auth, billing, teams, production scaling** — designed in
  `docs/architecture/`, deliberately unbuilt.
- **Perspective rectification** — needed for photographs taken at an angle.
- **Multi-scale merging, confidence pruning, parent-child checks** — proposed for
  Sprint 2 but *not implemented*, because none of the enumerated false positives
  had those causes. Adding them would have been untested code.

---

## 5 · Honest limitations — state these, do not paper over them

**The headline numbers carry an annotation bias.** The ground truth for the real
image was annotated by the same author (Claude) that wrote the detector. An
annotator who knows how a detector segments will, without intending to, draw
boxes that agree with it. **88.6 % should not be quoted as a real-world result
until an independent annotation exists.**

**One real image.** Every threshold — IoU 0.78, 12 % minimum column, 0.15 glyph
density, 1.6 aspect ratio, 55 % separator contiguity — is tuned against a single
vector wireframe. Whether they generalise to notebook sketches, whiteboard
photographs and mobile wireframes is **untested**. The planned benchmark is
5 Figma exports + 5 notebook sketches + 5 whiteboard photos + 5 mobile
wireframes, annotated by the project owner.

**Synthetic numbers are an upper bound.** Ground truth is exact because the
generator placed every element. The generator also has known blind spots: it
draws sections as detached rectangles with clean gaps, and never draws display
type or halftone illustrations. All three broke the detector in ways no synthetic
sample reproduced.

**No OCR on the offline path.** The heuristic classifier reports empty text at
zero confidence rather than inventing plausible copy.

**Grid inference is weak on freehand layouts** — it fitted 12 columns at 39 %
confidence on a 1–2 column page. The pipeline reports the low confidence rather
than presenting a guess as a measurement.

**Local vision is slow.** A descriptive `qwen2.5vl:3b` call takes ~17 s against
~400 ms for the entire deterministic pipeline — roughly 60× the cost of
everything else combined. This is the argument for keeping vision optional and
post-IR.

**"HEADLINE" types as Paragraph** in the semantic tree — the frozen detector
merges it with the line beneath into one text block. Inherited, not introduced.

---

## 6 · Environment

- **Hardware**: RTX 4050 Laptop, **6 GB VRAM**, 15 GB RAM, i5-13420H, 313 GB free.
- **Ollama** 0.32.1 on `:11434`. The `ollama` CLI is **not on PATH** — use the
  HTTP API. Installed: `qwen2.5:3b-instruct` (1.9 GB), `qwen2.5vl:3b` (3.2 GB).
- **No API keys.** No Claude, OpenAI or Gemini access.
- 6 GB VRAM rules out `llama3.3` (70 B, ~43 GB) and 32 B coder models. Do not
  suggest them.
- Playwright is **not** a dependency — install with `--no-save` when needed. A
  cached Chromium lives at
  `~/.cache/ms-playwright/chromium_headless_shell-1228/`.

---

## 7 · Working agreement

**Look at it.** A build that compiles and a validator that passes say nothing
about whether a page renders — both were green while the generated component
painted as unstyled text on a blank background. Run
`node scripts/visual-check.ts "<image>" --label after --compare before` for any
change that touches appearance, and open the comparison.

**Measure, then change.** Every detector or semantic change must be run through
`node scripts/iterate.ts "label"`, which scores both corpora and applies the
gate. Commit only what improves. Two rules learned the hard way:

- **Compare against the best result so far, not the previous one.** A previous
  row can itself be a regression.
- **Gate on the count of correctly classified regions, not the accuracy ratio.**
  A ratio over "regions we managed to find" has a moving denominator: a change
  that finds seven new regions and gets five right *lowers* the average while
  strictly improving the system. That nearly reverted the single largest gain in
  the project.
- **Confirm an edit actually applied before trusting its measurement.** Two
  iterations once reported "no material change" while measuring unchanged code,
  because a string replacement silently failed to match. A no-op reads exactly
  like a neutral result.

**Enumerate before optimising.** Before Sprint 2, all 23 false positives were
listed and characterised; that changed the plan and discarded three proposed
techniques that addressed causes not present in the data.

**Say what is not true.** Unverified adapters say so at the top of the file.
Undecidable semantic types are listed rather than guessed. Reverted changes stay
in the commit history with their numbers. This is a project whose credibility
rests on the honesty of its measurements.

---

## 8 · Commands

```bash
npm run dev                                   # site + Studio at :3000
npm run build && npm start                    # production
npm run dataset                               # regenerate 60 synthetic samples
npm run evaluate                              # synthetic benchmark
node scripts/iterate.ts "label"               # both corpora + improvement gate
node scripts/report.ts "Test Images/<file>"   # full HTML analysis report
node scripts/analyse.ts "Test Images/<file>"  # stage-by-stage console output
node scripts/semantic.ts "Test Images/<file>" # semantic tree
node scripts/false-positives.ts "<file>"      # enumerate and characterise FPs
node scripts/ai-probe.ts                      # provider health + live test
node scripts/visual-check.ts "<image>" --label after --compare before
                                              # render, count wrapped headings,
                                              # write a 3-panel comparison
```

Surfaces: `/studio` (10-tab inspector) · `/annotate` (ground truth) ·
`/evaluation` (benchmark dashboard).

---

## 9 · Suggested next prompt

> I've read HANDOFF.md. Continue with **[Phase 3 completion | Phase 4 AI design
> engine]**.
>
> Before writing code: confirm the current metrics by running
> `node scripts/iterate.ts "session start"`, and tell me if anything has drifted
> from what HANDOFF.md claims.
>
> Detection is frozen — do not modify `src/pipeline/geometry/`. Measure every
> change against both corpora and commit only what improves.

---

*Last updated after the design constraint engine landed. Verify with
`node scripts/iterate.ts "session start"` before trusting any number here.*

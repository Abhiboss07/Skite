# Detection Engine v1.0

**Frozen.** This document describes the detection half of SKITE as it stands at
tag `v1.0-detection-engine`. Everything from here on builds on top of it rather
than inside it.

Detection turns an image into a validated set of geometric regions with roles,
a containment hierarchy and a reading order. It does not decide what those
regions *mean* — that is Phase 3.

---

## 1 · Pipeline

```
image
  │
  ├─ 1 preprocess ──── illumination correction → adaptive threshold → binary mask
  │                    outputs: mask, quality signal, paper level
  │
  ├─ 2 detect ──────── dilate → connected components → frame decomposition
  │                    → glyph runs → text runs → text blocks
  │                    → fragment grouping → duplicate suppression
  │                    outputs: regions with primitive type and ink evidence
  │
  ├─ 3 structure ───── base unit → grid fit → containment tree → reading order
  │                    outputs: nodes with parent, children, order, grid span
  │
  └─ 4 classify ────── role per region (heuristic, or vision model)
                       outputs: role + confidence, optional text
                                     │
                                     ▼
                            validated IR (Zod)
```

Total ~400 ms on a 1024×1536 image, entirely on CPU, with no model and no
network. Timings from the real-world benchmark: preprocess 303 ms, detect 54 ms,
structure 1 ms, classify 1 ms.

The whole engine imports nothing from Next and runs under plain `node` via
native type stripping, which is what lets the benchmark execute it 60+ times
without a server.

---

## 2 · Algorithms

### 2.1 Illumination correction

A heavy blur approximates the lighting field — shadows and glare are low
frequency, ink is high frequency — and is **subtracted**, not divided.

Division is the textbook flat-field correction and it fails here: where the
background is dark, a one-count step in the source becomes a large step in the
ratio, so 8-bit banding amplifies into stripes that threshold as ink.
Subtraction keeps noise amplitude constant across the frame.

**The blur is hand-written**, a three-pass separable box blur. `sharp.blur()`
does not do what this code needs on a raw single-channel buffer: measured on a
synthetic 400×200 field with a 30 px bar, `blur(12)` returned a flat field with
the bar erased, and `blur(35)` returned a monotonic gradient rather than
anything centred on the bar. Both the illumination estimate and the local mean
were wrong, which is why solid light-grey fills — how vector tools draw text —
thresholded to nothing.

### 2.2 Adaptive threshold with a measured noise floor

Each pixel is compared against its own neighbourhood mean. How far below it must
sit is **not a constant** — it depends on how noisy this image is.

Deviation from the local mean is dominated by noise almost everywhere, because
ink is a small fraction of pixels. The median absolute deviation of that
quantity — which ink outliers cannot drag upward the way a standard deviation
would — gives the noise level directly, and the threshold sits a few multiples
above it:

```
sigma = 1.4826 × MAD
bias  = clamp(sigma × 4, 14, 70)
ink   = normalised < localMean − bias
```

A fixed bias tuned for a clean scan turns every step of JPEG banding on a
photographed whiteboard into ink.

### 2.3 Frame decomposition by projection profile

**The single highest-value algorithm in the engine.** A wireframe drawn as an
outer border with full-width dividers is *one connected component*: the rules
touch the border, so labelling returns the entire page skeleton as one blob and
every section inside it is lost.

Large hollow components are therefore cut where they are ruled. Rows that are
almost entirely ink are horizontal separators; the bands between them are
sections; each band is cut vertically the same way, recovering side-by-side
cards. Two validation rules make it safe:

- **Contiguity.** A separator must be one unbroken line. Total ink is not
  enough: three image placeholders side by side share a top edge, and together
  those edges cover most of a band. A drawn rule is continuous; a coincidence of
  aligned edges is not. Required: longest unbroken run ≥ 55 % of the span.
- **Minimum column width.** A column narrower than 12 % of the frame is the
  margin between border and content, not a column of the layout.

Runs thicker than a line are excluded, so a solid header band is never mistaken
for a separator. The frame itself is dropped — a page outline is not a region
anyone annotates.

### 2.4 Glyph runs

Letters do not touch, so labelling returns one region per letter — eight regions
for the word "HEADLINE", each of which classified as an image placeholder,
because a solid glyph has a solid middle.

Adjacent components are merged into a word **before** the primitive is assigned.
Two conditions separate a word from two neighbouring boxes:

- **Density.** A glyph is solid (fill ratio ≥ 0.15); a drawn box is an outline
  around emptiness (a few per cent).
- **Aspect.** A glyph is roughly as tall as it is wide (w ≤ 1.6 h); an image
  placeholder is not.

Plus same height (±35 %), a shared baseline (>60 % vertical overlap) and a gap
under half the glyph height.

An earlier attempt solved this by adding an interior-ink test to the *primitive
rule* instead. It was reverted: the same test reached into decisions about large
regions, retyped whole sections as text, and the merging passes then dissolved
them. Merging first and classifying afterwards leaves the primitive rule alone.

### 2.5 Fragment grouping

A halftone map is not connected ink — it is dozens of disconnected strokes, and
labelling faithfully returns dozens of regions where a person sees one picture.
Raising the dilation radius is not available: it was reduced to one pass
precisely because a larger one merged adjacent cards.

So grouping happens on **regions**, after text merging, for clusters that are
small, close, and sparse within their own bounding box. The discriminator
against swallowing a paragraph is **regularity, measured directly**: lines of
text have near-identical heights (spread < 35 %) and tightly aligned left edges;
illustration pieces vary in size and sit at arbitrary offsets.

The first version of this excluded text primitives to protect paragraphs, and
grouped nothing at all — map strokes are thin, so nearly all of them type as
text, and the guard removed exactly what it was meant to collect.

### 2.6 Duplicate suppression

Frame decomposition and component labelling can describe the same rectangle.
Non-maximum suppression by overlap at IoU ≥ 0.78, keeping whichever carries more
interior evidence, then the smaller box.

By overlap, not containment: a card genuinely contains its heading and their IoU
is low, so nesting survives. At IoU 0.65 this cost 3 points of recall by
discarding the better member of some pairs.

### 2.7 Grid and reading order

Base unit by search over u ∈ [2,24] minimising modular error. Grid by candidate
search over columns × gutters with a complexity penalty. Containment by
smallest-containing-box. Reading order by **row banding**, not by a comparator.

The obvious implementation — sort with a comparator returning x-order for nodes
"on the same row" and y-order otherwise — is wrong and quietly so: that
predicate is not transitive, so it is not a valid total order and `Array.sort`
returns an arbitrary permutation. A tall hero sorted above the navbar. Banding
groups siblings into rows first, then reads each row left to right.

### 2.8 Role classification

Rules over geometry, nesting and ink evidence: image (interior ink or interior
fill with no children), button (small enclosed shape), navbar (top, wide,
short), footer (bottom, wide), grid, card (repeated sibling), hero (large upper
container with children), heading/paragraph (by line count and relative height).

A vision path exists behind the same interface (`classify/vision.ts`) and is
optional. The offline path is the default and the baseline the model must beat.

---

## 3 · Benchmark methodology

Two corpora, kept deliberately separate.

| | Synthetic | Real |
|---|---|---|
| Size | 60 | 1 annotated so far |
| Ground truth | Exact — the generator placed every element | Hand-annotated |
| Purpose | Regression signal | Does it actually work |
| Answers | "Did this change make things worse?" | "How good is it?" |

Neither replaces the other. Synthetic ground truth is exact and never changes,
which is the only way to tell a two-point regression from annotation noise. Real
photographs are the only thing that says whether the system works.

**Ground truth is loaded only after the pipeline has run** and is never passed
into it. Coordinates are stored in a 1440-wide canvas space, not source pixels;
both sides are normalised to canvas fractions before comparison, so an
annotation made on a 4032 px phone photo and one on an 800 px scan mean the same
thing.

Annotation is done at `/annotate`, which derives the containment hierarchy by
the same smallest-containing-box rule the pipeline uses — so labels and the
thing being measured agree on what nesting means.

### Iteration protocol

Every change is measured against both corpora, appended to
`reports/iterations.json`, and kept only if it improves. Two rules were learned
the hard way and are now enforced:

- **Compare against the best result so far, not the previous one.** At iteration
  7 the previous row was itself a regression, so a result well below the
  project's best F1 was reported as an improvement.
- **Gate on the count of correctly classified regions, not the accuracy ratio.**
  A ratio over "regions we managed to find" has a moving denominator: a change
  that finds seven regions nothing had found before and gets five right *lowers*
  the average while strictly improving the system. That nearly reverted the
  single largest gain in the project.

---

## 4 · Metrics

| Metric | Definition |
|---|---|
| **Layout fidelity** | `0.6·geometry + 0.25·order + 0.15·coverage` |
| Geometry | Mean IoU over matched regions, both normalised to canvas fractions |
| Reading order | Normalised Kendall τ over matched regions only |
| Coverage | Share of ground-truth regions matched at IoU > 0.3 |
| **Precision** | matched / detected |
| **Recall** | matched / annotated — *arithmetically identical to coverage* |
| **F1** | Harmonic mean of precision and recall |
| Component accuracy | Share of *matched* regions given the correct role |
| Build success | Generated code parses and passes the responsive lint |

Two deliberate choices: `grid` and `card` score as the same role, because they
describe the same drawn rectangle at different levels of interpretation; and
order is scored over matched regions only, because a region never detected
cannot be mis-ordered and would otherwise be penalised twice.

### Results at freeze

**Real wireframe** (1024×1536 vector services page):

| | Sprint 1 start | v1.0 |
|---|---|---|
| Precision | 44.9 % | **83.8 %** |
| Recall | 66.7 % | **93.9 %** |
| F1 | 53.7 % | **88.6 %** |
| Geometry (IoU) | 83.8 % | 85.8 % |
| Layout fidelity | 85.3 % | 90.6 % |
| Component accuracy | 81.8 % | 87.1 % |
| False positives | 27 | **6** |
| False negatives | 11 | **2** |

**Synthetic corpus** (60 samples): fidelity 86.9 %, F1 82.3 %, component accuracy
87.7 %, build success 100 %, median 265 ms. Essentially unchanged across all of
Phase 2C — every detector change was gated on not regressing it.

---

## 5 · Known limitations

**The headline numbers carry an annotation bias.** The ground truth for the real
image was annotated by the same author who wrote the detector. An annotator who
knows how a detector segments will, without intending to, draw boxes that agree
with it. Independent annotation is required before 88.6 % should be quoted.

**One real image.** Every threshold — IoU 0.78, 12 % column, 0.15 density, 1.6
aspect, 55 % contiguity — is tuned against a single vector wireframe. Whether
they generalise to notebook sketches, whiteboard photographs and mobile
wireframes is untested.

**Six false positives remain, of two kinds**, both needing the containment tree
that detection does not have:
- three control labels — the text inside a button, where ground truth annotates
  the button alone;
- three map fragments that density grouping did not claim.

Both belong in a pruning pass that runs after structure.

**No perspective rectification.** A wireframe photographed at an angle is
processed as though it were flat. The homography is straightforward once page
corners are found; neither is implemented.

**No OCR offline.** The heuristic path reads no text and reports empty content
at zero confidence rather than inventing plausible copy. Roles that depend on
what a region *says* — pricing card, testimonial, FAQ — are therefore not
decidable without the vision path.

**Grid inference is weak on freehand layouts.** Fitted 12 columns at 39 %
confidence on a 1–2 column page. The pipeline reports the low confidence rather
than presenting the guess as a measurement, but the fit is wrong.

**Synthetic generator blind spots.** It draws sections as detached rectangles
with clean gaps and never draws display type or halftone illustrations. All
three broke the detector in ways no synthetic sample reproduced.

---

## 6 · Architecture

```
src/pipeline/
  ir/schema.ts              the contract — IR, classification, component tree
  geometry/preprocess.ts    box blur, illumination correction, adaptive threshold
  geometry/detect.ts        components, frame decomposition, merging, suppression
  geometry/grid.ts          base unit, grid fit, containment, reading order
  classify/heuristic.ts     offline role assignment from geometry
  classify/vision.ts        model path, same interface
  prompts/classify.ts       versioned prompt builder
  fidelity/score.ts         IoU, Kendall τ, precision/recall/F1
  run.ts                    orchestrator and run report

scripts/
  evaluate.ts               synthetic corpus benchmark
  iterate.ts                iteration tracker with the improvement gate
  report.ts                 single-image HTML analysis report
  analyse.ts                stage-by-stage console analysis
  false-positives.ts        enumerates and characterises FPs
```

### Invariants

1. **Detection never invents geometry.** Every box comes from measured ink.
2. **The classification schema has no coordinate field**, and sets
   `additionalProperties: false`. A model asked to label regions has no channel
   through which to move one.
3. **Confidence is not fidelity.** The pipeline reports its own estimate,
   computed without ever seeing a correct answer. Fidelity requires ground truth
   and comes only from the harness. The UI labels them separately.
4. **The pipeline runs with no model and no network.** A missing or failed model
   degrades quality; it never breaks a run.

---

## 7 · Reproducing

```bash
npm run dataset                                   # regenerate the synthetic corpus
npm run evaluate                                  # 60-sample benchmark
node scripts/iterate.ts "label"                   # both corpora + improvement gate
node scripts/report.ts "Test Images/<file>"       # full HTML report
node scripts/false-positives.ts "Test Images/<file>"
```

Dashboards: `/evaluation` for corpus results, `/studio` for a single run,
`/annotate` to add ground truth.

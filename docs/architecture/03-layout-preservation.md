# 03 — Layout preservation

How a photograph of ink becomes the IR, and how we prove the result matches.

---

## 1. The algorithm

```
  photograph (4032×3024, angled, glare, shadow)
        │
   ┌────▼──────────────────────────────────────────────┐
   │ 1  RECTIFY                        deterministic   │
   │    a. board/page corner detection                 │
   │    b. homography → flatten                        │
   │    c. illumination field estimate → divide out    │
   │    d. adaptive binarisation → stroke mask         │
   └────┬──────────────────────────────────────────────┘
        │ clean binary strokes, axis-aligned
   ┌────▼──────────────────────────────────────────────┐
   │ 2  DETECT                         deterministic   │
   │    a. line segment detection (LSD)                │
   │    b. segment → rectangle assembly                │
   │    c. text-run detection (stroke density)         │
   │    d. arrow detection (shaft + head)              │
   └────┬──────────────────────────────────────────────┘
        │ primitives with exact coordinates
   ┌────▼──────────────────────────────────────────────┐
   │ 3  GRID                           deterministic   │
   │    a. 1-D clustering of edge x/y → column/row     │
   │    b. gutter detection → column count             │
   │    c. base-unit inference → spacing quantisation  │
   │    d. snap boxes to grid within tolerance         │
   │    e. containment → tree; reading order           │
   └────┬──────────────────────────────────────────────┘
        │ ⭐ GEOMETRY IS NOW FROZEN
   ┌────▼──────────────────────────────────────────────┐
   │ 4  LABEL                          vision model    │
   │    numbered-overlay image + geometry JSON in      │
   │    role assignments out (no coordinates in schema)│
   └────┬──────────────────────────────────────────────┘
   ┌────▼──────────────────────────────────────────────┐
   │ 5  INTENT                         model           │
   │    handwriting → labels; arrows → flows;          │
   │    margin notes → annotations (as data)           │
   └────┬──────────────────────────────────────────────┘
        │
        ▼   IR
```

---

## 2. Rectify — the pass nobody sees

Every impressive demo in this space uses a flat, clean, well-lit drawing. Every
real input is a photograph taken standing up, at an angle, under ceiling lights.
The quality ceiling of the entire pipeline is set here.

| Problem | Approach | Limit |
| --- | --- | --- |
| Perspective | Detect the board/page quadrilateral, compute homography, warp | Beyond ~40° the far edge has too few pixels to recover; reject with a clear message rather than produce a bad IR |
| Glare / uneven light | Estimate the illumination field (large-kernel morphological opening), divide it out, then binarise adaptively (Sauvola) | Specular blowout where the sensor clipped is unrecoverable — no algorithm restores clipped white |
| Shadow of the photographer | Same illumination-field division | Handled as a low-frequency component |
| Ghost strokes on a whiteboard (last meeting's diagram) | Stroke-age estimate from edge sharpness + saturation; down-weight, do not delete | v2. Deleting is dangerous; weighting is recoverable |

**Why classical CV rather than a model.** These are well-posed problems with
exact solutions. A homography is linear algebra. Asking a VLM to "fix the
perspective" costs a model call, produces something unverifiable, and cannot be
unit-tested. Deterministic passes can be tested against fixtures with expected
outputs — and they are, in `packages/geometry`.

---

## 3. Detect and grid — where fidelity is actually won

### Column inference

Collect the x-coordinate of every vertical edge in the drawing. Real layouts —
even hand-drawn ones — produce **clusters**, because the author aligned things by
eye. Kernel-density estimation over that 1-D distribution gives peaks; the peaks
are column boundaries.

```
edge x-coords:  64 · 66 · 63 │ 412 · 415 │ 760 · 758 · 761 │ 1376 · 1374
                └── margin ──┘└─ col 4 ──┘└──── col 8 ─────┘└── margin ──┘
KDE peaks:         65             413          760              1375
inferred:       12 columns, 24px gutter, 64px margin
```

The modal distance between adjacent peaks, divided into the content width, gives
the column count. This is why the output looks like it was designed on a grid:
**because the author drew on one, approximately, and we recovered it exactly.**

### Base-unit inference

Take all measured gaps, and find the value `u` that minimises total rounding
error when every gap is expressed as a multiple of `u`, searching `u ∈ [2, 16]`.
Real drawings land on 4 or 8 overwhelmingly. Gaps are then snapped to multiples.

The effect is larger than it sounds. Unquantised, a hand drawing yields ~40
distinct spacing values and the output reads as machine-generated. Quantised, it
yields 5 or 6 and reads as deliberate.

### Snapping, and when to refuse

Boxes snap to the inferred grid within a tolerance proportional to stroke width.
Beyond tolerance, the node keeps its measured box and its `grid` field is null —
it becomes free-flowing rather than being forced into a grid it does not belong
to.

**If fewer than ~60% of nodes snap, the drawing has no grid.** This is a real
case: genuinely freehand sketches, circular layouts, mind maps. The correct
behaviour is to record low `canvas.grid.confidence`, emit flow layout instead of
grid layout, and *surface the lower confidence to the user*. Silently guessing a
grid that is not there is the failure mode most likely to produce confidently
wrong output.

---

## 4. Label — constraining the model

The vision model receives:

1. The rectified image with **numbered overlays** drawn on each detected region.
2. The geometry JSON — every region's id, box, and parent.

It returns role assignments keyed by region id.

```jsonc
// output_config.format schema — note what is absent
{
  "type": "object",
  "properties": {
    "regions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":         { "type": "string" },
          "role":       { "type": "string", "enum": ["nav", "hero", "card", "cardGrid",
                                                     "form", "field", "button", "media",
                                                     "heading", "body", "list", "footer",
                                                     "sidebar", "logo", "icon", "divider"] },
          "confidence": { "type": "number" },
          "order":      { "type": "integer" }
        },
        "required": ["id", "role", "confidence", "order"],
        "additionalProperties": false
      }
    }
  },
  "required": ["regions"],
  "additionalProperties": false
}
```

**There is no coordinate field.** `additionalProperties: false` means there
cannot be one. A model inclined to improve the layout has no channel through
which to express it. This is the structural enforcement referred to throughout —
"the model cannot move the boxes" is a fact about the schema, not a hope about
the prompt.

The numbered-overlay trick also converts an open-ended vision problem
("understand this interface") into a closed classification problem ("assign one
of 16 labels to each of 23 numbered boxes"), which is dramatically more reliable
and far cheaper in output tokens.

---

## 5. Responsive derivation — rules, not inference

The sketch is one breakpoint. Additional breakpoints are produced by
**deterministic transformation of the IR**, not by asking a model.

| Desktop IR | ≤ `md` transformation |
| --- | --- |
| `distribute(horizontal)` over *n* children | stack vertically, preserve `order` |
| `spanCols(1..3)` sidebar + `spanCols(4..13)` main | main first in flow, sidebar becomes a drawer |
| horizontal `nav` with > 4 items | collapse to a menu trigger |
| `aspect` media | preserved — never crop |
| `grid-cols-4` card grid | `grid-cols-2` at `md`, `grid-cols-1` at `sm` |

**Why rules.** The desktop layout is a specification; the mobile layout is a
*consequence* of it. There is no additional information in the sketch about
mobile, so a model asked to produce it would be inventing — and inventing is the
thing this system exists not to do. Rules are also inspectable, testable, and
overridable per project.

Where a rule genuinely cannot decide (a complex dashboard with no obvious
linearisation), the IR records `responsive.ambiguous: true` and the UI asks,
rather than picking silently.

---

## 6. What "fidelity" actually means

The marketing site claims 94% layout fidelity. That number has to be defined, or
it is marketing rather than engineering.

**Definition.** Render the generated page headless at the IR's breakpoint.
Extract the real bounding box of every element that maps to an IR node. Compute:

```
                Σ  IoU(node.box, rendered.box)
  geometry  =  ───────────────────────────────      over matched nodes
                        |matched|

  order     =  normalised Kendall τ between IR reading order
               and the rendered DOM order

  coverage  =  |matched| / |ir.nodes|               unmatched = dropped content

  FIDELITY  =  0.6 · geometry  +  0.25 · order  +  0.15 · coverage
```

Weighted that way because a page whose boxes are right but whose reading order is
wrong is *less* useful than the reverse — it looks correct and is inaccessible,
which is the more damaging failure.

**This is computed on every single job, not only in evaluation.** It is the gate
in pass 7:

| Score | Action |
| --- | --- |
| ≥ 0.90 | Ship |
| 0.75 – 0.90 | Repair the worst-scoring subtrees (≤ 2 attempts), then re-measure |
| < 0.75 | **Fail the job.** Return diagnostics and the IR. Never ship output we can measure as wrong. |

Failing is a deliberate product decision. Returning a plausible-looking page that
does not match the sketch destroys the only claim the product makes.

### The evaluation corpus

`eval/corpus/` holds hand-drawn wireframes with **human-reconstructed ground
truth** — a designer building the intended layout by hand, independently. The
published fidelity figure is the mean over that corpus. The harness runs in CI;
a release that regresses fidelity fails the build.

Honest caveats, which belong in the report:

- The corpus is the benchmark's ceiling. If it under-represents freehand
  circular layouts, the number overstates real-world performance on those.
- IoU rewards getting big boxes approximately right more than small ones exactly
  right. It is the right metric for layout, and it is not a complete one.
- Ground truth is one human's reconstruction. Two designers given the same sketch
  will not produce identical layouts, so there is an inherent ceiling below 1.0.
  Measuring inter-annotator agreement on a subset would quantify it — worth doing
  before quoting the number publicly.

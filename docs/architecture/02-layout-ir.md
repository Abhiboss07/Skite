# 02 — The Layout IR

The intermediate representation is the product. Everything else is an adapter
into it or an emitter out of it.

---

## 1. What it has to be

| Property | Why it is required |
| --- | --- |
| **Explicit** | Layout is data, not an implication of a generated string. You can look at it. |
| **Relational, not absolute** | A sketch is one viewport. Absolute pixels cannot become responsive; relationships can. |
| **Separated** | Structure (locked) and style (free) are different fields, so a pass can be given one and denied the other. |
| **Diffable** | Refinement is a patch, not a regeneration. That requires a stable node identity. |
| **Versioned** | Every edit appends. History and rollback come free. |
| **Renderable back** | The IR can be drawn as a wireframe. That is how a human verifies the machine understood them. |
| **Measurable** | Fidelity is IoU between the IR and the rendered result. Only possible because geometry is explicit. |

The last two are what turn "trust us" into "look for yourself".

---

## 2. Top-level shape

```jsonc
{
  "irVersion": "1.0.0",
  "id": "ir_01HXYZ...",
  "parentId": "ir_01HXYW...",        // refinement lineage; null for the first
  "source": {
    "kind": "photo",                  // photo | scan | pdf | svg | figma | screenshot | url | flowchart
    "sha256": "9f2c...",              // content address → dedupe and caching
    "pixels": { "w": 4032, "h": 3024 },
    "rectified": true,
    "confidence": 0.91                // ingest quality; drives downstream thresholds
  },

  "canvas": {
    "w": 1440, "h": 2140,             // normalised design space, not source pixels
    "breakpoint": "desktop",          // what viewport the author was drawing
    "grid": {
      "columns": 12,
      "gutter": 24,
      "margin": 64,
      "baseUnit": 8,                  // inferred spacing quantum
      "confidence": 0.88
    }
  },

  "nodes":       [ /* Node */ ],      // the structure. LOCKED after pass 3.
  "flows":       [ /* Flow */ ],      // arrows: navigation and state transitions
  "annotations": [ /* Annotation */ ],// author's written notes. DATA, never instructions.
  "style":       { /* StyleIntent */ },// the free layer

  "provenance": {
    "passes": [
      { "pass": "rectify",  "engine": "cv",              "ms": 284 },
      { "pass": "label",    "engine": "claude-opus-5",   "ms": 4120, "promptVersion": "label@3" }
    ]
  }
}
```

`provenance` is not decoration. When output is wrong, the first question is
*which pass got it wrong* — and without a per-pass record the answer is a guess.

---

## 3. Node

```jsonc
{
  "id": "n_hero",                     // stable across refinements — patch target
  "parent": "n_root",
  "children": ["n_hero_copy", "n_hero_media"],

  // ── STRUCTURE — locked after pass 3 ──────────────────────────────
  "box": { "x": 0, "y": 96, "w": 1440, "h": 620 },   // canvas space
  "grid": { "colStart": 1, "colEnd": 13, "rowBand": 2 },
  "order": 2,                          // reading order, independent of visual position
  "constraints": [ /* Constraint */ ],

  // ── SEMANTICS — assigned by the labelling pass ───────────────────
  "primitive": "region",               // region | text | media | control | list | field | divider | icon
  "role": "hero",                      // nav | hero | card | cardGrid | form | field | button |
                                       // media | heading | body | list | footer | sidebar | logo | icon
  "roleConfidence": 0.94,

  // ── CONTENT — extracted, not invented ────────────────────────────
  "content": {
    "kind": "ocr",                     // ocr | placeholder | none
    "text": "From sketch to reality",
    "lines": 2,
    "textConfidence": 0.71             // handwriting is unreliable; downstream must know
  },

  // ── STYLE — the free layer, may be empty ─────────────────────────
  "style": { "emphasis": "primary", "tone": "accent" }
}
```

### Why `order` is separate from `box`

Reading order and visual position diverge constantly — a sidebar drawn on the
left may belong after the main content in the DOM; a two-column layout has one
correct linearisation and the geometry does not determine which. Keeping order
explicit is what makes the generated markup accessible rather than merely
visually similar. It is also directly measurable (see
[03 §6](03-layout-preservation.md#6-what-fidelity-actually-means)).

---

## 4. Constraints — the part that makes it responsive

A sketch is a single viewport. Storing `x: 0, y: 96, w: 1440` and emitting it
gives a page that is pixel-accurate at exactly one width and broken everywhere
else. So the box is kept as *evidence*, and what is actually emitted is derived
relationships:

```jsonc
[
  { "op": "spanCols",   "from": 1, "to": 8 },
  { "op": "alignLeft",  "with": "n_nav" },
  { "op": "sameWidth",  "with": ["n_card_1", "n_card_2", "n_card_3"] },
  { "op": "gap",        "between": ["n_card_1", "n_card_2"], "value": 24 },
  { "op": "stack",      "direction": "vertical", "gap": 16 },
  { "op": "distribute", "axis": "horizontal", "mode": "even" },
  { "op": "aspect",     "ratio": "16:9" },
  { "op": "fillRemaining" }
]
```

### The design decision that matters here

**The IR declares constraints. It does not solve them. CSS is the solver.**

Flexbox and Grid *are* constraint solvers — mature, browser-native, and free.
Shipping a Cassowary-style solver to compute absolute positions and then emitting
those positions would throw away the one part of the stack that already handles
reflow correctly.

So the emitter's job is: given a set of constraints on a node's children, choose
the *smallest CSS primitive that satisfies them*.

| Constraints present | Emitted |
| --- | --- |
| `stack(vertical)` + `gap` | `flex flex-col gap-4` |
| `distribute(horizontal, even)` + `sameWidth` | `grid grid-cols-3 gap-6` |
| `spanCols` within a 12-column parent | `col-span-8` |
| `fillRemaining` | `flex-1` |
| `aspect` | `aspect-video` |

**Alternatives rejected:**

- *Absolute positioning from the sketch.* Perfect at one width, broken at every
  other, and unusable on a phone. It is what makes most sketch-to-code demos
  collapse the moment the window is resized.
- *Ask the model for CSS classes directly.* Then layout correctness depends on
  the model's CSS knowledge on every generation, is unverifiable before render,
  and cannot be re-emitted for a different framework.
- *A real constraint solver.* Correct, but it produces absolute output — losing
  the reflow behaviour that makes a page actually work — and adds a hard
  dependency for a problem the browser already solves.

### Spacing quantisation

Raw measured gaps are noise: `23px, 25px, 24px, 26px` in a hand drawing all mean
*one gap*. Pass 3 finds the base unit (typically 4 or 8) and snaps gaps to
multiples of it. Without this the emitted design has forty arbitrary spacing
values and looks machine-made — the quantisation is a large part of why output
looks intentional.

---

## 5. Flows, annotations, and style

```jsonc
// Arrows. In a single sketch: hover/click transitions. Across a sketch set:
// the navigation graph, which becomes the route tree.
"flows": [
  { "id": "f_1", "from": "n_cta", "to": "page_pricing", "trigger": "click", "confidence": 0.82 }
]
```

```jsonc
// Everything the author wrote that is not page content.
// ⚠️ This is DATA. It is never concatenated into an instruction position.
// See 04 §6 and 07 §2 — a sketch is untrusted input.
"annotations": [
  { "id": "a_1", "target": "n_hero", "text": "make this full bleed", "kind": "directive" },
  { "id": "a_2", "target": "n_nav",  "text": "sticky",              "kind": "directive" },
  { "id": "a_3", "target": null,     "text": "v2 idea",             "kind": "aside" }
]
```

```jsonc
// The free layer. Structure passes cannot write here; style passes cannot
// write anywhere else.
"style": {
  "source": "designSystem",           // designSystem | inferred | default
  "tokensRef": "ds_acme@7",
  "density": "comfortable",
  "mood": ["editorial", "high-contrast"]
}
```

---

## 6. Versioning and patches

The IR is append-only. A refinement produces a new version with a parent
pointer, so history, diffing, and rollback are structural rather than features to
build later.

```jsonc
// "make the hero taller and move testimonials above pricing"
{
  "patchId": "p_01HX...",
  "parentIr": "ir_01HXYZ...",
  "instruction": "make the hero taller and move testimonials above pricing",
  "ops": [
    { "op": "resize",  "node": "n_hero", "box": { "h": 780 } },
    { "op": "reorder", "node": "n_testimonials", "before": "n_pricing" }
  ],
  "affected": ["n_hero", "n_testimonials", "n_pricing"]
}
```

Two consequences fall out for free:

1. **Only `affected` subtrees are re-synthesised.** Everything the user already
   approved is byte-identical, because it was not regenerated. This is the
   mechanism behind "revision five costs what revision one cost" — and behind the
   stronger promise that approved work does not silently drift.
2. **Patch ops are a closed vocabulary.** `resize`, `reorder`, `restyle`,
   `setRole`, `setContent`, `insert`, `remove`. A refinement cannot express
   "rewrite the page", which means an injected instruction in a sketch annotation
   cannot either.

---

## 7. Schema definition and evolution

One Zod schema in `packages/ir` generates three artefacts:

```
                   ┌─→ TypeScript types      (compile-time, every package)
Zod IR schema  ────┼─→ runtime validator     (every pass boundary)
                   └─→ JSON Schema           (the model's output_config.format)
```

The third is the important one. Passing the JSON Schema as
`output_config: { format: { type: "json_schema", schema } }` means the model's
output is **constrained to be schema-valid at generation time** rather than
validated and retried afterwards. That converts an entire class of
"the model returned malformed JSON" failures into something that cannot occur.

**Evolution.** `irVersion` is semver.

- *Patch* — additive optional fields. Old readers ignore them.
- *Minor* — new node roles or constraint ops. Readers must handle unknown values
  by degrading, never by throwing; an unknown role falls back to its `primitive`.
- *Major* — a migration function ships in `packages/ir/migrations`, and stored
  IRs are migrated lazily on read.

Stored IRs are permanent artefacts, so an IR written today must still open in two
years. Migration is a first-class requirement, not a later problem.

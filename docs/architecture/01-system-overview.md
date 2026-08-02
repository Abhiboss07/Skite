# 01 — System overview

## 1. What SKITE actually is

Not "a website generator". A **design-understanding platform**: a system that
converts visual design artefacts into a typed, inspectable representation of
layout and intent, and then renders that representation into whatever the caller
needs.

The reframe matters architecturally, not just commercially. It says the centre
of the system is a **format**, not a feature — and that the format has many
producers and many consumers:

```
        PRODUCERS (ingest adapters)                CONSUMERS (emitters)

  hand sketch / whiteboard photo ─┐          ┌─→ React + Next + Tailwind
  napkin, paper, cartoon ─────────┤          ├─→ plain semantic HTML
  Figma frame ────────────────────┼→ IR ─────┼─→ photoreal render (image)
  screenshot of any UI ───────────┤          ├─→ interactive prototype
  live production URL ────────────┤          ├─→ component library extraction
  hand-drawn flowchart ───────────┘          └─→ design-token JSON
```

Every future product line the brief mentions — Figma→code, screenshot→components,
website→React, flowchart→app flow — is **an adapter or an emitter, not a new
system**. That is the whole argument for building the IR first: N producers × M
consumers costs N + M implementations instead of N × M.

It also means each adapter can be as deterministic as its input allows. A Figma
frame or a live URL already carries exact geometry, so those adapters need *no
model at all* — they populate the IR directly. Only genuinely ambiguous input (a
photograph of ink on a whiteboard) needs vision inference. Most systems in this
space cannot make that distinction because they have no intermediate format.

---

## 2. Architecture at a glance

Four planes, deliberately separated so each can scale and fail independently.

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT           web app · CLI · SDKs · CI integrations         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST + SSE
┌───────────────────────────▼─────────────────────────────────────┐
│  CONTROL PLANE                                                   │
│  auth · quota · project & design-system registry · job intake    │
│  (stateless; owns Postgres; never runs inference)                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ durable queue (per-stage topics)
┌───────────────────────────▼─────────────────────────────────────┐
│  PIPELINE PLANE                                                  │
│  ingest · structure · intent · synthesis · verify workers        │
│  (stateless, horizontally scaled, stage-specialised)             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  ARTEFACT PLANE                                                  │
│  content-addressed blob store · IR versions · preview CDN        │
│  (immutable; addressed by hash, never mutated in place)          │
└─────────────────────────────────────────────────────────────────┘
```

**Why the control plane never runs inference.** Model calls are minutes-long and
bursty; API requests are milliseconds and steady. Sharing a process between them
means a slow model call occupies a connection that should be serving a status
poll. Separating them lets each scale on its own signal — request rate for the
API, queue depth for the workers.

---

## 3. The pipeline — eight passes

```
  ┌─────────┐
  │ 0 INTAKE│  validate · normalise · content-hash · dedupe
  └────┬────┘  deterministic · ~50ms
       │
  ┌────▼─────┐
  │ 1 RECTIFY│  perspective · illumination · stroke isolation
  └────┬─────┘  deterministic CV · no model · ~300ms
       │
  ┌────▼─────┐
  │ 2 DETECT │  line segments → rectangles · text runs · arrows
  └────┬─────┘  deterministic CV · no model · ~200ms
       │
  ┌────▼─────┐
  │ 3 GRID   │  column/row inference · spacing quantisation
  └────┬─────┘  deterministic · no model · ~50ms
       │
  ┌────▼─────┐
  │ 4 LABEL  │  ← VISION MODEL. assigns roles to numbered regions.
  └────┬─────┘    cannot move geometry — it is not in the output schema
       │
  ┌────▼─────┐
  │ 5 INTENT │  ← MODEL. reads handwriting, arrows, annotations
  └────┬─────┘
       │
       ├──────────────►  IR  ◄── the artefact everything else consumes
       │
  ┌────▼──────┐
  │ 6 SYNTH   │  ← MODEL. emits a typed component tree (not code)
  └────┬──────┘    then a deterministic emitter writes TypeScript
       │
  ┌────▼──────┐
  │ 7 VERIFY  │  typecheck · lint · axe · render · measure IoU vs IR
  └────┬──────┘  deterministic · no model · repair loop if below threshold
       │
  ┌────▼──────┐
  │ 8 DELIVER │  preview · export · deploy
  └───────────┘
```

Five of the eight passes involve no model at all. That is the design working as
intended.

### The single most important property

**Passes 0–3 fix the geometry. Passes 4–6 may not change it.**

This is enforced structurally, not by instruction. The labelling pass's output
schema contains role assignments and parent/child links — it has no field in
which a bounding box could be expressed. A model that wanted to move a box
literally cannot say so. This is why "preserve the layout" is a property of the
system rather than a hope about the prompt.

---

## 4. Data flow for one redraw

```
POST /v1/redraws  { source, project, mode }
      │
      ├─ 0  validate → normalise → sha256(source) = content hash
      │       └─ cache hit on (hash, project_version, mode)? → return artefacts, $0
      │
      ├─ 1–3  rectified image + geometry primitives          [artefact: geometry.json]
      │
      ├─ 4–5  + roles + relationships + intent               [artefact: ir@v1.json]
      │       └─ SSE: stage events streamed to the client throughout
      │
      ├─ 6    component tree → emitter → source files        [artefact: bundle/]
      │
      ├─ 7    verify → fidelity score
      │       ├─ pass  → continue
      │       ├─ repair (bounded, ≤2 attempts, targeted subtree only)
      │       └─ fail  → return diagnostics + the IR, never broken output
      │
      └─ 8    preview URL · downloadable bundle · optional deploy
```

**Refinement takes a different path.** `POST /v1/redraws/{id}/refine` with
plain-language instruction does **not** re-run passes 0–5. It produces a *patch
to the IR*, applies it, and re-runs synthesis for affected subtrees only. That is
why the fifth revision costs what the first did — see
[05 §4](05-generation-and-export.md#4-refinement-as-a-graph-patch).

---

## 5. What is deliberately out of scope

### The sketch-to-3D-character idea

Keep it, but not here. It shares exactly one thing with the redraw engine — the
upload surface — and differs in every other respect:

| | Redraw engine | Character lab |
| --- | --- | --- |
| Success criterion | Geometric fidelity to the input | Aesthetic appeal; fidelity would be a *failure* |
| Intermediate format | Layout IR | None applicable |
| Evaluation | IoU, measurable | Human preference |
| Output | Code | Image |
| Determinism | Required | Undesirable |

Forcing both through one pipeline would dilute the IR into a shape that serves
neither. It lives at `apps/labs/`, behind a feature flag, with its own pipeline
and its own evaluation — and it is explicitly excluded from the fidelity
contract. This also protects the brand claim: "your layout is preserved exactly"
must not be adjacent to a feature that intentionally reimagines things.

### Not in the core engine either

Real-time collaborative editing, a hosted CMS, a design tool. SKITE converts and
generates; it is not where design happens.

---

## 6. Repository structure

A monorepo, because the IR schema is shared by every package and versioning it
across repos would be the first thing to rot.

```
skite/
├── apps/
│   ├── web/                     # Phase 1 landing site (frozen) + app shell
│   ├── studio/                  # the product UI: upload, progress, preview, edit
│   ├── api/                     # control plane — REST + SSE, auth, quota
│   └── labs/                    # sketch → 3D character. Separate pipeline.
│
├── services/
│   ├── worker-ingest/           # passes 0–3. CPU-bound, no model, no network egress
│   ├── worker-structure/        # passes 4–5. Model calls. IO-bound
│   ├── worker-synthesis/        # pass 6. Model call + deterministic emitter
│   └── worker-verify/           # pass 7. SANDBOXED — executes generated code
│
├── packages/
│   ├── ir/                      # ⭐ the schema. Zod + generated JSON Schema + types
│   │                            #    versioned, migratable, the contract everything shares
│   ├── ir-adapters/             # producers: sketch, figma, screenshot, url, flowchart
│   ├── ir-emitters/             # consumers: next-tailwind, html, render-prompt, tokens
│   ├── geometry/                # rectify, detect, grid inference, spacing quantisation
│   ├── fidelity/                # IoU + reading-order scoring. The number we publish
│   ├── design-system/           # extraction from tokens / Storybook / live URL
│   ├── prompts/                 # versioned prompt templates + output schemas
│   ├── model-client/            # Anthropic client: retries, caching, budgets, refusals
│   ├── sandbox/                 # isolation primitives for running generated code
│   └── config/                  # shared tsconfig, eslint, tailwind preset
│
├── eval/
│   ├── corpus/                  # hand-drawn wireframes + human-reconstructed ground truth
│   ├── harness/                 # runs the corpus, reports fidelity, gates releases
│   └── reports/                 # committed results per release — the published numbers
│
├── infra/                       # IaC: queues, workers, storage, CDN, secrets
└── docs/architecture/           # this directory
```

Two placements are load-bearing:

**`packages/ir` is a package, not a folder inside a service.** Everything depends
on it and nothing it depends on. If the IR ever imports from a worker, the
layering has inverted and the platform argument collapses.

**`eval/` is a top-level concern, not a test directory.** The fidelity number is
a published product claim. It needs a corpus under version control, a harness
that runs in CI, and committed reports — the same status as source code. A
regression in fidelity should fail a build exactly like a type error does.

---

## 7. Technology choices

| Concern | Choice | Why this over the alternative |
| --- | --- | --- |
| Language | TypeScript end to end | The IR schema, the emitters, and the front end all share types. A Python pipeline would need a second schema definition and a serialisation boundary — the exact seam where drift starts. |
| CV | OpenCV via `opencv-wasm` or a thin Python sidecar | Rectification and line detection are solved problems with battle-tested implementations. Reimplementing Hough transforms is not the innovation here. |
| Schema | Zod → JSON Schema | One definition drives runtime validation, TypeScript types, *and* the model's `output_config.format`. Three consumers, one source. |
| Model API | Anthropic Messages API, direct | Not Managed Agents — see [ADR-001](10-decision-records.md#adr-001). Not LangChain — a fixed 8-stage pipeline needs no orchestration framework, and the abstraction would obscure the caching and schema control the design depends on. |
| Queue | Durable, at-least-once, per-stage topics | Stages have wildly different runtimes and failure modes; one queue per stage lets each scale and retry independently. |
| Storage | Content-addressed blobs + Postgres metadata | The same sketch redrawn twice should cost nothing the second time. Content addressing makes that free rather than a cache layer to maintain. |

---

## 8. Where the risk actually is

Stated plainly, because a design document that only lists strengths is not
useful for review.

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Grid inference fails on genuinely freehand drawing (no straight lines, no alignment) | **High** — it is the core assumption | Confidence scoring per node; below threshold, fall back to a looser flow layout and *tell the user* the fidelity is lower rather than silently guessing |
| Handwriting OCR is weak on real handwriting | Medium | We need labels, not transcription — a wrong word in a placeholder is cosmetic. Escalate to specialised OCR only if eval shows it gating quality |
| Unit cost exceeds plan pricing at high usage | **High** — see [08 §3](08-cost-and-performance.md#3-margin-analysis) | Effort tiering, caching, fair-use limits. Flagged now rather than discovered in production |
| Model output drifts as models change | Medium | The eval corpus is the regression suite; prompts and schemas are versioned and pinned |
| Generated code is untrusted and we execute it in verify | **High** | Full isolation — [07 §3](07-security-and-privacy.md#3-executing-generated-code) |

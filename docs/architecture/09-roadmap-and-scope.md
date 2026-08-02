# 09 — Roadmap and scope

Everything before this document describes a system built for millions of users.
This document is about the tension in that brief, and how to resolve it.

---

## 1. The tension, stated plainly

You asked for an architecture that is "production-ready and supports millions of
users". You also said this is a final-year major project with a report and a viva.

Those are different artefacts:

- A system for millions of users needs multi-tenancy, VPC deployment, SSO,
  regional data residency, and a team maintaining it. It takes a year or more.
- A major project needs a **working, demonstrable, measurable** system with clear
  technical rationale, buildable by one person in a semester.

**A design that only serves the first would be undeliverable. A design that only
serves the second would be unimpressive.** The resolution is that the
architecture in documents 01–08 is genuinely production-shaped — the IR, the pass
separation, the schema enforcement, the fidelity gate — and none of it depends on
scale. What scale adds is operational surface: queues become bigger queues,
workers become more workers, and features like SSO get bolted onto the side.

So: build the vertical slice, with the production architecture intact. The parts
you cut are the ones that add operational cost without changing the technical
argument.

For the viva specifically, the strongest thing you can present is not a large
feature list. It is: **"here is a novel intermediate representation, here is the
algorithm that produces it, here is the metric that proves it works, and here is
the number."** Everything below is organised around protecting that.

---

## 2. Tier 0 — the vertical slice

**Goal: one sketch in, one working page out, with a measured fidelity score.**
This is the whole project. It is demoable, defensible, and complete.

| Build | Skip |
| --- | --- |
| Passes 0–3 (rectify, detect, grid) — deterministic, `packages/geometry` | Stroke-age separation for whiteboards |
| IR v1: regions, roles, grid, order, containment | Flows, annotations, style layer |
| One vision pass: label (merge intent into it) | Separate intent pass |
| Synthesis → component tree → emitter | Multiple emitters — Next + Tailwind only |
| A fixed inventory of ~12 components | Design-system binding |
| Verify: `tsc` + `axe` + fidelity score | Repair loop (report the score, do not auto-fix) |
| Responsive: the stacking rule only | Full responsive derivation |
| Web UI: upload → progress → preview → download ZIP | Accounts, billing, projects, API keys |
| `eval/` with ~30 sketches and ground truth | Large corpus |

**Why the eval corpus is in Tier 0 and not deferred.** It is the difference
between "I built a thing" and "I built a thing and here is how well it works".
Thirty sketches with hand-reconstructed ground truth is a weekend of work and it
is what makes the entire report quantitative. Do it early, because it also tells
you whether the approach works before you have built everything on top of it.

**Suggested sequence** — each step ends somewhere demonstrable:

| # | Milestone | Proves |
| --- | --- | --- |
| 1 | Rectify + detect: photo → overlaid rectangles | The CV foundation works on real photos |
| 2 | Grid inference: columns, base unit, snapped boxes | The core insight — a hand drawing has recoverable structure |
| 3 | IR schema + render IR back as a wireframe | The representation round-trips |
| 4 | Label pass with structured outputs | Semantics, with the model unable to move geometry |
| 5 | Emitter → a real page from a fixed inventory | End-to-end |
| 6 | Fidelity scoring | **The number.** The centre of the report |
| 7 | Eval corpus + report | Rigour |
| 8 | Web UI | Demo |

Milestones 1–3 involve no model at all. If the project ran out of time at
milestone 3 you would still have a novel, defensible contribution — which is a
good property for a plan to have.

---

## 3. Tier 1 and Tier 2

**Tier 1 — the product** (after the project, if it continues)

Design-system binding · refinement patches · full responsive derivation ·
multi-page sketch sets · render-mode emitter · repair loop · accounts, projects,
API keys · the REST API and SSE as published.

**Tier 2 — the platform**

Additional ingest adapters (Figma, screenshot, live URL — each unlocks a product
line and *none* requires touching the engine) · additional emitters · self-hosted
and VPC deployment · SSO, SCIM, audit export · regional residency · dedicated
model capacity.

The ordering is deliberate: Tier 2 is almost entirely *adapters and operations*.
The intelligence is finished at the end of Tier 1. That is the payoff for putting
a format in the middle.

---

## 4. Explicitly cut, and why

| Cut | Reason |
| --- | --- |
| Sketch → 3D character | Different problem, different evaluation, dilutes the thesis. Keep it as a separate `apps/labs/` demo if you want it in the viva — but present it as a bonus, not as part of the engine |
| Multi-tenancy, billing, SSO | Operational surface. Adds no technical argument |
| Self-hosted / VPC | Same |
| Real-time collaboration | A different product |
| Custom-trained detection models | Classical CV is sufficient at this scale and is explainable in a viva, which a fine-tuned YOLO checkpoint is not |
| Deploy integrations | ZIP export demonstrates the same capability |

---

## 5. Risks to the project specifically

| Risk | Mitigation |
| --- | --- |
| Grid inference fails on your test sketches | **Test this in week 1**, before building anything on it. If real freehand sketches do not cluster, you need to know immediately — it is the load-bearing assumption |
| Scope creep into the full product | The tier table above is the contract. "It would be cool if…" goes in Tier 1 |
| Model cost during development | Development is dominated by the eval corpus; use the Batch API (50% off) and cache aggressively. Budget maybe $50–150 across the project |
| Model output changes under you | Pin the model id and prompt version; commit eval reports so regressions are visible |
| Demo fails live | Pre-record a run. Keep three known-good sketches. Never demo on an unseen input |

---

## 6. What makes this a strong project rather than a big one

Worth being explicit, because it should shape where the effort goes:

1. **There is a named, defensible innovation** — the constraint graph, and
   structural rather than prompted enforcement of layout preservation.
2. **The claim is measured, not asserted.** A fidelity metric with a corpus and
   committed results is unusual in student work and is the thing an examiner can
   push on and find solid.
3. **Most of the system is deterministic.** You can explain every pass. "The
   model decides" is not an answer available for passes 0–3, 7, or the emitter —
   and being able to say *why the model is only used for two things* is a
   stronger position than having used it everywhere.
4. **The negative results are in the report.** Where grid inference fails, where
   handwriting OCR is weak, the inter-annotator ceiling on ground truth, the
   pricing finding in [08 §3](08-cost-and-performance.md#3-margin-analysis).
   Reporting limits accurately is what distinguishes engineering from a demo.
5. **The architecture extends without rewriting.** Being able to say "Figma
   support is an adapter, not a new system, and here is the interface it would
   implement" answers the inevitable *how would you extend this?*

---

## 7. Immediate next steps

Nothing here writes generation code. All of it de-risks the design before you
commit to it.

1. **Review this architecture** and tell me what you disagree with. It is a
   proposal.
2. **Spike the load-bearing assumption** (2–3 days): take 20 real sketches,
   implement rectify + line detection + column clustering, and look at whether the
   grid actually emerges. If it does, the project is sound. If it does not, we
   redesign now rather than in month three.
3. **Build the eval corpus** (~30 sketches + ground truth) in parallel — it is
   manual work that does not block on code.
4. **Validate the token estimates** with `count_tokens` so
   [08](08-cost-and-performance.md) rests on measurement.
5. **Decide the two open commercial questions**: the pricing change from
   [08 §3](08-cost-and-performance.md#3-margin-analysis), and the latency claim
   from [08 §4](08-cost-and-performance.md#4-latency--and-a-second-finding).
   Both affect live site copy.

Then, and only then, start Tier 0 milestone 1.

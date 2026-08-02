# 10 — Decision records

The consequential choices, each with what it was chosen over. Format: context,
decision, alternatives rejected, consequences — including the bad ones.

---

## ADR-001 — A fixed pipeline, not an agent

**Context.** Sketch-to-code involves many steps. The fashionable shape is an
agent with tools that decides its own path.

**Decision.** A fixed eight-pass pipeline with code-controlled branching. Direct
Messages API calls, orchestrated by our own workers.

**Rejected:**

| Alternative | Why not |
| --- | --- |
| Autonomous agent loop | The task has no open-ended exploration in it. The steps are known and ordered. An agent would add non-deterministic call counts and unbounded token spend to a problem that has neither |
| Managed Agents | Exists to host an agent loop and a per-session sandbox. We have no agent loop, and our sandbox must be ours because it executes user-facing generated code under our security policy |
| LangChain / orchestration framework | A fixed 8-stage DAG needs no orchestration abstraction, and the abstraction would obscure the prompt-caching and output-schema control the design depends on |

**Consequences.** Predictable cost per redraw (which the pricing model requires).
Each stage independently testable. Failures localised. The cost is rigidity — a
genuinely new input type needs a new adapter rather than the model improvising,
which is the trade we want.

---

## ADR-002 — An explicit intermediate representation

**Context.** The system could pass an image to a model and get code back.

**Decision.** Compile every input into a typed constraint graph first. Generation
consumes the graph, never the image.

**Rejected:**

| Alternative | Why not |
| --- | --- |
| Image → code directly | Layout preservation becomes a hope. Nothing is inspectable, diffable, or measurable. Refinement means full regeneration |
| Image → HTML → parse back | Lossy in both directions and inherits the DOM's assumptions about what a layout is |

**Consequences.** Every claim becomes checkable, refinement becomes a patch, and
new input and output types become adapters instead of new systems. The cost is a
schema to design, version, and migrate — real ongoing work, and the reason
`packages/ir` has a migrations directory from day one.

---

## ADR-003 — Structure is frozen before any model runs

**Context.** Layout preservation is the product claim.

**Decision.** Passes 0–3 (deterministic CV) fix all geometry. The labelling pass's
output schema contains no coordinate field, with `additionalProperties: false`.

**Rejected:**

| Alternative | Why not |
| --- | --- |
| Ask the model for geometry and validate afterwards | Turns a structural guarantee into a retry loop, and the failure is silent when validation is loose |
| Instruct the model not to change layout | Prompt text is the weakest enforcement available. It works until it does not, unpredictably |

**Consequences.** "The model cannot move the boxes" is a fact about the schema,
not a claim about the prompt. The cost is that when the CV passes get the geometry
wrong, the model cannot rescue it — which is why confidence scoring and honest
failure ([03 §3](03-layout-preservation.md#3-detect-and-grid--where-fidelity-is-actually-won))
matter so much.

---

## ADR-004 — Constraints, not absolute positions

**Context.** A sketch is one viewport; output must work at every width.

**Decision.** Store measured boxes as evidence, derive relational constraints,
and let CSS solve them.

**Rejected:**

| Alternative | Why not |
| --- | --- |
| Emit absolute positions | Correct at one width, broken everywhere else. The reason most sketch-to-code demos fall apart on resize |
| Ship a Cassowary solver | Produces absolute output, discarding the reflow behaviour that makes a page work, and adds a dependency for a problem the browser already solves |
| Ask the model for CSS classes | Layout correctness then depends on the model's CSS knowledge on every generation, is unverifiable pre-render, and cannot be re-emitted for another framework |

**Consequences.** Responsive output falls out of a deterministic transformation.
The cost is that the constraint vocabulary must be rich enough to express real
layouts — it will grow, and each addition needs an emitter mapping.

---

## ADR-005 — The model emits a tree; a deterministic emitter writes code

**Context.** Synthesis has to produce TypeScript.

**Decision.** The model emits a schema-constrained component tree. A pure
function turns it into code.

**Rejected:** *Model writes TSX directly* — syntactic validity becomes
probabilistic, design-system adherence becomes a request rather than a
constraint, injected code can reach output, diffs are textual so refinement
cannot target subtrees, and one framework costs one prompt.

**Consequences.** Output is valid by construction and restricted to an allowlist;
one tree serves many emitters; output tokens drop by roughly two-thirds, which
matters because output dominates cost. The emitter becomes a substantial
component we own and must keep good — that is the real price.

---

## ADR-006 — Fidelity is a gate, not a metric

**Context.** The site claims 94% layout fidelity.

**Decision.** Compute fidelity on every job by rendering headless and comparing
real element boxes to the IR. Below 0.75, **fail the job** and return diagnostics
plus the IR.

**Rejected:**

| Alternative | Why not |
| --- | --- |
| Measure in eval only | Then the number describes the benchmark, not the product a user receives |
| Always return best effort | Returning a plausible page that does not match the sketch destroys the only claim the product makes. A clear failure is more useful than a confident wrong answer |

**Consequences.** The published number is real and continuously verified. Some
jobs fail — deliberately. Requires per-node back-references (`data-ir-node`) in
generated markup, which is why the tree schema makes `irNode` mandatory.

---

## ADR-007 — Accessibility is a hard gate

**Context.** Generated front-end code is inaccessible in a predictable handful of
ways.

**Decision.** `tsc`, lint, contrast, and axe run on every generation. Zero
violations or the job repairs; unrepairable means failure.

**Rejected:** *Report a score* — an accessibility score tells you how much work is
left. A gate means there is none. At the scale this operates, shipping
inaccessible markup is harm multiplied across every page every customer deploys.

**Consequences.** Latency and occasional failed generations. It is the least
controversial trade in this document, and Phase 1 already demonstrates the
standard is achievable — zero axe violations across 20 routes in both themes.

---

## ADR-008 — A sketch is untrusted input

**Context.** Sketches contain text; text reaches prompts.

**Decision.** Four layers: sketch text as typed data below every cache breakpoint;
operator instructions via the `role: "system"` channel; output schemas that make
a payload unexpressible; an emitter allowlist. Previews on an isolated origin;
verification in a sandbox with no network and no credentials.

**Rejected:** *Sanitise the text* — a denylist of injection phrasings is
unwinnable. *Trust the model to ignore it* — not a security control.

**Consequences.** Defence in depth, so no single failure is fatal. Sandboxing
verification is real infrastructure cost, and it is not optional: we execute
model-written code derived from attacker-influenceable input.

---

## ADR-009 — Refinement patches the graph

**Context.** Users iterate, and "make the hero taller" should not regenerate the
page.

**Decision.** Refinement emits an `IRPatch` from a closed op vocabulary. Only
affected subtrees are re-synthesised.

**Rejected:** *Regenerate with the instruction appended* — cost grows with every
revision, and approved work silently drifts, which is worse than the cost.

**Consequences.** Revision five costs what revision one cost; approved subtrees
are byte-identical because they were never regenerated; history and rollback are
free. The closed vocabulary also bounds what an injected instruction could do.

---

## ADR-010 — Claude Opus 5 by default, with model as config

**Context.** Model choice trades cost against fidelity.

**Decision.** Default every pass to `claude-opus-5`. Make the model and effort a
per-pass configuration value so cheaper configurations are an experiment rather
than a rewrite.

**Rejected:** *Default to Sonnet 5 for cost* — layout fidelity is the entire
product, and the labelling pass is where it is won. Choosing the cheaper model
before measuring would be optimising the thing that is easy to see at the expense
of the thing that matters. The cheaper configurations are documented in
[08 §1](08-cost-and-performance.md#1-cost-of-one-redraw) and are the owner's call
to make **after** running eval, not mine to make silently.

**Consequences.** Higher default cost, surfaced honestly in the margin analysis.
Requires per-pass model configuration and an eval harness capable of comparing
configurations — both of which are worth having regardless.

---

## ADR-011 — Sketch-to-3D stays out of the engine

**Context.** The brand covers both "sketch → website" and "sketch → realistic
image".

**Decision.** The redraw engine does layout. The character work lives in
`apps/labs/` with its own pipeline, flagged, excluded from the fidelity contract.

**Rejected:** *One unified pipeline* — the two have opposite success criteria.
Geometric fidelity is the goal in one and would be a failure in the other. A
shared abstraction would serve neither, and adjacency would undermine the claim
that layout is preserved exactly.

**Consequences.** Two pipelines to maintain if both are pursued. A clear product
story and an undiluted IR. Render mode — *photoreal image of the same layout* —
stays in the engine as an emitter, because it does preserve layout; that is a
different feature from generating a character.

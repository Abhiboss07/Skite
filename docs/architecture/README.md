# SKITE — AI generation architecture

Design documents for Phase 2. **No generation code exists yet, and none should be
written until this is reviewed.** The point of writing it first is that the
expensive mistakes here are structural, not syntactic.

Phase 1 (the landing site) is frozen at tag `v1.0-landing`.

---

## How to read this

| # | Document | Answers |
| --- | --- | --- |
| 01 | [System overview](01-system-overview.md) | What the platform is, the eight passes, data flow, folder structure |
| 02 | [The Layout IR](02-layout-ir.md) | The constraint graph — the format everything else is built around |
| 03 | [Layout preservation](03-layout-preservation.md) | How a photograph becomes that graph, and how fidelity is measured |
| 04 | [Models and prompting](04-models-and-prompting.md) | Which model runs each pass and why, prompt architecture, injection defence |
| 05 | [Generation and export](05-generation-and-export.md) | Component-tree emission, design systems, validation loop, multi-page, export |
| 06 | [Platform services](06-platform-services.md) | API, database schema, queues, workers, scaling, caching |
| 07 | [Security and privacy](07-security-and-privacy.md) | Threat model, sandboxing, data handling |
| 08 | [Cost and performance](08-cost-and-performance.md) | Unit economics, latency budget, margin analysis |
| 09 | [Roadmap and scope](09-roadmap-and-scope.md) | Tiers, and the buildable subset for the final-year project |
| 10 | [Decision records](10-decision-records.md) | The consequential choices, each with the alternatives rejected |

### Coverage of the brief

Every item requested, and where it is answered.

| Requested | Where |
| --- | --- |
| 1. Overall AI architecture | 01 §2–3 |
| 2. Folder structure | 01 §6 |
| 3. Data flow | 01 §4 |
| 4. Pipeline diagrams | 01 §3, 03 §1 |
| 5. API design | 06 §1 |
| 6. Database schema | 06 §2 |
| 7. Model selection (vision, OCR, LLM) | 04 §1–3 |
| 8. Prompt engineering strategy | 04 §4–6 |
| 9. Layout preservation algorithm | 02 (format) + 03 (algorithm) |
| 10. Multi-page generation | 05 §5 |
| 11. Export architecture | 05 §6 |
| 12. Cost estimation | 08 §1–3 |
| 13. Performance optimization | 08 §4–5 |
| 14. Security considerations | 07 (whole) |
| 15. Future scalability | 06 §4–5, 09 §3 |

---

## The five principles everything follows from

**1. The sketch is a specification, not a prompt.**
A prompt invites interpretation. A drawing is a constraint to satisfy. Every
architectural choice downstream exists to keep generation bound to the geometry
the author drew. This is the product.

**2. Deterministic wherever deterministic is possible.**
Perspective correction, line detection, grid inference, spacing quantisation,
type-checking, contrast ratios, accessibility rules — all of these are
arithmetic. Only semantics (*this box is a navigation bar*) genuinely needs a
model. Pushing work out of the model makes the system cheaper, faster, testable,
and debuggable. It is also the difference between a demo and a product.

**3. Structure is locked; style is free.**
The IR separates the two explicitly. Passes that may not move geometry cannot
express geometry in their output schema. This is enforced by the type system,
not by asking politely in a prompt.

**4. The model fills a schema; it never writes code.**
Every model output is schema-constrained JSON. A deterministic emitter turns
that into TypeScript. This makes output syntactically valid by construction,
restricted to a component allowlist, diffable, re-emittable to other frameworks,
and immune to injected code.

**5. Fidelity is a measured number, not a claim.**
Generated pages are rendered headless and their real element boxes compared
against the IR. If the number is below threshold the job repairs or fails — it
does not ship. The marketing site claims 94% layout fidelity; §03 §6 defines
exactly what that number means and how it is computed.

---

## What this architecture deliberately does not do

- **It does not improve your layout.** If the sketch is unbalanced, the output
  is faithfully unbalanced. Silently overriding intent would make the core claim
  false.
- **It is not an autonomous agent.** It is a fixed-topology pipeline with
  code-controlled branching. See [ADR-001](10-decision-records.md#adr-001).
- **It does not mix in the sketch-to-3D-character idea.** That belongs in a
  separate lab surface — see [01 §5](01-system-overview.md#5-what-is-deliberately-out-of-scope).

---

## Status

Every document here is a **proposal for review**, not a commitment. Numbers
marked *estimated* are derived from published pricing and reasoned token counts,
not from measurement — they need a spike to confirm. Anything I could not
determine without building it is called out explicitly rather than smoothed over.

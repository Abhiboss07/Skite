# 08 — Cost and performance

> **All figures are estimates**, computed from published pricing (2 August 2026)
> and *reasoned* token counts. They are not measured. Run `count_tokens` against
> real payloads before making a pricing decision on them. Two findings below are
> significant enough that they need confirming first and acting on second.

Rates used: **Opus 5** $5 / $25 per MTok (in/out). **Sonnet 5** $3 / $15
(introductory $2 / $10 through 2026-08-31). Cache reads ≈ 0.1× the input rate.
Batch API is 50% off.

---

## 1. Cost of one redraw

Assumes a project with a bound design system, so the stable prefix is cached.

| Pass | Input (cached / fresh) | Output (incl. thinking) | Opus 5 |
| --- | --- | --- | --- |
| 4 Label (vision, `high`) | 1,200 / 5,000 | 3,250 | $0.112 |
| 5 Intent (vision, `medium`) | — / 2,300 | 1,600 | $0.052 |
| 6 Synthesis (`xhigh`) | 6,500 / 3,500 | 12,000 | $0.321 |
| Repair (30% × ~40% of a synthesis) | | | $0.038 |
| **Model subtotal** | | | **$0.523** |
| Infrastructure (verify CPU, storage, egress) | | | ~$0.015 |
| **Total per redraw** | | | **≈ $0.54** |

Synthesis is **61% of the bill**, and output tokens are 86% of synthesis. That
single fact should direct all cost work: *reducing output tokens is the only
optimisation that materially matters.* It is also the strongest argument for
emitting a component tree rather than TSX — the tree is roughly a third of the
tokens of the code it produces.

### By configuration

| Configuration | Per redraw | vs Opus |
| --- | --- | --- |
| All Opus 5 | **$0.52** | — |
| Label on Opus 5, synthesis on Sonnet 5 | **$0.38** | −27% |
| All Sonnet 5 | **$0.31** | −40% |
| All Sonnet 5, `medium` effort, draft mode | **≈ $0.20** | −62% |

Refinement is much cheaper because only affected subtrees regenerate:
**≈ $0.16** per refinement on Opus 5. This is the patch architecture from
[05 §4](05-generation-and-export.md#4-refinement-as-a-graph-patch) paying for
itself.

---

## 2. Where caching lands

| Scenario | Cost | Why |
| --- | --- | --- |
| First redraw in a new project | $0.58 | Design system extracted, nothing cached |
| Second redraw, same project | $0.52 | Prefix cached at ~0.1× |
| Identical sketch re-submitted | **$0.00** | Job cache hit on content hash |
| Refinement | $0.16 | Only affected subtrees |
| Eval corpus run (batch) | $0.26/sketch | Batch API, 50% off |

---

## 3. Margin analysis — read this one

Compared against the plans the Phase 1 site already publishes.

### Free tier: 5 redraws/month

**Cost: ~$2.60 per active free user per month** (Opus 5).

At 10,000 monthly-active free users that is **$26,000/month** with zero revenue.
Free tiers are normally near-zero marginal cost; this one is not, because every
redraw has an irreducible inference cost.

*Mitigation:* run the free tier on the cheapest configuration that passes eval —
Sonnet 5 at `medium` effort brings it to ~$1.00/user/month. Combined with
requiring an account and rate-limiting per IP, this is manageable. It should be a
deliberate decision, not a surprise.

### Studio: $32/month, or $26/month billed annually — "unlimited redraws"

| Usage | Monthly cost (Opus) | Revenue (annual plan) | Margin |
| --- | --- | --- | --- |
| 20 redraws | $10 | $26 | +$16 |
| **50 redraws** | **$26** | **$26** | **break-even** |
| 100 redraws | $52 | $26 | **−$26** |
| 200 redraws (10/workday) | $104 | $26 | **−$78** |

**Break-even is ~50 redraws/month. A designer using this daily will exceed that
in the first fortnight.** "Unlimited redraws" as currently published is
structurally loss-making for the target customer — precisely the customer the
product is designed for.

This is not a reason to change the architecture. It is a reason to change the
pricing before launch. Options, roughly in order of how little they annoy users:

1. **Define fair use.** Keep "unlimited", publish a soft cap (say 150/month) with
   a contact-us path beyond it. This is what most "unlimited" SaaS means, and at
   150 the mixed configuration lands near break-even.
2. **Tier by mode, not by count.** Iterations run the draft configuration
   (~$0.20); "finalise" runs the full Opus pipeline. Users iterate freely and pay
   the expensive path only when they mean it. This is my recommendation — it
   aligns cost with value rather than rationing.
3. **Raise Studio** to ~$49/month, break-even ~94 redraws.
4. **Usage component** above an included allowance.

Under option 2, a 200-redraw month with 20 finalisations costs
`180 × $0.20 + 20 × $0.52 ≈ $46` — still above $26, so it wants combining with
(1) or (3). The architecture supports all four; the choice is commercial.

**Atelier (custom)** is fine — priced per engagement with dedicated capacity.

---

## 4. Latency — and a second finding

| Pass | Estimated p50 |
| --- | --- |
| 0 Intake | 50 ms |
| 1 Rectify | 300 ms |
| 2 Detect | 200 ms |
| 3 Grid | 50 ms |
| 4 Label (vision, `high`) | 8–15 s |
| 5 Intent (`medium`) | 4–6 s |
| 6 Synthesis (`xhigh`, ~12k output tokens) | 30–60 s |
| 7 Verify (tsc + build + headless render) | 15–25 s |
| **End to end** | **≈ 60–105 s** |

### The site currently claims "11s median time to first render"

**This architecture does not support that number**, and I would rather say so now
than have it discovered after launch. Generating, type-checking, building and
rendering a real page is a minute-scale operation at these settings.

Three honest ways to reconcile it:

1. **Redefine "first render" as the reconstructed wireframe.** After pass 5 —
   about 15 seconds — we can show the user the IR drawn back as a wireframe. That
   is a genuinely valuable moment: *this is what we understood before we built
   anything*, and it is the natural place to catch a misread. It is still not 11s,
   but it is a defensible claim and a better product.
2. **Publish the real number.** "About a minute" is not a bad number for
   sketch-to-production-code, and it is true.
3. **Quote the draft configuration**, which is genuinely faster (Sonnet 5 at
   `medium`, ~25–40 s end to end).

My recommendation is (1) plus (2): show the wireframe early, and quote honest
end-to-end timing. Update `lib/content.ts` and the pricing/technology copy
accordingly. The Phase 1 content file already flags its statistics as
placeholders needing replacement — this is one of them.

---

## 5. Performance optimisations, in order of value

| Optimisation | Saving | Notes |
| --- | --- | --- |
| **Merge label + intent into one vision call** | ~$0.05 and ~5 s | They consume the *same image*. Sending it twice is pure waste. Should be done in v1 |
| **Reduce synthesis output tokens** | Largest available lever | Terser tree schema, shorter prop names, omit defaults. Output is 86% of the dominant pass |
| **Prompt caching** | ~90% of prefix | Already in the design. Requires the discipline of nothing job-specific above a breakpoint |
| **Job cache on content hash** | 100% on repeats | Free, and users re-submit more than you would expect |
| **Effort sweep per pass** | 10–40% | Non-monotonic — higher effort sometimes *reduces* total cost by avoiding repair loops. Must be measured, not assumed |
| **Progressive rendering** | Perceived only | Stream the tree; render above-the-fold first. Does not reduce cost, substantially improves how the wait feels |
| **Batch API for eval** | 50% | Regression runs are latency-insensitive. Also keeps them out of the interactive rate-limit pool |
| **Speculative design-system extraction** | ~2 s perceived | Start it while the user is still choosing a file |

### Image token discipline

High-resolution vision is what makes thin marker strokes legible, but a full-res
image can reach ~4,784 tokens. The rectified sketch should be sent at the
*smallest* resolution at which stroke detail survives — likely well under the
2576px ceiling for a clean drawing, and at the ceiling only for dense or faint
ones. Choose it from the measured stroke width in pass 1 rather than sending
everything at maximum.

---

## 6. What to measure before committing

| Question | Method |
| --- | --- |
| Are these token counts right? | `count_tokens` on 20 real payloads per pass |
| Does Sonnet 5 hold fidelity? | Run `eval/` on both; compare fidelity per dollar |
| Is `xhigh` worth it for synthesis? | Sweep `medium`/`high`/`xhigh`, measure fidelity *and* repair rate |
| What is the real repair rate? | Currently assumed 30%. Instrument it |
| What is p50/p95 latency? | Only measurable once built; the estimates above are reasoned, not observed |

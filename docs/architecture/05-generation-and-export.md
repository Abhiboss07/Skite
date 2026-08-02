# 05 — Generation and export

---

## 1. The model emits a tree; the emitter writes the code

This is the most consequential decision in the generation half of the system.

```
   IR + design tokens + component inventory
                  │
            ┌─────▼──────┐
            │   MODEL    │   output_config.format = ComponentTree schema
            └─────┬──────┘
                  │  typed JSON — allowlisted components only
            ┌─────▼──────┐
            │  EMITTER   │   deterministic. pure function. no model.
            └─────┬──────┘
                  │
        ┌─────────┼─────────┬──────────────┐
        ▼         ▼         ▼              ▼
    Next+TW    plain     render        design-token
     (TSX)     HTML      prompt          JSON
```

**Why not have the model write TSX directly?**

| Model writes code | Model writes a tree |
| --- | --- |
| Syntactic validity is probabilistic | Valid by construction — the emitter cannot produce a parse error |
| Design-system adherence is a request | Enforced: unknown components are rejected at the schema boundary |
| One framework per prompt | One tree, many emitters, no re-prompting |
| Diffs are textual and noisy | Diffs are structural, so refinement can target a subtree |
| Injected code can reach output | No schema-valid way to express a `<script>` |
| Output tokens scale with code verbosity | Tree is far more compact than the TSX it produces — materially cheaper |

The last row is worth noting for cost: a component tree is roughly a third of the
tokens of the equivalent TSX, and output tokens are the dominant cost at $25/MTok.

### The tree

```jsonc
{
  "root": {
    "component": "Page",
    "props": { "title": "Aurelia" },
    "children": [
      {
        "component": "Nav",
        "irNode": "n_nav",                    // ← back-reference, required
        "props": { "sticky": true },
        "children": [
          { "component": "Logo", "irNode": "n_logo", "props": { "label": "Aurelia" } },
          { "component": "NavLinks", "irNode": "n_navlinks",
            "props": { "items": ["Product", "Pricing", "Docs"] } }
        ]
      },
      {
        "component": "Section",
        "irNode": "n_hero",
        "props": { "layout": "split", "cols": [8, 4], "gap": 6 },
        "children": [ /* ... */ ]
      }
    ]
  }
}
```

**`irNode` is mandatory on every node.** It is what makes fidelity measurable —
pass 7 renders the page, finds the element carrying `data-ir-node`, and compares
its real box against the IR. Without the back-reference there is no way to score
anything, and the central product claim becomes unverifiable. The schema requires
it; a tree missing one is rejected before the emitter runs.

### Emitter responsibilities

The emitter is a pure function of `(tree, tokens, target)`. It:

- maps component names to implementations from the allowlist
- translates IR constraints into the smallest CSS primitive that satisfies them
  (see [02 §4](02-layout-ir.md#4-constraints--the-part-that-makes-it-responsive))
- applies design tokens — never raw hex values
- emits `data-ir-node` attributes for verification
- generates responsive variants from the derived breakpoint IRs
- formats output with Prettier so diffs are stable

Because it is pure and deterministic, it is unit-testable against fixtures and
identical inputs always produce identical bytes.

---

## 2. Design-system binding

Three ingestion routes, in order of fidelity:

| Source | Method | Model needed |
| --- | --- | --- |
| Token file (`design-tokens.json`, Tailwind config, CSS variables) | Parse | No |
| Storybook instance | Traverse the stories index; extract component names, prop types from `argTypes` | No |
| Live production URL | Headless browse; extract computed styles; cluster into a token set | Only for naming |

The first two are fully deterministic. The third needs inference only to *name*
clusters ("this recurring `#2E6BFF` is the primary colour") — the extraction
itself is measurement.

The result is a versioned `DesignSystem` record: token scales, a component
inventory with prop schemas, and usage preferences. It becomes part of the cached
prompt prefix, so a project's second redraw pays cache-read rates on it rather
than full price. It is also the emitter's allowlist — binding a design system
*narrows* what can be generated, which is the point.

**Fallback.** With no design system bound, SKITE uses a built-in default system
(essentially the one this repo's landing site already uses). Output is never
un-tokenised; there is no path that emits arbitrary hex values.

---

## 3. The validation loop

Pass 7 runs entirely without a model:

```
   emitted bundle
        │
   ┌────▼──────────────┐
   │ tsc --noEmit      │  types
   ├───────────────────┤
   │ eslint            │  lint + a11y static rules
   ├───────────────────┤
   │ build             │  it must actually compile
   ├───────────────────┤
   │ headless render   │  at every derived breakpoint
   │  ├ axe            │  accessibility violations → hard gate at 0
   │  ├ contrast       │  computed, not asserted
   │  └ box extraction │  data-ir-node → real geometry
   ├───────────────────┤
   │ fidelity score    │  see 03 §6
   └────┬──────────────┘
        │
   pass ─┴─ repair (≤2, targeted) ─── fail (return IR + diagnostics)
```

**Repair is targeted, not global.** The score is per-node, so the worst-scoring
subtree is re-synthesised alone — with its measured deviation included as
context — rather than regenerating the page. Bounded at two attempts because a
third rarely helps and always costs.

**Accessibility is a gate at zero violations, not a score.** Whether a contrast
ratio clears 4.5:1 is arithmetic; whether a control is keyboard-reachable is a
property of the markup. Neither is a matter of judgement, so neither is delegated
to something probabilistic. A generation that cannot be repaired to zero
violations fails.

This is the same principle the Phase 1 site was built under, and it is why that
site reports zero axe violations across 20 routes.

---

## 4. Refinement as a graph patch

```
  "make the hero taller and move testimonials above pricing"
        │
   ┌────▼────────────────────────┐
   │ MODEL → IRPatch             │   closed op vocabulary
   └────┬────────────────────────┘
        │  { resize n_hero, reorder n_testimonials }
   ┌────▼────────────────────────┐
   │ apply → ir@v2 (parent v1)   │   append-only
   └────┬────────────────────────┘
        │  affected: [n_hero, n_testimonials, n_pricing]
   ┌────▼────────────────────────┐
   │ re-synthesise ONLY affected │
   └────┬────────────────────────┘
        │
   verify → preview
```

Three properties fall out:

- **Cost is proportional to the change, not the page.** Revision five costs what
  revision one cost.
- **Approved work cannot drift.** Untouched subtrees are not regenerated, so they
  are byte-identical. This is a stronger guarantee than "we asked the model not to
  change other things".
- **History is free.** Every version has a parent; rollback is selecting an
  earlier IR.

---

## 5. Multi-page

A **sketch set** is several sketches plus the arrows between them.

```
  [ home.jpg ]──arrow──▶[ pricing.jpg ]
        │                      │
        └──arrow──▶[ docs.jpg ]┘
```

Processing order matters:

1. **Ingest every sketch** to IR independently (parallel — they do not interact).
2. **Extract one design system across the set.** Recurring elements — the same
   nav drawn on three pages, the same card shape — are detected by structural
   similarity across IRs and promoted to shared components. Doing this before
   generation is what stops three pages having three near-identical nav
   implementations.
3. **Build the route graph** from `flows`. Arrows between sketches become routes;
   arrows within a sketch become interactions.
4. **Emit the shared component library first**, then pages that import from it.
5. **Verify per page**, plus a cross-page check that shared components are
   actually shared rather than duplicated.

**Why not process pages independently and deduplicate afterwards?** Because
post-hoc deduplication of generated code is a hard, fuzzy problem, whereas
detecting structural similarity between IRs — typed graphs with comparable
geometry — is tractable. Another consequence of having a format in the middle.

---

## 6. Export

| Target | Contents | Notes |
| --- | --- | --- |
| **ZIP** | Full project: source, tokens, package.json, README | No SKITE runtime, no dependency, no licence. Once on disk it is entirely yours |
| **GitHub PR** | Branch + PR against the caller's repo | App-token scoped to one repo; never a broad PAT |
| **Vercel** | Deploy hook | Optional |
| **Sandbox** | CodeSandbox / StackBlitz | For sharing without cloning |
| **Render mode** | PNG/WebP of the same IR | Image emitter — same layout, photoreal treatment |
| **IR** | `ir.json` | The artefact itself. Users should be able to take it |

Two commitments here are product positioning, not just engineering:

**There is no SKITE runtime in exported output.** No imported SDK, no
phone-home, no lock-in. The generated project is a standard Next.js application.
A tool whose output requires the tool is a trap, and the Phase 1 site already
promises otherwise.

**Render mode is an emitter, not a second pipeline.** It consumes the same IR
through a different consumer, which is precisely the platform argument from
[01 §1](01-system-overview.md#1-what-skite-actually-is) paying off. It also means
code mode and render mode are guaranteed to share a layout — the same property
the Phase 1 demo relies on, where both sides of the before/after comparison come
from one component.

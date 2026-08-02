# Phase 2 milestone plan

Written before any Phase 2B/2C code, to answer four questions: what genuinely
needs a model, what does not, what can run entirely on this laptop, and what
would only get better with a hosted model later.

Two findings up front, because both change what the phases should aim at.

---

## Finding 1 — the pipeline is already CV-first, with one exception

The architecture you sketched:

```
Sketch → Computer Vision → IR → Validation → AI Enhancement → Website
```

is what the MVP already does, with a single deviation: the model currently sits
*in the middle*, as the classification pass, rather than after the IR is
validated. Everything else — preprocessing, region detection, grid inference,
containment, reading order, synthesis, emission, validation — is deterministic
arithmetic and runs with no model and no network in ~270 ms.

So Phase 2 does not need an architectural rewrite. It needs the classifier moved
behind the IR boundary, which is a real improvement and worth doing:

| | today | after 2A |
|---|---|---|
| Roles | model **or** heuristic, mid-pipeline | heuristic always; model *refines* a validated IR |
| Text | only if a model ran | heuristic leaves it empty; enhancement fills it |
| If the model fails | fall back to heuristic, rerun classification | IR already exists and is already renderable |
| If no model at all | works, no text | works, no text — identical |

The important consequence: **the IR becomes valid before any model is consulted**,
so a failed, slow, or absent model degrades quality rather than breaking the run.
That is the property that makes offline development viable.

One honest caveat about "AI last". Reading handwriting is OCR, and OCR is the one
mid-pipeline job a model does better than anything else available here. The way
to keep it AI-last is for the IR to carry geometry and roles with `content: null`,
and for the enhancement pass to fill text into an IR whose shape is already
fixed. The model never gets to move a box — it only fills fields. That is exactly
the structural enforcement already in place, extended one pass later.

## Finding 2 — 95% layout fidelity is not reachable on real sketches

Fidelity is `0.6·geometry + 0.25·order + 0.15·coverage`. Current synthetic
numbers are geometry 83.6%, order 98.6%, coverage 81.6% → **87.0%**.

Solving for what 95% would require, with order at a near-perfect 99%:

| coverage | geometry needed for 95% |
|---|---|
| 90% | 94.6% |
| 95% | 93.3% |
| 100% | 92.1% |

Mean IoU of 93%+ means every matched box agrees with ground truth to within a few
percent of its own area. On *synthetic* samples, where ground truth is exact
because the generator placed every element, that is demanding but conceivable.
On real photographed sketches it is not: two people annotating the same wobbly
hand-drawn rectangle typically disagree by more than that, so 93% IoU is at or
below annotation noise. A number like that would say more about the annotator
than the detector.

What is realistically reachable:

| scenario | geometry | coverage | fidelity |
|---|---|---|---|
| today (synthetic) | 83.6% | 81.6% | 87.0% |
| 2C target (synthetic) | ~90% | ~95% | **~93%** |
| 2C stretch (synthetic) | ~92% | ~95% | ~94% |
| real corpus, first measurement | unknown | unknown | **expect 70–80%** |

So the 2C goal is restated as: **~93% on synthetic, and establish an honest
real-world baseline for the first time.** If real-world lands at 78%, that is a
result worth reporting, not a failure — nobody currently knows what the number
is, and finding out is the whole point of 2B.

The bottleneck is also not where it looks. Geometry contributes 0.6 of the score
and is already the strongest component; **coverage is the weak one at 81.6%** —
about one region in five is never detected. Fixing detection recall moves both
coverage *and* geometry (an undetected region also cannot contribute IoU). 2C
should therefore be a recall project, not a precision-of-boxes project.

---

## What needs a model, and what does not

| Pass | Needs a model? | Why |
|---|---|---|
| Preprocess (illumination, threshold) | **No** | Arithmetic. A model here would be slower, non-deterministic, and worse. |
| Perspective rectification | **No** | Homography from four detected corners. Classical CV. |
| Region detection | **No** | Connected components. |
| Grid / base-unit inference | **No** | Search over a small candidate space. Maths. |
| Containment + reading order | **No** | Interval logic on rectangles. |
| Role classification | **Optional** | Heuristics reach 88.1%. A vision model should beat that, but the pipeline must not require it. |
| Handwriting OCR | **Yes** | No non-model option here is worth having. |
| Copy generation | **Yes** | Placeholder text otherwise, clearly marked as placeholder. |
| Visual enhancement (palette, type scale) | **Optional** | Deterministic defaults are fine; a model makes them better. |
| Code emission | **No** | Deliberately deterministic — see below. |
| Code validation | **No** | TypeScript parses it. |
| Fidelity scoring | **No** | IoU and Kendall τ. |

**Code emission stays deterministic, and this is a deliberate disagreement with
the brief.** "Code generation needs an LLM" is the standard assumption, but the
emitter's job here is to turn a validated component tree into TSX — a total
function over a closed set of shapes. A model doing that job can hallucinate a
prop, drop a node, or silently change a span, and every one of those is a layout
change, which is the one thing this project promises not to make. It is also the
reason build success is currently 100%. A model earns its place where the output
is open-ended (copy, palette, role judgement), not where it is a mechanical
transformation with a correct answer.

---

## What runs where

**Runs on this machine with no model at all** — the entire geometry half, the
heuristic classifier, synthesis, emission, validation, fidelity scoring, the
Studio, and the benchmark harness. This is ~90% of the codebase and 100% of what
a viva demonstration needs. It already works.

**Wants Ollama** — role refinement, handwriting OCR, copy generation.

**Would be better on a hosted model later** — the same three, at higher accuracy.
Each will be marked in code with a single comment convention so the list stays
truthful rather than aspirational:

```ts
// QUALITY: a frontier vision model reads faint handwriting materially better
// than a 3B local one. Local is the default; this is where cloud pays.
```

### Your hardware sets the model list

Measured on this machine: **RTX 4050 Laptop, 6 GB VRAM**, 15 GB system RAM
(~6.5 GB free), 12-core i5-13420H, 313 GB disk free. Ollama 0.32.1 is running on
`:11434` — note the `ollama` CLI is not on `PATH`, so everything below uses the
HTTP API, which works fine.

Installed today: `qwen2.5:3b-instruct` only (1.9 GB). No vision model, no coder
model.

Your suggested list needs adjusting to fit 6 GB of VRAM:

| Suggested | Verdict |
|---|---|
| `qwen2.5vl` | ✅ but pull **`qwen2.5vl:3b`** (~3.2 GB). The 7B is ~6 GB and will spill out of VRAM. |
| `qwen2.5-coder` | ⚠️ Not needed — code emission is deterministic here. Skip it. |
| `deepseek-r1` | ⚠️ Only the 7B/8B distills fit. Reasoning is not a bottleneck in this pipeline; low priority. |
| `llama3.3` | ❌ **70B, ~43 GB quantised. Will not run on 6 GB of VRAM.** `qwen2.5:3b-instruct`, already installed, covers the general slot. |

**Recommended pulls — two commands, ~3.5 GB total:**

```bash
curl http://localhost:11434/api/pull -d '{"model":"qwen2.5vl:3b"}'   # vision + OCR
# qwen2.5:3b-instruct is already installed — that is the text slot covered
```

Everything in 2B and 2C works without even these; they only affect the optional
enhancement pass.

---

## The provider layer

One interface, six providers. Nothing outside `src/ai/` may name a provider.

```
                      ┌──────────────────────────────┐
   pipeline ────────► │  AIProvider (interface)      │
   enhancement        │    generate()                │
   passes             │    generateVision()          │
                      │    generateCode()            │
                      │    generatePrompt()          │
                      │    summarize()               │
                      └──────────────┬───────────────┘
                                     │
        ┌───────────┬────────────┬───┴────┬───────────┬──────────────┐
     Ollama      Claude       OpenAI    Gemini    OpenRouter   OpenAI-compatible
     (default)                                                (Antigravity,
                                                               LM Studio, vLLM…)
```

Three design decisions worth stating:

**Two primitives, three presets.** `generate()` and `generateVision()` are the
only real capabilities; `generateCode()`, `generatePrompt()` and `summarize()`
are task-shaped wrappers with their own defaults (temperature, system prompt,
model preference). Implementing all five per provider would mean six copies of
the same three wrappers. They live once, in a base class.

**OpenRouter and Antigravity are not separate adapters.** Both speak the OpenAI
wire format; so do LM Studio, vLLM, Together and most self-hosted servers. One
`openai-compatible` adapter parameterised by base URL covers all of them and
anything similar that appears later. Naming them separately in config is fine —
they just resolve to the same implementation.

**Capability declaration, not capability assumption.** A provider states what it
can do (`vision`, `json`, `streaming`, context window). Asking a text-only model
for vision fails fast with a clear message instead of returning nonsense.

Every call carries a task label, and the layer records latency, tokens and
estimated cost per task — which is what makes "the vision pass improves component
accuracy from X to Y, at Z ms and ₹W per run" a sentence you can actually write
in the report.

---

## Milestones

### 2A — provider layer and AI-last restructure

| # | Deliverable | Needs a model? |
|---|---|---|
| 2A.1 | `AIProvider` interface, capability model, task types, error taxonomy | No |
| 2A.2 | Ollama adapter against the live `:11434` API | Ollama |
| 2A.3 | Claude, OpenAI, Gemini, OpenAI-compatible adapters | No (untestable without keys — written against published wire formats, marked as such) |
| 2A.4 | Registry + config resolution + `/api/providers` health probe | No |
| 2A.5 | Move classification behind the IR boundary; add the enhancement pass | Optional |
| 2A.6 | Provider picker in the Studio, with a live "not configured / reachable" state | No |

**Honest note on 2A.3:** with no API keys, the Claude, OpenAI and Gemini adapters
cannot be executed end to end. They will be written against the documented wire
formats and unit-tested against recorded fixtures, and the plan will say plainly
that they are unverified against a live endpoint until a key exists. Claiming
otherwise would be the easiest lie in this project.

### 2B — real-world evaluation

| # | Deliverable | Needs a model? |
|---|---|---|
| 2B.1 | `test-dataset/real/` structure: notebook, whiteboard, paper, figma | No |
| 2B.2 | Annotation tool — draw boxes on your own photos, assign roles, export truth JSON | No |
| 2B.3 | Metrics extended with false positives, false negatives, precision, recall, F1 | No |
| 2B.4 | Per-category reporting and failure-case gallery | No |
| 2B.5 | First real-world baseline measurement | No |

The synthetic corpus is **kept, not replaced.** You asked to replace it; I'd
argue against that specific part. Its ground truth is exact and it never changes,
which makes it the only thing that can tell a two-point regression from
annotation noise. Real photographs measure whether the thing works; synthetic
samples measure whether a change made it worse. They answer different questions
and the project needs both. Everything else in 2B proceeds as you specified.

### 2C — accuracy, recall-first

Ordered by expected gain, measured against both corpora after each change:

| # | Work | Targets |
|---|---|---|
| 2C.1 | Faint-stroke recovery: hysteresis thresholding (strong seeds, weak growth) instead of one cut | coverage |
| 2C.2 | Adaptive dilation — currently one global pass; gap size varies with stroke width and scale | coverage, merge errors |
| 2C.3 | Split merged regions: detect a component whose ink forms two rectangles and separate it | coverage, FP |
| 2C.4 | Perspective rectification for photographs taken at an angle | geometry |
| 2C.5 | Text-block merging by measured line spacing rather than a heuristic window | coverage, roles |
| 2C.6 | Nested-layout inference: recurse column-splitting inside containers | order, geometry |
| 2C.7 | Role refinement via the vision provider, measured against the heuristic baseline | component accuracy |

No new features. Every change is gated on the benchmark: if fidelity or coverage
drops on either corpus, it does not land.

---

## Offline guarantee

At the end of Phase 2, with the network unplugged and Ollama stopped:

- the full pipeline runs, produces a valid IR, emits compiling code, renders a
  live preview, and reports its own confidence;
- the Studio works, all nine tabs populated;
- the benchmark harness runs over both corpora and produces a full report;
- the only degradation is empty text and heuristic-quality roles, both of which
  are reported rather than hidden.

That property is worth more to a major project than any accuracy number: the demo
cannot fail because of someone else's uptime.

# 06 — Platform services

---

## 1. API design

The Phase 1 site already publishes an API reference at `/api`. That is a
commitment, so the design honours it exactly and extends around it.

### Published surface — unchanged

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/redraws` | Create a redraw from an upload, URL, or Figma link |
| `GET` | `/v1/redraws/{id}` | Fetch status, IR, artefacts (`?include=graph,artifacts,events`) |
| `GET` | `/v1/redraws/{id}/events` | SSE stream of pipeline progress |
| `POST` | `/v1/redraws/{id}/refine` | Plain-language edit against the existing IR |
| `DELETE` | `/v1/redraws/{id}` | Permanently delete the redraw and every derived artefact |

### Extensions required by the architecture

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/projects` | A project owns a design system and caches its extraction |
| `POST` | `/v1/projects/{id}/design-system` | Bind tokens / Storybook / live URL |
| `POST` | `/v1/sketch-sets` | Multi-page: several sketches processed as one unit |
| `GET` | `/v1/redraws/{id}/fidelity` | The score and per-node breakdown |
| `POST` | `/v1/redraws/{id}/export` | Target-specific export (zip, github, vercel) |

### Conventions

**Asynchronous by default.** `POST /v1/redraws` returns `202` with
`{ id, status: "queued" }`. A redraw is tens of seconds; holding an HTTP
connection open for it is a reliability problem, not a convenience.

**SSE for progress, webhooks for completion.** The stream carries per-pass events
so the UI can show the pipeline running (the Phase 1 demo animates exactly these
stages). Webhooks handle the case where nobody is watching.

```
event: pass.started    data: {"pass":"structure","at":"..."}
event: pass.completed  data: {"pass":"structure","ms":4120,"confidence":0.94}
event: fidelity        data: {"score":0.93,"threshold":0.90}
event: redraw.succeeded data: {"artifacts":[...]}
```

**Idempotency keys on POST**, as documented on the marketing site: replays within
24 hours return the original response rather than creating a duplicate. Necessary
regardless — clients retry, and a redraw is expensive.

**Errors** carry a machine-readable `code`, a human `message`, and never a stack
trace. `422` for a sketch we genuinely cannot read, with a specific reason
(`source_too_skewed`, `no_structure_detected`) rather than a generic failure —
the user can act on the former.

---

## 2. Database schema

Postgres. Metadata and lineage only — blobs live in object storage, addressed by
hash.

```sql
-- ── tenancy ──────────────────────────────────────────────────────
organizations   (id, name, plan, created_at, deleted_at)
users           (id, email, name, created_at)
memberships     (org_id, user_id, role)                    -- owner|admin|member
api_keys        (id, org_id, project_id, hash, scopes[], last_used_at,
                 rotated_from, expires_at, revoked_at)

-- ── project & design system ──────────────────────────────────────
projects        (id, org_id, name, default_target, created_at, deleted_at)

design_systems  (id, project_id, version, source_kind, source_ref,
                 tokens jsonb, inventory jsonb, extracted_at)
                 -- versioned: a redraw pins the version it used, so
                 -- re-running an old job reproduces the old output

-- ── source material ──────────────────────────────────────────────
sketches        (id, org_id, project_id, sha256, kind, bytes, width, height,
                 storage_key, uploaded_by, created_at, deleted_at)
                 UNIQUE (org_id, sha256)      -- dedupe within a tenant only

-- ── jobs ─────────────────────────────────────────────────────────
redraws         (id, org_id, project_id, sketch_id, sketch_set_id,
                 mode, status, design_system_version,
                 idempotency_key, fidelity numeric,
                 cost_micros bigint,           -- actual spend, per job
                 queued_at, started_at, finished_at, error jsonb)
                 UNIQUE (org_id, idempotency_key)

sketch_sets     (id, org_id, project_id, name, route_graph jsonb)

-- ── the IR: append-only lineage ──────────────────────────────────
ir_versions     (id, redraw_id, parent_id, ir_version, storage_key,
                 node_count, confidence numeric, created_at)
                 -- parent_id gives full history, diffing, rollback

refinements     (id, redraw_id, from_ir, to_ir, instruction,
                 ops jsonb, affected text[], cost_micros, created_at)

-- ── outputs ──────────────────────────────────────────────────────
artifacts       (id, redraw_id, ir_id, kind, storage_key, sha256, bytes)
                 -- kind: bundle | preview | render | tokens | ir | geometry

verifications   (id, redraw_id, ir_id, passed bool, fidelity numeric,
                 geometry numeric, order_score numeric, coverage numeric,
                 axe_violations int, repair_attempts int, detail jsonb)

-- ── operations ───────────────────────────────────────────────────
usage_events    (id, org_id, project_id, redraw_id, kind, model,
                 input_tokens, output_tokens, cached_tokens,
                 cost_micros, occurred_at)
audit_log       (id, org_id, actor_id, action, subject, meta jsonb, at)
```

### Choices worth defending

**`ir_versions` is append-only with a parent pointer.** History, diffing, and
rollback are structural rather than features to add later. It also means a
refinement can never corrupt the state a user already approved.

**`redraws.cost_micros` and `usage_events`.** Per-job cost recorded at the time
it is incurred. Without this, the margin analysis in
[08 §3](08-cost-and-performance.md#3-margin-analysis) is guesswork forever, and
abuse is invisible until the invoice arrives.

**`sketches` is deduplicated per organisation, not globally.** Content addressing
across tenants would leak information — the existence of a cache hit reveals that
another customer uploaded a byte-identical file. Cheaper globally; not worth it.

**`design_systems` is versioned and pinned per redraw.** Re-running an old job
must reproduce the old output. A mutable design system would make every historical
generation irreproducible.

**Soft delete plus a hard purge job.** `DELETE /v1/redraws/{id}` is promised on
the site as permanent; soft delete marks it, and a purge worker removes blobs
within the retention window. Both are needed — the API needs to return instantly,
and the promise needs to be actually kept.

---

## 3. Queues and workers

One topic per stage, because the stages are not alike:

| Worker | Bound by | Scales on | Concurrency per instance |
| --- | --- | --- | --- |
| `ingest` | CPU (image processing) | Queue depth | Low — memory-heavy |
| `structure` | Network (model latency) | In-flight requests | **High** — mostly waiting |
| `synthesis` | Network (model latency) | In-flight requests | High |
| `verify` | CPU (tsc, build, headless Chrome) | Queue depth | **Low** — very heavy |

Putting these behind one queue would size the fleet for the worst case and waste
most of it. `structure` workers are idle on the network and want high concurrency;
`verify` workers run a full build and a browser and want the opposite.

**Delivery is at-least-once, so every stage is idempotent** — keyed on
`(redraw_id, pass, input_hash)`. A redelivered message re-uses the recorded
result rather than paying for a second model call.

**Backpressure.** Per-organisation concurrency caps, and a global cap tied to our
model rate limits. When the model quota is the binding constraint, queueing is
correct behaviour and the API says `queued` honestly rather than timing out.

**Priority classes.** Interactive redraws ahead of batch and eval runs. Eval
regression runs use the Batch API (50% cheaper, latency-insensitive), which also
keeps them out of the interactive rate-limit pool.

---

## 4. Caching — the largest cost lever

Four layers, each cutting a different kind of repeat work:

| Layer | Key | Saves |
| --- | --- | --- |
| **Job cache** | `sha256(source) + design_system_version + mode + pipeline_version` | **100%** — identical re-request costs nothing |
| **Pass cache** | `(pass, input_hash, prompt_version, model)` | A retry after a later-stage failure does not re-run earlier passes |
| **Prompt cache** | Anthropic `cache_control` on system + design system | ~90% on the cached prefix (reads are ~0.1× input rate) |
| **Design-system extraction** | `project_id + source_ref` | Extraction runs once, not per redraw |

`pipeline_version` in the job-cache key is essential: shipping a better structure
pass must invalidate cached results, or users keep receiving output from the old
one.

The prompt cache is where the recurring saving lives. For a project with a bound
design system, the stable prefix — system prompt, component inventory, tokens —
is thousands of tokens that are identical on every redraw for that project. Opus 5
caches from 512 tokens, so this qualifies comfortably. The rule that makes it work
is boring and absolute: **nothing job-specific above a cache breakpoint.**

---

## 5. Scaling

The honest shape of this system at volume:

**It is embarrassingly parallel.** Jobs never interact. Scaling is adding workers
until a downstream limit binds.

**The binding limit is model throughput, not our compute.** Long before CPU
matters, we hit organisational tokens-per-minute. Which means capacity planning is
mostly quota planning, and the levers are: batch what can wait, cache aggressively,
lower effort where eval says quality holds, and negotiate quota ahead of growth.

**Cost scales linearly with usage and does not amortise.** Unlike most SaaS, there
is no fixed cost that spreads over more users — every redraw has an irreducible
marginal cost. This is why [08](08-cost-and-performance.md) matters more here than
it would for a normal web product, and why unlimited plans are dangerous.

| Dimension | 10³ redraws/day | 10⁶ redraws/day |
| --- | --- | --- |
| Model spend | ~$530/day | ~$530k/day — **the whole business** |
| Ingest CPU | 1–2 workers | ~1,000 workers, trivially horizontal |
| Verify CPU | 2–3 workers | ~2,000 workers, the largest compute line |
| Postgres | Single primary | Partition `usage_events` and `artifacts` by month; read replicas |
| Blob storage | Negligible | Lifecycle rules; expire previews, keep IR |

At the top end, engineering effort should go to reducing tokens per redraw, not to
adding servers. A 20% reduction in output tokens is worth more than any
infrastructure optimisation available.

**Multi-region.** Workers are stateless and can run anywhere; the constraint is
data residency for uploaded sketches. Region-pinned buckets with a region column
on `organizations` is sufficient, and should be designed in now — retrofitting
residency after customers exist is painful.

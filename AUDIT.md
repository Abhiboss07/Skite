# SKITE — Phase 1 production audit

Run against the production build (`next build` + `next start`) on 2 August 2026.
Tooling: Lighthouse 13.4.1 (Chrome 141, headless), Playwright + axe-core 4.x.

---

## 1. Lighthouse

### Desktop — 15 pages

| Page | Perf | A11y | Best Practices | SEO | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | **90** | 100 | 100 | 100 | 0.9s | 240ms | 0 |
| `/features` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/how-it-works` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/technology` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/pricing` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/use-cases` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/showcase` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/examples` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/docs` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/api` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/blog` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/about` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/careers` | **100** | 100 | 100 | 100 | 0.8s | 10ms | 0 |
| `/contact` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |
| `/faq` | **100** | 100 | 100 | 100 | 0.8s | 0ms | 0 |

**14 of 15 desktop pages score a perfect 100.**

### Mobile — 15 pages

| Page | Perf | A11y | Best Practices | SEO | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 85 | 100 | 100 | 100 | 4.3s | 60ms | 0 |
| `/features` | 89 | 100 | 100 | 100 | 3.8s | 10ms | 0 |
| `/how-it-works` | 89 | 100 | 100 | 100 | 3.8s | 10ms | 0 |
| `/technology` | 91 | 100 | 100 | 100 | 3.5s | 10ms | 0 |
| `/pricing` | 88 | 100 | 100 | 100 | 3.9s | 30ms | 0 |
| `/use-cases` | 89 | 100 | 100 | 100 | 3.8s | 50ms | 0 |
| `/showcase` | 89 | 100 | 100 | 100 | 3.8s | 10ms | 0 |
| `/examples` | 91 | 100 | 100 | 100 | 3.5s | 10ms | 0 |
| `/docs` | 91 | 100 | 100 | 100 | 3.5s | 40ms | 0 |
| `/api` | 89 | 100 | 100 | 100 | 3.8s | 10ms | 0 |
| `/blog` | 89 | 100 | 100 | 100 | 3.8s | 10ms | 0 |
| `/about` | 89 | 100 | 100 | 100 | 3.8s | 50ms | 0 |
| `/careers` | 91 | 100 | 100 | 100 | 3.5s | 10ms | 0 |
| `/contact` | 86 | 100 | 100 | 100 | 4.2s | 60ms | 0 |
| `/faq` | 88 | 100 | 100 | 100 | 3.9s | 30ms | 0 |

**Accessibility, Best Practices and SEO are 100 on every page, on both form factors.**
Mobile Performance is 85–91 — short of the 95 target. See §5.

### Before → after

| Metric | Before audit | After |
| --- | --- | --- |
| CLS (`/pricing`, `/docs`) | 0.312 / 0.275 | **0** |
| LCP, observed on throttled mobile | 5.0s | **2.2s** |
| Desktop Performance (`/pricing`) | 83 | **100** |
| Desktop Performance (`/docs`) | 85 | **100** |
| Desktop Performance (`/`) | 79 | **90** |
| Homepage JS transferred | 325 KB | **269 KB** |
| Fonts transferred | 192 KB | **142 KB** |

---

## 2. What was actually broken (and fixed)

**CLS 0.31 — the intro curtain, two separate causes.** The percentage counter
grew from `0%` to `100%` mid-count, shifting the centred stack on every digit;
and locking `body { overflow: hidden }` removed the scrollbar, reflowing the
entire page horizontally when it unlocked. Fixed with a fixed-width counter box
and `scrollbar-gutter: stable` on `<html>`.

**LCP 4.5s — Motion's `initial` state serialised into the server HTML.** 34
elements shipped as `opacity: 0`, so nothing above the fold could paint until
the bundle downloaded, parsed and hydrated. The worst offender was
`template.tsx`, which wrapped *every page*. Above-the-fold entrances are now CSS
keyframes that run at first paint; `template.tsx` and `PageHero` became server
components as a result. Scroll reveals below the fold stayed on JS, where being
invisible until scrolled to is the intent.

**Real horizontal scroll on `/` and `/features` at every width below 1440.** A
70rem decorative glow in the features section had no clipping ancestor. Notably
`body { overflow-x: clip }` was *not* propagating to the viewport in Chrome, so
`<html>` sets it too now.

**WCAG 2.5.3 (label in name).** The search button's `aria-label` was
"Search — press Command K" while its visible text read "Search ⌘K" — the
accessible name did not contain the visible label.

**Two animations ran under `prefers-reduced-motion: reduce`.** `useSpring` is a
permanently running WAAPI animation and survived unmounting the spring variant,
because React reuses the host DOM node. The scroll-progress bar is now plain DOM
with a rAF-throttled scroll listener; the scroll cue's infinite loop is omitted
rather than sped up.

**Focus was dropped on `<body>` when the command palette closed.** It is usually
opened by keyboard shortcut, so Radix had no trigger element to restore focus
to. The provider now remembers and restores the previously focused element.

**`THREE.Clock` deprecation warning** logged by React Three Fiber on three
r185 — resolved by pinning three to 0.180.

---

## 3. Automated QA — Playwright

**184 page loads: 23 routes × 8 breakpoints** (320, 375, 390, 768, 1024, 1440,
1920, 2560), repeated in light theme and under reduced motion.

| Check | Result |
| --- | --- |
| Horizontal overflow / sideways scroll | **0** |
| Cumulative layout shift (max observed) | **0.0002** |
| Broken internal links | **0** |
| Broken images | **0** |
| Clipped / zero-size text elements | **0** |
| Elements stuck invisible after animation | **0** |
| Hydration mismatches | **0** |
| Uncaught page errors | **0** |
| Console errors | **0**\* |
| Console warnings | **0**\* |
| Non-200 routes | **0** |

\* Two entries are environmental, not defects:
- `/this-route-does-not-exist` logs a 404 — that is the 404 route correctly
  returning a 404 status.
- The homepage logs `GL Driver Message … GPU stall due to ReadPixels` at ≥1024px.
  This is headless Chrome software-rendering WebGL through SwiftShader; it does
  not occur in a browser with a GPU.

### Keyboard and focus

| Check | Result |
| --- | --- |
| First tab stop is the skip link | ✅ all pages |
| Focusable elements with no focus indicator | **0** of ~45 per page |
| Tab order follows reading order | ✅ (see note) |
| ⌘K opens the palette | ✅ |
| Focus moves into the dialog | ✅ |
| Escape closes it | ✅ |
| Focus restored to the opener | ✅ |

*Note:* an early heuristic flagged "upward jumps" in tab order on `/pricing`,
`/contact`, `/faq` and others. Investigated and dismissed: these are two-column
layouts where the left column is taller than the right column's first item. DOM
order (heading → supporting card → questions) is the correct reading order; only
the vertical pixel position moves up. The check now compares within a column.

### Reduced motion and theming

| Check | Result |
| --- | --- |
| Text elements left invisible | **0** |
| Animations still running | **0** |
| Both themes apply correctly | ✅ |
| DOM identical between themes | ✅ |

---

## 4. Accessibility

**axe-core, WCAG 2.0/2.1 A + AA + best-practice rules, 20 routes, both themes:
0 violations.**

Fixed during the audit:
- `<Reveal>` wrappers sat between `<ul>`/`<ol>`/`<dl>` and their children,
  breaking list and definition-list semantics in four places.
- `--foreground-subtle` failed AA in *both* themes (4.31:1 dark, 4.24:1 light).
  Retuned to 5.0:1 and 4.8:1.
- Badge accent tones were dark-theme-only and failed contrast on light surfaces.
- Heading order jumped h1 → h3 on the standalone pricing page.
- Eight sections referenced `aria-labelledby` ids that were never rendered.
- The search button's label-in-name failure described above.

---

## 5. Bundle analysis

| Page | HTML | JS | CSS | Fonts |
| --- | --- | --- | --- | --- |
| `/` | 29 KB | 269 KB | 17 KB | 142 KB |
| `/pricing` | 18 KB | 296 KB | 17 KB | 142 KB |
| `/blog` | 15 KB | 301 KB | 17 KB | 142 KB |

Composition of the ~239 KB shipped to a content page:

| Chunk | Size (gz) | Notes |
| --- | --- | --- |
| react-dom + framework | ~107 KB | floor for any React app |
| Motion + lucide | ~46 KB | interaction layer |
| app code | ~37 KB | |
| remainder | ~49 KB | Radix, next-themes, Lenis, route chunks |

**Loaded lazily, not on first paint:** three.js + R3F + drei (245 KB gz, desktop
only, after idle, skipped under 4 CPU cores), cmdk + Radix Dialog (on first ⌘K),
the custom cursor (fine pointers only), Lenis (on idle), the particle canvas
(desktop only).

### What was removed

- **GSAP, entirely (~55 KB gz).** It existed only to drive Lenis's RAF loop and
  keep ScrollTrigger in sync — and nothing in the codebase used ScrollTrigger.
  Every scroll animation was already Motion. Lenis's own RAF does the job.
- **`Reveal` moved off Motion** to IntersectionObserver + CSS, removing a Motion
  dependency from ~100 call sites.
- **Fonts 192 → 142 KB**: dropped Bricolage's optical-size axis, shipped
  Instrument Serif italic-only (the only style used), stopped preloading
  JetBrains Mono (used only for small labels, never an LCP candidate).

---

## 6. Remaining improvements

### Mobile Performance is 85–91, not 95+

This is the one stated target not met, and the cause is measured rather than
guessed.

Lighthouse's mobile profile uses *simulated* (Lantern) throttling: 1.6 Mbps,
150ms RTT, 4× CPU. Under it, LCP is bound by **total critical-path bytes**
(~457 KB: 269 KB JS + 142 KB fonts + CSS + HTML), not by anything the page does.
The evidence:

- Lighthouse's own **observed** LCP breakdown for `/docs` is TTFB 9ms +
  element render delay 148ms ≈ **158ms**. The reported 3.5s is entirely the
  network simulation.
- Measured with *real* devtools throttling at the same speeds, LCP is **2.2s**.
- Removing font preloads changed LCP by 0.1s. Removing the LCP element's fade
  changed it by 0.1s. Neither is the constraint; bytes are.

Closing the remaining ~6 points means roughly halving JS, which means removing
Motion from the shell — the header, theme toggle, aurora and magnetic buttons.
That is a large refactor of the interaction design this site exists to
demonstrate. **My recommendation is to leave it**, and to judge mobile on field
data (real users on real networks with caching) rather than on a cold-cache
simulation. If you want it anyway, say so and I will do the conversion.

### Homepage desktop is 90, not 100

Entirely the 3D scene. With it disabled the homepage scores **99** (TBT 0ms vs
240ms). The cost is WebGL being CPU-rasterised by SwiftShader in the headless
runner; on a machine with a working GPU this is largely GPU time, not main-thread
time. Mitigations already in place: loaded after idle, desktop only, skipped
under 4 CPU cores, render loop stops when scrolled out of view, environment map
baked once at 64px.

I have **not** verified the score on GPU hardware — I can only measure this
environment. Treat 90 as the floor and the real-hardware number as unknown but
higher.

### The intro curtain is off by default

`siteConfig.features.introCurtain`. An opaque full-screen loading screen delays
LCP by its own duration plus hydration time, one-for-one: measured 82 with it,
99 without, on mobile. Flip the flag if the first impression is worth more than
the score to you.

### Not a code issue, but blocking for launch

- **Placeholder content must be replaced.** Testimonials, customer logos,
  statistics, showcase entries and the team page are invented, and flagged as
  such in `lib/content.ts`. Publishing them as real is misleading advertising.
- **`privacy` and `terms` need legal review.** They are drafting starting points.
- **Three forms are presentation-only** (footer newsletter, contact, waitlist) —
  they validate and show success without transmitting anything.
- `siteConfig.url` and the social handles still point at placeholders.

### Nice-to-haves

- A real CSP. The security headers added here are the easy ones; a
  `Content-Security-Policy` needs a nonce strategy for Next's inline scripts.
- `next/image` is unused because the site currently ships no raster imagery —
  once real showcase screenshots land, they should go through it.
- Blog content is a typed array in `lib/blog.ts`. Fine at four posts; move to
  MDX or a CMS when the cadence is real.

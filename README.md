# SKITE — landing site

> From Sketch to Stunning Reality.

Marketing site for SKITE, an AI platform that turns hand-drawn wireframes,
whiteboard photographs and Figma frames into production-ready websites or
photoreal renders, preserving the original layout.

**Phase 1 (this repo) is the website only.** No generation pipeline is
implemented; the live demo is a front-end simulation that runs entirely in the
browser and uploads nothing.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript, `strict` |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) |
| Animation | Motion (Framer Motion 12), Lenis, CSS keyframes above the fold |
| 3D | three.js, React Three Fiber, drei |
| UI primitives | Radix UI, cmdk, lucide-react |
| Theming | next-themes (dark default, View Transitions wipe) |

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

## Design language — "The Redraw"

The brand rests on one idea: every surface exists in two states, **sketch**
(dashed strokes, graph paper, graphite) and **reality** (glass, aurora light,
depth). Interactions are the transition between them.

- The logo is a frame whose left half is still a wireframe and whose right half
  has resolved into the brand gradient.
- The hero's 3D object performs it literally: a scan plane sweeps a crystal,
  leaving rendered facets behind and unresolved wireframe ahead.
- Showcase tiles show the render at rest and the originating sketch on hover.

Typography pairs **Bricolage Grotesque** (display) with
**Inter** (body), **JetBrains Mono** (labels) and one **Instrument Serif
italic** accent word per headline — that pairing is the headline signature.

## Structure

```
src/
├── app/                    # routes; one folder per page, all statically rendered
│   ├── layout.tsx          # fonts, provider stack, global chrome
│   ├── template.tsx        # per-navigation page transition
│   ├── sitemap.ts robots.ts manifest.ts opengraph-image.tsx
├── components/
│   ├── backdrop/           # aurora, particle field
│   ├── brand/              # logo, social glyphs
│   ├── interactive/        # cursor, command palette, preloader, draw pad
│   ├── layout/             # header, footer, page hero, legal template
│   ├── motion/             # reveal, text reveal, magnetic, tilt, marquee…
│   ├── providers/          # theme, Lenis smooth scroll
│   ├── sections/           # homepage + reusable page sections
│   ├── three/              # R3F scene and its lazy loader
│   └── ui/                 # button, card, badge, accordion, tabs…
├── hooks/                  # media-query / reduced-motion / pointer
└── lib/                    # site config, content, blog, motion tokens, metadata
```

Content lives in `lib/content.ts` and `lib/blog.ts` so copy can be edited
without touching components.

## Conventions

- **Motion tokens live in `lib/motion.ts`.** Entrances are expo-out, exits are
  quick, anything cursor-driven is a spring. Don't inline new curves.
- **Every animation is reduced-motion aware.** Primitives degrade to static
  markup rather than animating faster. Verified: 0 running animations under
  `prefers-reduced-motion`.
- **Above the fold, animate with CSS, not JS.** Motion serialises `initial` into
  the server HTML, so a JS entrance ships as `opacity: 0` and blocks LCP until
  hydration. Use `<Rise>` / `<WordRise>` there and `<Reveal>` below the fold.
- **Sections are named landmarks.** Pass `titleId` to `SectionHeading` and
  reference it from the section's `aria-labelledby`.
- **The feature bento spans must total a multiple of 3** or the grid leaves a
  hole in its last row.

## Verification

```bash
npx tsc --noEmit      # types
npx eslint .          # lint (React Compiler rules enabled)
npx next build        # all routes prerender statically
```

Accessibility is checked with axe-core against every route in both themes; the
current state is **zero violations** across WCAG 2.1 A/AA plus best-practice
rules.

A full production audit — Lighthouse on 15 pages in both form factors, 184
Playwright page loads across 8 breakpoints, keyboard/focus/reduced-motion/theme
checks and a bundle breakdown — is written up in [AUDIT.md](AUDIT.md).
Headline: desktop Lighthouse is 100 on 14 of 15 pages, accessibility, best
practices and SEO are 100 everywhere, and CLS is 0.

## Before this goes live

- [ ] **Replace all placeholder content.** `lib/content.ts` flags it: the
      testimonials, customer logos, statistics and showcase entries are
      invented. Shipping them as real is misleading advertising.
- [ ] Replace the invented team in `app/about/page.tsx`.
- [ ] Have `privacy` and `terms` reviewed by counsel — they are drafting
      starting points, not legal advice.
- [ ] Point `siteConfig.url` and the social handles in `lib/site.ts` at the real
      domain and accounts.
- [ ] Wire the three forms (footer newsletter, contact, waitlist) to a backend.
      They currently validate and show success locally without transmitting.

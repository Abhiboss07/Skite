/**
 * All marketing copy for the site.
 *
 * ⚠️ PLACEHOLDER DATA NOTICE
 * `testimonials`, `logos`, `stats` and `showcase` contain invented companies,
 * people and numbers. They exist so the layout can be designed against
 * realistic content. Replace every one of them with real, attributable material
 * before this site goes live — shipping invented testimonials as real ones is
 * both misleading and, in most jurisdictions, unlawful advertising.
 */

export type Feature = {
  title: string;
  description: string;
  icon: string;
  detail: string;
  span?: "wide";
};

/**
 * The bento grid is 3 columns wide, so the spans must total a multiple of 3 or
 * the last row leaves a hole. Six features with three `wide` entries = 9 units.
 * Placing the wide ones at indices 0, 3 and 4 alternates which side the large
 * card falls on each row. Changing a span means rechecking that budget.
 */

export const features: Feature[] = [
  {
    title: "Layout fidelity, not interpretation",
    description:
      "SKITE reconstructs the exact grid you drew — column counts, gutters, relative weights and reading order. Your composition survives the trip.",
    detail:
      "A structure pass vectorises strokes into a constraint graph before a single pixel is generated, so the output is bound to your geometry rather than loosely inspired by it.",
    icon: "layout",
    span: "wide",
  },
  {
    title: "Any input, one pipeline",
    description:
      "Napkin scribbles, whiteboard photos shot at an angle, Figma frames, Balsamiq exports, a cartoon on graph paper. Same engine, same result.",
    detail:
      "Perspective correction, glare removal and stroke separation run before interpretation, so a phone photo of a whiteboard performs like a clean vector export.",
    icon: "layers",
  },
  {
    title: "Production code, not a prototype",
    description:
      "Semantic HTML, typed React, Tailwind tokens, responsive breakpoints and passing accessibility checks — the output ships.",
    detail:
      "Every generation is linted, type-checked and run through axe before it reaches you. Components come out named, not div-souped.",
    icon: "code",
  },
  {
    title: "Photoreal render mode",
    description:
      "Need a pitch visual instead of code? Switch modes and the same sketch resolves into a photographic mockup with real materials and lighting.",
    detail:
      "Useful when the deliverable is a stakeholder deck rather than a repository — and the layout stays identical between both modes.",
    icon: "image",
    span: "wide",
  },
  {
    title: "Your design system, respected",
    description:
      "Point SKITE at a token file, a Storybook or a live URL and it generates inside your existing components instead of inventing new ones.",
    detail:
      "Colours, spacing, radii, typography and component APIs are extracted once, then reused on every future redraw for the same project.",
    icon: "palette",
    span: "wide",
  },
  {
    title: "Iterate in plain language",
    description:
      "“Make the hero taller, move the testimonial above pricing, use our brand blue.” Changes apply to the structure, not by regenerating from zero.",
    detail:
      "Edits are diffed against the constraint graph, so refining the fifth revision is as fast as producing the first.",
    icon: "message",
  },
];

export const workflowSteps = [
  {
    step: "01",
    title: "Capture",
    description:
      "Photograph the whiteboard, drag in a PDF, or paste a Figma link. No cleanup, no particular angle, no minimum resolution.",
    detail: "Accepts PNG, JPG, HEIC, PDF, SVG and Figma URLs up to 40MB.",
  },
  {
    step: "02",
    title: "Understand",
    description:
      "The structure pass separates strokes from noise and rebuilds your layout as a constraint graph — regions, hierarchy, reading order, intent.",
    detail: "Typically 4–9 seconds. This is where layout fidelity is won or lost.",
  },
  {
    step: "03",
    title: "Resolve",
    description:
      "The render pass fills that structure with real components, real type and real spacing, pulling from your design system when one is connected.",
    detail: "Outputs React + Tailwind, plain HTML, or a photoreal image.",
  },
  {
    step: "04",
    title: "Ship",
    description:
      "Preview live, refine in plain language, then export to a repository, a CodeSandbox, or straight to a Vercel deployment.",
    detail: "One click to a pull request against your own branch.",
  },
];

export const pipelineStages = [
  {
    name: "Ingest",
    description: "Perspective correction, glare and shadow removal, stroke isolation.",
    model: "skite-vision-2",
  },
  {
    name: "Structure",
    description: "Strokes become a typed constraint graph of regions and relationships.",
    model: "skite-struct-4",
  },
  {
    name: "Intent",
    description: "Labels, arrows and annotations are read as instructions, not decoration.",
    model: "skite-intent-1",
  },
  {
    name: "Synthesis",
    description: "The graph is filled with components, tokens and responsive rules.",
    model: "skite-render-3",
  },
  {
    name: "Verify",
    description: "Type-check, lint, contrast and axe pass before anything is returned.",
    model: "deterministic",
  },
];

/** ⚠️ Placeholder — invented companies. Replace before launch. */
export const logos = [
  "Northwind Studio",
  "Vector & Bloom",
  "Halcyon Labs",
  "Meridian Type",
  "Pale Blue Co.",
  "Ostrom Design",
  "Kestrel Digital",
  "Lantern Works",
];

/** ⚠️ Placeholder — invented figures. Replace with measured numbers. */
export const stats = [
  { value: 1.2, suffix: "M", label: "Sketches redrawn", decimals: 1 },
  { value: 94, suffix: "%", label: "Layout fidelity score", decimals: 0 },
  { value: 11, suffix: "s", label: "Median time to first render", decimals: 0 },
  { value: 38, suffix: "k", label: "Teams building with SKITE", decimals: 0 },
];

/** ⚠️ Placeholder — invented people and quotes. Replace before launch. */
export const testimonials = [
  {
    quote:
      "We stopped rebuilding whiteboards in Figma. The Monday workshop sketch is a working prototype by lunch, and the layout is actually the one we drew.",
    name: "Ana Ferreira",
    role: "Design Director",
    company: "Northwind Studio",
  },
  {
    quote:
      "I was ready for the usual demo-that-falls-apart. Then it read my arrows as navigation and got the responsive behaviour right on the first pass.",
    name: "Marcus Oyelaran",
    role: "Principal Engineer",
    company: "Halcyon Labs",
  },
  {
    quote:
      "The design-system binding is the whole product for us. Output comes back in our components, with our tokens. Review time dropped by about two thirds.",
    name: "Priya Raghunathan",
    role: "Head of Platform",
    company: "Meridian Type",
  },
  {
    quote:
      "Client sketches something on a napkin in the meeting. I show them a live page before we've paid the bill. It has changed how we sell work.",
    name: "Tomas Lindqvist",
    role: "Founder",
    company: "Vector & Bloom",
  },
  {
    quote:
      "Render mode alone justified the seat. Pitch visuals that used to take a day of mockup work now take the length of a coffee.",
    name: "Dana Whitcombe",
    role: "Creative Lead",
    company: "Pale Blue Co.",
  },
  {
    quote:
      "What surprised me was the restraint. It doesn't add flourishes I didn't ask for. It builds exactly what I drew, properly.",
    name: "Idris Bakare",
    role: "Staff Product Designer",
    company: "Kestrel Digital",
  },
];

/**
 * Prices are in Indian rupees, set as rupee price points rather than converted
 * from a dollar figure — ₹2,499 is a number this market recognises, ₹2,816 is
 * an exchange rate showing through. The annual rate lands on ₹1,999 for the
 * same reason.
 */
export const pricingTiers = [
  {
    name: "Sketch",
    price: 0,
    cadence: "forever",
    tagline: "For trying the idea on real work.",
    cta: "Start free",
    highlight: false,
    features: [
      "5 redraws per month",
      "React + Tailwind or plain HTML export",
      "Photoreal render mode",
      "Community support",
      "SKITE badge on shared previews",
    ],
  },
  {
    name: "Studio",
    price: 2499,
    cadence: "per editor / month",
    tagline: "For designers and teams shipping every week.",
    cta: "Start 14-day trial",
    highlight: true,
    features: [
      "Unlimited redraws",
      "Design-system binding (tokens, Storybook, live URL)",
      "Plain-language iteration",
      "Figma and GitHub integrations",
      "Deploy to Vercel in one click",
      "Private previews, no badge",
      "Priority queue and email support",
    ],
  },
  {
    name: "Atelier",
    price: null,
    cadence: "custom",
    tagline: "For agencies and platform teams at scale.",
    cta: "Talk to us",
    highlight: false,
    features: [
      "Everything in Studio",
      "Dedicated model capacity",
      "Self-hosted or VPC deployment",
      "Custom component libraries",
      "SSO, SCIM and audit logs",
      "99.9% uptime SLA",
      "Named solutions engineer",
    ],
  },
];

export const faqs = [
  {
    question: "Does it really keep my layout, or does it just get the vibe right?",
    answer:
      "Keeping it is the entire point. Before anything is generated, a structure pass converts your strokes into a constraint graph — regions, proportions, hierarchy and reading order. Generation is then bound to that graph. If you drew a three-column grid with a wide left rail, that is what comes out, not a tasteful reinterpretation of it.",
  },
  {
    question: "How rough can the input be?",
    answer:
      "Rough. Phone photos of whiteboards at an angle, ballpoint on a napkin, marker bleeding through paper, a cartoon with stick figures. Perspective correction, glare removal and stroke isolation run first, so messy input performs close to clean vector input. If a human could read your intent from it, SKITE usually can too.",
  },
  {
    question: "What exactly do I get back?",
    answer:
      "Semantic HTML, typed React components and Tailwind classes bound to your tokens, with responsive breakpoints already handled. Every generation is type-checked, linted and run through axe before it reaches you. You can also switch to render mode and get a photoreal image of the same layout instead.",
  },
  {
    question: "Can it use our design system instead of inventing one?",
    answer:
      "Yes, and this is where most teams get their value. Point SKITE at a token file, a Storybook instance or a live production URL. It extracts your colours, spacing, radii, type scale and component APIs once, then reuses them on every future redraw for that project.",
  },
  {
    question: "Do you train models on what I upload?",
    answer:
      "No. Your sketches, generated output and connected design systems are never used for training, on any plan including the free tier. Uploads are encrypted at rest, and you can delete a project and all its artefacts permanently at any time from settings.",
  },
  {
    question: "What happens when it gets something wrong?",
    answer:
      "You correct it in plain language — “make the hero taller”, “move testimonials above pricing”, “that sidebar should be navigation”. Edits are diffed against the constraint graph rather than regenerating from scratch, so the fifth revision is as fast as the first and nothing you already approved drifts.",
  },
  {
    question: "Is there an API?",
    answer:
      "Yes. A REST API with TypeScript and Python SDKs, webhook callbacks for long-running jobs, and streaming progress events. Studio plans include API access; Atelier adds dedicated capacity and self-hosted deployment inside your own VPC.",
  },
  {
    question: "How is this different from prompting an LLM for a page?",
    answer:
      "A prompt gives the model freedom to invent a layout. A sketch is a specification. SKITE treats your drawing as a constraint to satisfy rather than inspiration to riff on, which is why the output looks like your idea instead of the model's favourite landing page.",
  },
];

/** ⚠️ Placeholder — invented projects. Replace with real, permissioned work. */
export const showcase = [
  {
    title: "Aurelia",
    category: "Fintech dashboard",
    source: "Whiteboard photo",
    duration: "9s",
    accent: "electric" as const,
  },
  {
    title: "Fieldnote",
    category: "Editorial magazine",
    source: "Pencil on A4",
    duration: "12s",
    accent: "violet" as const,
  },
  {
    title: "Harbour",
    category: "Logistics SaaS",
    source: "Figma wireframe",
    duration: "7s",
    accent: "aqua" as const,
  },
  {
    title: "Solstice",
    category: "Studio portfolio",
    source: "Napkin sketch",
    duration: "11s",
    accent: "violet" as const,
  },
  {
    title: "Ledger & Co.",
    category: "Accounting platform",
    source: "Balsamiq export",
    duration: "8s",
    accent: "electric" as const,
  },
  {
    title: "Wildline",
    category: "Outdoor commerce",
    source: "Marker on glass",
    duration: "10s",
    accent: "aqua" as const,
  },
];

export const useCases = [
  {
    title: "Design studios",
    description:
      "Turn the sketch from the client workshop into a live page before the meeting notes are written up.",
    outcomes: ["Win pitches with working pages", "Cut concept-to-preview to minutes", "Bill for thinking, not tracing"],
    icon: "compass",
  },
  {
    title: "Product teams",
    description:
      "Take whiteboard output straight into a reviewable prototype, in your own components.",
    outcomes: ["Skip the Figma rebuild step", "Test flows the same day", "Fewer handoff misreads"],
    icon: "users",
  },
  {
    title: "Founders",
    description:
      "You can describe the product and you can draw it. That is now enough to have a site.",
    outcomes: ["Ship a landing page in an evening", "Iterate without a designer on staff", "Look funded before you are"],
    icon: "rocket",
  },
  {
    title: "Agencies at scale",
    description:
      "Standardise output across dozens of client brands, each bound to its own design system.",
    outcomes: ["One pipeline, many brands", "Consistent quality floor", "Junior work reviewed less"],
    icon: "building",
  },
  {
    title: "Educators",
    description:
      "Let students see their interface ideas run, without a semester of front-end fundamentals first.",
    outcomes: ["Design-first teaching", "Instant feedback loops", "Free tier for classrooms"],
    icon: "graduation",
  },
  {
    title: "Engineering teams",
    description:
      "Use the API to convert design artefacts into scaffolded components inside your own tooling.",
    outcomes: ["REST API and SDKs", "Webhook-driven pipelines", "Self-hosted option"],
    icon: "terminal",
  },
];

/**
 * Single source of truth for brand, navigation and metadata.
 * Anything user-facing and repeated across pages belongs here.
 */

export const siteConfig = {
  name: "SKITE",
  tagline: "From Sketch to Stunning Reality.",
  description:
    "SKITE turns hand-drawn wireframes, whiteboard photos and Figma frames into production-ready websites and photoreal renders — preserving your exact layout, hierarchy and intent.",
  shortDescription:
    "Turn any sketch into a production-ready website or photoreal render, with your layout preserved exactly.",
  url: "https://skite.ai",
  ogImage: "/opengraph-image",
  locale: "en_US",
  keywords: [
    "sketch to website",
    "wireframe to code",
    "AI website generator",
    "whiteboard to UI",
    "Figma to production code",
    "design to code AI",
    "AI frontend generation",
    "hand-drawn wireframe converter",
  ],
  links: {
    x: "https://x.com/skite",
    github: "https://github.com/skite",
    linkedin: "https://linkedin.com/company/skite",
    discord: "https://discord.gg/skite",
    email: "hello@skite.ai",
  },
  company: {
    legalName: "Skite Labs, Inc.",
    founded: "2024",
    location: "San Francisco, CA",
  },

  features: {
    /**
     * The first-visit intro curtain (components/interactive/preloader).
     *
     * OFF by default, deliberately. The curtain is an opaque full-screen
     * overlay, and it can only mount after hydration — so it delays Largest
     * Contentful Paint by its own duration plus the time to hydrate. Measured
     * on Lighthouse's throttled mobile profile:
     *
     *   curtain on  → LCP 4.6s, Performance 82
     *   curtain off → LCP 1.9s, Performance 99
     *
     * That is not a bug to be tuned away; any opaque loading screen trades LCP
     * for the brand moment one-for-one. Set this to `true` if the first
     * impression is worth more to you than the score — everything still works,
     * and returning visitors never see it (it is once per session).
     */
    introCurtain: false,
  },
} as const;

export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Top-level header navigation. Groups render as mega-menu panels. */
export const primaryNav: NavGroup[] = [
  {
    label: "Product",
    items: [
      {
        label: "Features",
        href: "/features",
        description: "Everything inside the redraw engine",
      },
      {
        label: "How It Works",
        href: "/how-it-works",
        description: "Sketch to shipped, in four passes",
      },
      {
        label: "Technology",
        href: "/technology",
        description: "The models and the pipeline behind it",
      },
      {
        label: "Use Cases",
        href: "/use-cases",
        description: "Where teams put SKITE to work",
      },
    ],
  },
  {
    label: "Work",
    items: [
      {
        label: "Showcase",
        href: "/showcase",
        description: "Real sketches, real shipped sites",
      },
      {
        label: "Examples",
        href: "/examples",
        description: "Before and after, side by side",
      },
      {
        label: "Blog",
        href: "/blog",
        description: "Research notes and product dispatches",
      },
    ],
  },
  {
    label: "Developers",
    items: [
      {
        label: "Documentation",
        href: "/docs",
        description: "Guides, concepts and recipes",
      },
      {
        label: "API Reference",
        href: "/api",
        description: "REST endpoints and SDKs",
      },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "About", href: "/about", description: "Why we started SKITE" },
      { label: "Careers", href: "/careers", description: "Build the redraw engine with us" },
      { label: "Contact", href: "/contact", description: "Talk to a human" },
    ],
  },
];

/** Flat nav links rendered directly in the header, outside the mega menu. */
export const flatNav: NavItem[] = [{ label: "Pricing", href: "/pricing" }];

export const footerNav: NavGroup[] = [
  {
    label: "Product",
    items: [
      { label: "Features", href: "/features" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Technology", href: "/technology" },
      { label: "Pricing", href: "/pricing" },
      { label: "Use Cases", href: "/use-cases" },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Showcase", href: "/showcase" },
      { label: "Examples", href: "/examples" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    label: "Developers",
    items: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/api" },
      { label: "Changelog", href: "/blog" },
      { label: "Status", href: "/soon" },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    label: "Legal",
    items: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

/** Every routable page — powers the command palette and the sitemap. */
export const allRoutes: { label: string; href: string; group: string; keywords?: string }[] = [
  { label: "Home", href: "/", group: "Pages", keywords: "landing start index" },
  { label: "Features", href: "/features", group: "Product", keywords: "capabilities engine" },
  { label: "How It Works", href: "/how-it-works", group: "Product", keywords: "process steps pipeline" },
  { label: "Technology", href: "/technology", group: "Product", keywords: "models architecture research" },
  { label: "Use Cases", href: "/use-cases", group: "Product", keywords: "agencies startups teams" },
  { label: "Pricing", href: "/pricing", group: "Product", keywords: "plans cost billing free" },
  { label: "Showcase", href: "/showcase", group: "Work", keywords: "gallery inspiration sites" },
  { label: "Examples", href: "/examples", group: "Work", keywords: "before after comparison" },
  { label: "Blog", href: "/blog", group: "Work", keywords: "articles writing news" },
  { label: "Documentation", href: "/docs", group: "Developers", keywords: "guides docs reference" },
  { label: "API Reference", href: "/api", group: "Developers", keywords: "rest sdk endpoints tokens" },
  { label: "About", href: "/about", group: "Company", keywords: "team story mission" },
  { label: "Careers", href: "/careers", group: "Company", keywords: "jobs hiring roles" },
  { label: "Contact", href: "/contact", group: "Company", keywords: "sales support email" },
  { label: "FAQ", href: "/faq", group: "Company", keywords: "questions answers help" },
  { label: "Privacy Policy", href: "/privacy", group: "Legal", keywords: "data gdpr" },
  { label: "Terms of Service", href: "/terms", group: "Legal", keywords: "legal agreement" },
];

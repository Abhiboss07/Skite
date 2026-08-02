import Link from "next/link";
import { ArrowUpRight, BookOpen, Boxes, KeyRound, Rocket, Terminal, Workflow } from "lucide-react";

import { Cta } from "@/components/sections/cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { CodeBlock } from "@/components/ui/code-block";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const metadata = createMetadata({
  title: "Documentation",
  description:
    "Guides, concepts and recipes for SKITE — quickstart, input formats, the constraint graph, design-system binding, iteration and deployment.",
  path: "/docs",
  keywords: ["SKITE docs", "sketch to code documentation"],
});

const SECTIONS = [
  {
    id: "quickstart",
    label: "Quickstart",
    icon: Rocket,
    body: "From zero to a deployed page in four commands.",
  },
  {
    id: "inputs",
    label: "Input formats",
    icon: BookOpen,
    body: "What SKITE accepts, and how to photograph a whiteboard well.",
  },
  {
    id: "constraint-graph",
    label: "The constraint graph",
    icon: Workflow,
    body: "The intermediate representation your layout is compiled into.",
  },
  {
    id: "design-systems",
    label: "Design-system binding",
    icon: Boxes,
    body: "Generating inside your components instead of new ones.",
  },
  {
    id: "authentication",
    label: "Authentication",
    icon: KeyRound,
    body: "API keys, scopes and rotation.",
  },
  {
    id: "cli",
    label: "CLI",
    icon: Terminal,
    body: "Redraw from your terminal and pipe into your build.",
  },
];

export default function DocsPage() {
  return (
    <>
      <PageHero
        eyebrow="Documentation"
        crumbs={[{ label: "Documentation", href: "/docs" }]}
        title={
          <>
            Everything you need, <Accent>nothing you don&apos;t</Accent>.
          </>
        }
        lead="Short guides written by the people who built the thing. If a page takes longer than five minutes, it is too long and we will fix it."
      />

      <section className="section-y">
        <div className="container-skite">
          <div className="grid gap-14 lg:grid-cols-[16rem_1fr] lg:gap-16">
            {/* Sticky index */}
            <aside className="lg:sticky lg:top-32 lg:self-start">
              <nav aria-label="Documentation sections">
                <p className="mb-4 font-mono text-[10px] tracking-[0.2em] text-subtle uppercase">
                  On this page
                </p>
                <ul className="flex flex-col gap-1 border-l border-border">
                  {SECTIONS.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className={cn(
                          "-ml-px block border-l border-transparent py-1.5 pl-4 text-[0.875rem] text-muted",
                          "transition-colors duration-300 hover:border-electric-400 hover:text-foreground",
                        )}
                      >
                        {section.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <div className="flex min-w-0 flex-col gap-16">
              {/* Card index */}
              <Reveal>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SECTIONS.map((section) => (
                    <a key={section.id} href={`#${section.id}`} className="group/doc">
                      <GlassCard
                        radius="md"
                        padding="none"
                        className="flex h-full items-start gap-4 p-5 transition-transform duration-500 group-hover/doc:-translate-y-0.5"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-[color-mix(in_oklab,var(--color-electric-500)_12%,transparent)] text-electric-300">
                          <section.icon className="size-4" strokeWidth={1.6} />
                        </span>
                        <span className="flex flex-col gap-1">
                          <span className="flex items-center gap-1 text-[0.9375rem] font-medium">
                            {section.label}
                            <ArrowUpRight
                              className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover/doc:translate-x-0 group-hover/doc:opacity-100"
                              strokeWidth={2}
                            />
                          </span>
                          <span className="text-[0.8125rem] leading-snug text-subtle">
                            {section.body}
                          </span>
                        </span>
                      </GlassCard>
                    </a>
                  ))}
                </div>
              </Reveal>

              <DocSection id="quickstart" title="Quickstart">
                <p>
                  Install the CLI, authenticate, and redraw a file. The result is written to a
                  directory you can open, edit and deploy like any other project.
                </p>
                <CodeBlock
                  filename="terminal"
                  code={`npm i -g @skite/cli
skite login
skite redraw ./whiteboard.heic --out ./site
cd site && npm install && npm run dev`}
                />
                <p>
                  The generated project is a standard Next.js application. There is no SKITE
                  runtime, no proprietary component library and nothing to license — once the
                  files are on disk they are entirely yours.
                </p>
              </DocSection>

              <DocSection id="inputs" title="Input formats">
                <p>
                  SKITE accepts PNG, JPG, HEIC, PDF, SVG and Figma frame URLs, up to 40MB per
                  file. Perspective correction, glare removal and stroke isolation run before
                  interpretation, so a handheld photograph performs close to a clean export.
                </p>
                <ul className="flex flex-col gap-2">
                  {[
                    "Fill the frame with the drawing — cropping beats resolution.",
                    "Angles up to about 40° are corrected automatically.",
                    "Overhead light causes glare; step to one side rather than turning lights off.",
                    "Corrections and crossings-out are read as corrections, not as content.",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2.5 text-muted">
                      <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-electric-400" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </DocSection>

              <DocSection id="constraint-graph" title="The constraint graph">
                <p>
                  Before generation, your drawing is compiled into a typed graph of regions and
                  the relationships between them. This is the artefact that makes layout
                  fidelity possible, and you can inspect it.
                </p>
                <CodeBlock
                  filename="graph.json"
                  language="json"
                  code={`{
  "root": {
    "type": "page",
    "children": [
      { "type": "nav", "span": [0, 12], "height": "auto" },
      {
        "type": "hero",
        "span": [0, 12],
        "children": [
          { "type": "copy",  "span": [0, 7], "order": 1 },
          { "type": "media", "span": [7, 12], "order": 2, "ratio": "16:11" }
        ]
      },
      { "type": "grid", "span": [0, 12], "columns": 3, "order": 3 }
    ]
  }
}`}
                />
                <p>
                  Every later pass is constrained by this structure. When you ask for a change in
                  plain language, the edit is applied to the graph and only the affected subtree
                  is regenerated — which is why the fifth revision costs the same as the first.
                </p>
              </DocSection>

              <DocSection id="design-systems" title="Design-system binding">
                <p>
                  Point SKITE at a token file, a Storybook instance or a live production URL. It
                  extracts colours, spacing, radii, type scale and component APIs once, then
                  reuses them for every future redraw in that project.
                </p>
                <CodeBlock
                  filename="skite.config.ts"
                  language="typescript"
                  code={`import { defineConfig } from "@skite/cli";

export default defineConfig({
  project: "acme-marketing",
  designSystem: {
    tokens: "./tokens/design-tokens.json",
    storybook: "https://storybook.acme.com",
    // Components SKITE should prefer over generating new ones
    prefer: ["Button", "Card", "Stack", "Prose"],
  },
  output: { framework: "next", styling: "tailwind", typescript: true },
});`}
                />
              </DocSection>

              <DocSection id="authentication" title="Authentication">
                <p>
                  API keys are scoped per project and per capability. Rotate them from the
                  dashboard or the CLI; the previous key stays valid for one hour so deployments
                  never break mid-rollout.
                </p>
                <CodeBlock
                  filename="terminal"
                  code={`skite keys create --project acme-marketing --scope redraw:write
skite keys rotate  --project acme-marketing
skite keys revoke  sk_live_9f2c…`}
                />
              </DocSection>

              <DocSection id="cli" title="CLI">
                <p>
                  The CLI is a thin wrapper over the same API the dashboard uses. It streams
                  progress events, so it composes cleanly with CI pipelines.
                </p>
                <CodeBlock
                  filename="terminal"
                  code={`# Redraw and emit JSON for scripting
skite redraw ./sketch.png --json | jq '.artifacts[].path'

# Render mode instead of code
skite redraw ./sketch.png --mode render --out ./renders

# Iterate on an existing generation
skite refine gen_8fa21c "make the hero taller and move testimonials above pricing"`}
                />
                <p>
                  Full endpoint documentation lives in the{" "}
                  <Link
                    href="/api"
                    className="text-electric-300 underline underline-offset-4 hover:text-electric-200"
                  >
                    API reference
                  </Link>
                  .
                </p>
              </DocSection>
            </div>
          </div>
        </div>
      </section>

      <Cta />
    </>
  );
}

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <section id={id} className="scroll-mt-32">
        <SectionHeading as="h2" title={title} titleClassName="text-heading" className="max-w-none" />
        <div className="mt-6 flex flex-col gap-5 text-[0.9375rem] leading-relaxed text-muted">
          {children}
        </div>
      </section>
    </Reveal>
  );
}

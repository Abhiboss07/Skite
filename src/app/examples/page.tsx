import { ArrowRight } from "lucide-react";

import { Cta } from "@/components/sections/cta";
import { MockSite } from "@/components/sections/mock-site";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const metadata = createMetadata({
  title: "Examples",
  description:
    "Side-by-side comparisons of what goes into SKITE and what comes out — whiteboard photos, napkin sketches, Figma frames and cartoons, each with its rendered result.",
  path: "/examples",
  keywords: ["before and after sketch to code", "wireframe conversion examples"],
});

const EXAMPLES = [
  {
    title: "Marker on a whiteboard",
    note: "Shot at an angle, with glare across the top third and a colleague's arm in frame.",
    input: "Whiteboard photo · 4032×3024 · HEIC",
    time: "9s",
    tone: "aqua" as const,
  },
  {
    title: "Ballpoint on a napkin",
    note: "Bled through the paper. Two of the boxes were drawn over each other and corrected.",
    input: "Phone photo · 3024×4032 · JPG",
    time: "12s",
    tone: "violet" as const,
  },
  {
    title: "Figma wireframe frame",
    note: "Low-fidelity greybox with auto-layout, exported straight from a shared file link.",
    input: "Figma URL · single frame",
    time: "7s",
    tone: "electric" as const,
  },
  {
    title: "Cartoon on graph paper",
    note: "Drawn by a founder who does not design. Stick figures where the testimonials go.",
    input: "Scan · 300dpi · PDF",
    time: "11s",
    tone: "aqua" as const,
  },
];

export default function ExamplesPage() {
  return (
    <>
      <PageHero
        eyebrow="Examples"
        crumbs={[{ label: "Examples", href: "/examples" }]}
        title={
          <>
            What went in. What came <Accent>out</Accent>.
          </>
        }
        lead="Four inputs of deliberately varying quality, each shown next to its result. The geometry on the right is the geometry on the left — that is the whole claim, and it is checkable."
      />

      <section className="section-y">
        <div className="container-skite flex flex-col gap-16">
          {EXAMPLES.map((example, index) => (
            <Reveal key={example.title} delay={0.05}>
              <article className="flex flex-col gap-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-subtle uppercase">
                      Example {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="font-display text-heading font-semibold">{example.title}</h2>
                    <p className="max-w-xl text-[0.9375rem] leading-relaxed text-muted">
                      {example.note}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" size="sm" className="font-mono">
                      {example.input}
                    </Badge>
                    <Badge variant={example.tone} size="sm" className="font-mono">
                      {example.time}
                    </Badge>
                  </div>
                </div>

                <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
                  <Panel label="Sketch" tone="input">
                    <div className="grid-paper-fine absolute inset-0 opacity-60" />
                    <MockSite mode="wire" />
                  </Panel>

                  <div className="flex items-center justify-center lg:px-2">
                    <span className="glass grid size-11 place-items-center rounded-full">
                      <ArrowRight
                        className="size-4 text-electric-300 lg:rotate-0"
                        strokeWidth={2}
                      />
                    </span>
                  </div>

                  <Panel label="Reality" tone="output">
                    <MockSite mode="render" />
                  </Panel>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pb-24">
        <div className="container-skite">
          <SectionHeading
            align="center"
            title={
              <>
                Bring the one you think will <Accent>break it</Accent>.
              </>
            }
            lead="Genuinely — the failure cases teach us more than the clean ones. Send the worst sketch you have and we will show you what comes back."
            titleClassName="text-title"
          />
        </div>
      </section>

      <Cta />
    </>
  );
}

function Panel({
  children,
  label,
  tone,
}: {
  children: React.ReactNode;
  label: string;
  tone: "input" | "output";
}) {
  return (
    <GlassCard
      radius="lg"
      padding="none"
      className={cn(
        "relative aspect-16/10 overflow-hidden",
        tone === "output" && "border-electric-400/25",
      )}
    >
      <span
        className={cn(
          "absolute top-3 left-3 z-20 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase backdrop-blur-sm",
          tone === "input"
            ? "bg-abyss-950/70 text-electric-200"
            : "bg-abyss-950/70 text-violet-200",
        )}
      >
        {label}
      </span>
      {children}
    </GlassCard>
  );
}

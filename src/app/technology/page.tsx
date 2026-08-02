import { Cta } from "@/components/sections/cta";
import { Technology } from "@/components/sections/technology";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Technology",
  description:
    "The models, the constraint graph and the architectural choice behind SKITE's layout fidelity — plus how we handle privacy, determinism and verification.",
  path: "/technology",
  keywords: ["AI layout model", "constraint graph", "design to code architecture"],
});

const PRINCIPLES = [
  {
    title: "Structure before pixels",
    body: "Generation is constrained by an explicit graph of regions, proportions and reading order derived from your strokes. The model fills a specification rather than inventing one.",
  },
  {
    title: "Deterministic where it counts",
    body: "Type-checking, linting, contrast ratios and axe rules are not model outputs. They are hard gates. A generation that fails them is repaired or rejected, never returned.",
  },
  {
    title: "Your data stays yours",
    body: "Uploads, generated output and connected design systems are never used for training, on any plan. Artefacts are encrypted at rest and permanently deletable.",
  },
  {
    title: "Small models, sharply aimed",
    body: "Five specialised passes beat one general model. Each stage is independently evaluated against a held-out set of hand-drawn wireframes with human-labelled ground truth.",
  },
];

const BENCHMARKS = [
  { metric: "Layout fidelity (IoU vs. human reconstruction)", value: "94.1%" },
  { metric: "Reading-order accuracy", value: "97.3%" },
  { metric: "Median time to first render", value: "11s" },
  { metric: "Generations passing axe with zero violations", value: "99.2%" },
  { metric: "Type-check pass rate on first return", value: "100%" },
];

export default function TechnologyPage() {
  return (
    <>
      <PageHero
        eyebrow="Technology"
        crumbs={[{ label: "Technology", href: "/technology" }]}
        title={
          <>
            A pipeline, not a <Accent>prompt</Accent>.
          </>
        }
        lead="Most sketch-to-code tools hand an image to a general model and hope. SKITE inserts an explicit structure pass in between — and that one architectural decision is where the fidelity comes from."
      />

      <Technology />

      <section className="section-y border-t border-border">
        <div className="container-skite">
          <SectionHeading
            eyebrow="Principles"
            title={
              <>
                Four commitments we <Accent>build against</Accent>.
              </>
            }
            titleClassName="text-display"
          />

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {PRINCIPLES.map((principle, index) => (
              <Reveal key={principle.title} delay={(index % 2) * 0.08}>
                <GlassCard radius="lg" padding="lg" className="flex h-full flex-col gap-3">
                  <h3 className="font-display text-[1.125rem] font-semibold tracking-[-0.02em]">
                    {principle.title}
                  </h3>
                  <p className="text-[0.9375rem] leading-relaxed text-muted">{principle.body}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y border-t border-border">
        <div className="container-skite">
          <SectionHeading
            eyebrow="Benchmarks"
            title="Measured, not claimed."
            lead="Evaluated on an internal held-out set of 4,000 hand-drawn wireframes with human-reconstructed ground truth. We publish the methodology and refresh these figures every release."
            titleClassName="text-display"
          />

          <Reveal delay={0.15} className="mt-12">
            <GlassCard radius="xl" padding="none" className="overflow-hidden">
              <table className="w-full text-left">
                <caption className="sr-only">SKITE benchmark results</caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-6 py-4 font-mono text-[10px] tracking-[0.16em] text-subtle uppercase sm:px-8">
                      Metric
                    </th>
                    <th scope="col" className="px-6 py-4 text-right font-mono text-[10px] tracking-[0.16em] text-subtle uppercase sm:px-8">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {BENCHMARKS.map((row) => (
                    <tr
                      key={row.metric}
                      className="border-b border-border transition-colors last:border-0 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]"
                    >
                      <th scope="row" className="px-6 py-5 text-[0.9375rem] font-normal text-muted sm:px-8">
                        {row.metric}
                      </th>
                      <td className="px-6 py-5 text-right font-mono text-[0.9375rem] font-medium text-brand-gradient sm:px-8">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-6 text-[0.8125rem] text-subtle">
              Figures are illustrative of the current release and will be replaced with the
              published evaluation report at general availability.
            </p>
          </Reveal>
        </div>
      </section>

      <Cta />
    </>
  );
}

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Cta } from "@/components/sections/cta";
import { Testimonials } from "@/components/sections/testimonials";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent } from "@/components/ui/section-heading";
import { useCases } from "@/lib/content";
import { getIcon } from "@/lib/icons";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Use Cases",
  description:
    "How design studios, product teams, founders, agencies, educators and engineering teams put SKITE to work — and what changes when the rebuild step disappears.",
  path: "/use-cases",
  keywords: ["sketch to code for agencies", "design team AI workflow"],
});

export default function UseCasesPage() {
  return (
    <>
      <PageHero
        eyebrow="Use cases"
        crumbs={[{ label: "Use Cases", href: "/use-cases" }]}
        title={
          <>
            Six teams. One step they all <Accent>stopped doing</Accent>.
          </>
        }
        lead="The rebuild step costs everyone the same thing — days — but it costs each of them differently. Here is what removing it actually changes."
      >
        <Button asChild size="lg">
          <Link href="/soon">
            Start free
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </Button>
      </PageHero>

      <section className="section-y">
        <div className="container-skite">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((useCase, index) => {
              const Icon = getIcon(useCase.icon);
              return (
                <Reveal key={useCase.title} delay={(index % 3) * 0.08}>
                  <TiltCard intensity={6} className="h-full">
                    <GlassCard
                      radius="lg"
                      padding="none"
                      className="group/uc flex h-full flex-col gap-5 p-7"
                    >
                      <span className="grid size-11 place-items-center rounded-md border border-border bg-[color-mix(in_oklab,var(--color-electric-500)_12%,transparent)] text-electric-300 transition-all duration-500 group-hover/uc:border-electric-400/50 group-hover/uc:shadow-[0_0_28px_-6px_rgba(46,107,255,0.7)]">
                        <Icon className="size-5" strokeWidth={1.6} />
                      </span>

                      <div className="flex flex-col gap-2.5">
                        <h2 className="font-display text-[1.125rem] font-semibold tracking-[-0.02em]">
                          {useCase.title}
                        </h2>
                        <p className="text-[0.9375rem] leading-relaxed text-muted">
                          {useCase.description}
                        </p>
                      </div>

                      <ul className="mt-auto flex flex-col gap-2 border-t border-border pt-5">
                        {useCase.outcomes.map((outcome) => (
                          <li key={outcome} className="flex items-center gap-2.5 text-[0.8125rem] text-subtle">
                            <span aria-hidden className="size-1 shrink-0 rounded-full bg-electric-400" />
                            {outcome}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <Testimonials />
      <Cta />
    </>
  );
}

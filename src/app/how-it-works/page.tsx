import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Cta } from "@/components/sections/cta";
import { LiveDemo } from "@/components/sections/live-demo";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { workflowSteps } from "@/lib/content";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "How It Works",
  description:
    "Capture, understand, resolve, ship. The four steps that take a whiteboard photograph to a deployed, production-ready website in about eleven seconds.",
  path: "/how-it-works",
  keywords: ["how sketch to website works", "wireframe to code process"],
});

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        crumbs={[{ label: "How It Works", href: "/how-it-works" }]}
        title={
          <>
            Four steps. One of them is <Accent>yours</Accent>.
          </>
        }
        lead="You draw. SKITE handles the three steps that used to eat the week."
      >
        <Button asChild size="lg">
          <Link href="/soon">
            Try it on your own sketch
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </Button>
      </PageHero>

      <section className="section-y">
        <div className="container-skite">
          <ol className="flex flex-col gap-5">
            {workflowSteps.map((step, index) => (
              // Reveal inside the <li>: an <ol> may only directly contain <li>.
              <li key={step.step}>
                <Reveal delay={index * 0.08}>
                  <GlassCard
                    radius="xl"
                    padding="none"
                    variant={index === 1 ? "accent" : "glass"}
                    className="grid gap-6 p-8 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-10 md:p-10"
                  >
                    <span className="font-display text-[clamp(2.5rem,2rem+2vw,4rem)] leading-none font-semibold tracking-[-0.05em] text-brand-gradient">
                      {step.step}
                    </span>

                    <div className="flex flex-col gap-2.5">
                      <h2 className="font-display text-heading font-semibold">{step.title}</h2>
                      <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
                        {step.description}
                      </p>
                    </div>

                    <p className="font-mono text-[11px] leading-relaxed text-subtle md:max-w-40 md:text-right">
                      {step.detail}
                    </p>
                  </GlassCard>
                </Reveal>
              </li>
            ))}
          </ol>

          <Reveal delay={0.2} className="mt-16">
            <SectionHeading
              align="center"
              title={
                <>
                  The step nobody misses is the one where you{" "}
                  <Accent>redraw your own drawing</Accent>.
                </>
              }
              lead="Rebuilding a whiteboard in Figma, then rebuilding the Figma file in code, was never design work. It was translation — and translation is exactly what machines are for."
              titleClassName="text-title"
            />
          </Reveal>
        </div>
      </section>

      <LiveDemo />
      <Cta />
    </>
  );
}

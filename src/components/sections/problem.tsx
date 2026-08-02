"use client";

import { motion } from "motion/react";
import { ArrowRight, Check, X } from "lucide-react";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { GlassCard } from "@/components/ui/glass-card";
import { VIEWPORT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const OLD_WAY = [
  { label: "Sketch the idea on a whiteboard", time: "20 min" },
  { label: "Photograph it, then rebuild it in Figma", time: "3 hrs" },
  { label: "Argue about spacing in review", time: "1 day" },
  { label: "Hand off to engineering with annotations", time: "2 hrs" },
  { label: "Rebuild it again, in code this time", time: "2 days" },
  { label: "Discover the layout no longer matches the sketch", time: "∞" },
];

const NEW_WAY = [
  { label: "Sketch the idea on a whiteboard", time: "20 min" },
  { label: "Photograph it and drop it into SKITE", time: "10 sec" },
  { label: "Refine in plain language, then ship", time: "11 sec" },
];

export function Problem() {
  return (
    <section className="section-y relative overflow-hidden" aria-labelledby="problem-heading">
      <div className="container-skite">
        <SectionHeading
          titleId="problem-heading"
          align="center"
          eyebrow="The gap"
          title={
            <>
              The idea was right on the whiteboard. Everything after that is{" "}
              <Accent>translation loss</Accent>.
            </>
          }
          lead="Every step between the drawing and the deployment is a chance for the layout you meant to drift from the layout you get. SKITE removes the steps."
          titleClassName="text-display"
        />

        <div className="mt-20 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-start lg:gap-8">
          {/* The old way */}
          <RevealGroup className="flex flex-col gap-3">
            <RevealItem className="mb-2 flex items-baseline justify-between gap-4">
              <h3 className="font-display text-heading text-subtle">The usual route</h3>
              <span className="font-mono text-xs text-error-400">3–5 days</span>
            </RevealItem>

            {OLD_WAY.map((step, index) => (
              <RevealItem key={step.label}>
                <div
                  className={cn(
                    "group relative flex items-center gap-4 rounded-md border border-dashed border-border px-5 py-4",
                    "transition-colors duration-500 hover:border-border-strong",
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-subtle/50 text-subtle">
                    {index === 0 ? (
                      <Check className="size-3" strokeWidth={2.5} />
                    ) : (
                      <X className="size-3" strokeWidth={2.5} />
                    )}
                  </span>
                  <p className="flex-1 text-[0.9375rem] text-subtle">{step.label}</p>
                  <span className="shrink-0 font-mono text-[11px] text-subtle/70">{step.time}</span>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          {/* The pivot */}
          <Reveal
            direction="none"
            delay={0.3}
            className="flex items-center justify-center py-4 lg:h-full lg:py-0"
          >
            <div className="relative flex items-center justify-center">
              <div
                aria-hidden
                className="absolute size-24 animate-pulse-glow rounded-full bg-[radial-gradient(circle,rgba(46,107,255,0.5),transparent_65%)] blur-2xl"
              />
              <motion.div
                initial={{ rotate: 90 }}
                whileInView={{ rotate: 0 }}
                viewport={VIEWPORT}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                className="glass glass-sheen relative grid size-14 place-items-center rounded-full lg:rotate-0"
              >
                <ArrowRight className="size-5 text-electric-300" strokeWidth={2} />
              </motion.div>
            </div>
          </Reveal>

          {/* The SKITE way */}
          <RevealGroup delay={0.15} className="flex flex-col gap-3">
            <RevealItem className="mb-2 flex items-baseline justify-between gap-4">
              <h3 className="font-display text-heading">
                With <span className="text-brand-gradient">SKITE</span>
              </h3>
              <span className="font-mono text-xs text-success-400">21 seconds</span>
            </RevealItem>

            {NEW_WAY.map((step) => (
              <RevealItem key={step.label}>
                <GlassCard
                  padding="none"
                  radius="md"
                  className="group flex items-center gap-4 px-5 py-4 transition-transform duration-500 hover:-translate-y-0.5"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[linear-gradient(120deg,var(--color-aqua-500),var(--color-electric-600))] text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <p className="flex-1 text-[0.9375rem] text-foreground">{step.label}</p>
                  <span className="shrink-0 font-mono text-[11px] text-electric-300">
                    {step.time}
                  </span>
                </GlassCard>
              </RevealItem>
            ))}

            <RevealItem className="mt-3">
              <p className="text-[0.8125rem] leading-relaxed text-subtle">
                The whiteboard step stays. It is the only one that was ever the point — the
                rest was overhead we all agreed to pretend was design work.
              </p>
            </RevealItem>
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}

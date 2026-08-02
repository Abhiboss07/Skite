"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import { Reveal } from "@/components/motion/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { pipelineStages } from "@/lib/content";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * The pipeline, drawn as a circuit that energises as you scroll through it.
 *
 * The connecting trace is scroll-linked rather than time-linked: the visitor
 * controls the current, which makes the section feel like an instrument instead
 * of a video.
 */
export function Technology() {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 78%", "end 55%"],
  });

  const traceScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section className="section-y relative overflow-hidden" aria-labelledby="tech-heading">
      <div className="grid-paper mask-radial-fade absolute inset-0 opacity-70" />

      <div className="container-skite relative">
        <SectionHeading
          titleId="tech-heading"
          eyebrow="Technology"
          title={
            <>
              Five passes. One of them is where the <Accent>fidelity</Accent> comes from.
            </>
          }
          lead="Most tools jump straight from pixels to output. SKITE inserts a structure pass in between — your drawing becomes a typed constraint graph before a single component is chosen."
          titleClassName="text-display"
        />

        <div ref={ref} className="relative mt-20">
          {/* Trace — vertical on mobile, horizontal on desktop */}
          <div
            aria-hidden
            className="absolute top-6 left-6 hidden h-px w-[calc(100%-3rem)] bg-border lg:block"
          >
            <motion.div
              className="h-full origin-left bg-[linear-gradient(90deg,var(--color-aqua-400),var(--color-electric-500)_50%,var(--color-violet-500))] shadow-[0_0_12px_rgba(46,107,255,0.8)]"
              style={reducedMotion ? { scaleX: 1 } : { scaleX: traceScale }}
            />
          </div>
          <div
            aria-hidden
            className="absolute top-0 left-6 h-full w-px bg-border lg:hidden"
          >
            <motion.div
              className="w-full origin-top bg-[linear-gradient(180deg,var(--color-aqua-400),var(--color-electric-500)_50%,var(--color-violet-500))]"
              style={reducedMotion ? { scaleY: 1 } : { scaleY: traceScale }}
            />
          </div>

          <ol className="relative grid gap-8 lg:grid-cols-5 lg:gap-5">
            {pipelineStages.map((stage, index) => (
              // Reveal sits inside the <li>, never around it: an <ol> may only
              // directly contain <li>, and wrapping breaks the list semantics.
              <li key={stage.name} className="relative">
                <Reveal delay={index * 0.09} className="flex gap-5 lg:flex-col lg:gap-6">
                  {/* Node */}
                  <div className="relative shrink-0">
                    <span
                      className={cn(
                        "relative z-10 grid size-12 place-items-center rounded-full",
                        "glass glass-sheen font-mono text-[11px] font-medium",
                        "text-electric-200",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                      <span
                        aria-hidden
                        className="absolute inset-0 -z-10 animate-pulse-glow rounded-full bg-[radial-gradient(circle,rgba(46,107,255,0.55),transparent_68%)] blur-md"
                        style={{ animationDelay: `${index * 0.4}s` }}
                      />
                    </span>
                  </div>

                  <GlassCard
                    padding="none"
                    radius="md"
                    variant={index === 1 ? "accent" : "glass"}
                    className="flex flex-1 flex-col gap-3 p-5"
                  >
                    <h3 className="font-display text-base font-semibold tracking-[-0.015em]">
                      {stage.name}
                    </h3>
                    <p className="flex-1 text-[0.8125rem] leading-relaxed text-muted">
                      {stage.description}
                    </p>
                    <Badge
                      variant={stage.model === "deterministic" ? "outline" : "accent"}
                      size="sm"
                      className="w-fit font-mono"
                    >
                      {stage.model}
                    </Badge>
                  </GlassCard>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <Reveal delay={0.2} className="mt-14">
          <GlassCard radius="lg" padding="lg" className="max-w-3xl">
            <p className="text-[0.9375rem] leading-relaxed text-muted">
              <span className="font-medium text-foreground">Why the structure pass matters.</span>{" "}
              A prompt gives a model freedom to invent a layout. A sketch is a specification.
              By resolving your drawing into an explicit graph of regions, proportions and
              reading order <em className="font-serif italic">before</em> generation begins,
              every later pass is constrained by your geometry rather than the model&apos;s
              preferences. That single architectural choice is the difference between a page
              that resembles your idea and a page that is your idea.
            </p>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

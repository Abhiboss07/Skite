"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { features, type Feature } from "@/lib/content";
import { getIcon } from "@/lib/icons";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Bento grid of capabilities. Two cards span two columns so the grid has a
 * rhythm instead of reading as a uniform table of six — the asymmetry is what
 * keeps the eye moving down the section.
 */
export function Features() {
  return (
    <section className="section-y relative" aria-labelledby="features-heading">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 left-1/2 h-[40rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(139,92,246,0.14),transparent_65%)] blur-3xl"
      />

      <div className="container-skite relative">
        <SectionHeading
          titleId="features-heading"
          eyebrow="Capabilities"
          title={
            <>
              Not a generator that guesses. An engine that <Accent>reads</Accent>.
            </>
          }
          lead="Six things SKITE does that separate a redraw from a lucky prompt."
          titleClassName="text-display"
        />

        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={(index % 3) * 0.08}
              className={cn(feature.span === "wide" && "lg:col-span-2")}
            >
              <FeatureCard feature={feature} index={index} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = getIcon(feature.icon);
  const [open, setOpen] = useState(false);

  return (
    <TiltCard className="h-full" intensity={7}>
      <GlassCard
        padding="none"
        radius="lg"
        className="group/card flex h-full flex-col gap-5 p-7 transition-colors duration-500"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {/* Index marker, in the sketch idiom */}
        <span className="absolute top-6 right-7 font-mono text-[10px] tracking-[0.16em] text-subtle/60">
          {String(index + 1).padStart(2, "0")}
        </span>

        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-md border border-border",
            "bg-[color-mix(in_oklab,var(--color-electric-500)_12%,transparent)]",
            "text-electric-300 transition-all duration-500",
            "group-hover/card:border-electric-400/50 group-hover/card:text-electric-200",
            "group-hover/card:shadow-[0_0_28px_-6px_rgba(46,107,255,0.7)]",
          )}
        >
          {/* Looked up, not created: getIcon returns a reference out of a
              module-level map, so identity is stable across renders and there is
              no remount risk. The rule cannot see through the indirection. */}
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon className="size-5" strokeWidth={1.6} />
        </span>

        <div className="flex flex-1 flex-col gap-3">
          <h3 className="font-display text-[1.1875rem] leading-snug font-semibold tracking-[-0.02em]">
            {feature.title}
          </h3>
          <p className="text-[0.9375rem] leading-relaxed text-muted">{feature.description}</p>
        </div>

        {/* Detail unfurls on hover — keeps the card scannable at rest but
            rewards the visitor who lingers, instead of dumping everything. */}
        <motion.div
          initial={false}
          animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
          transition={{ duration: 0.45, ease: EASE.out }}
          className="overflow-hidden"
        >
          <p className="border-t border-border pt-4 text-[0.8125rem] leading-relaxed text-subtle">
            {feature.detail}
          </p>
        </motion.div>
      </GlassCard>
    </TiltCard>
  );
}

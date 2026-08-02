"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { pricingTiers } from "@/lib/content";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ANNUAL_DISCOUNT = 0.2;

/**
 * Indian digit grouping: ₹1,00,000, not ₹100,000. The locale does the grouping;
 * hard-coding `toLocaleString()` without one would follow the visitor's browser
 * and show a rupee figure grouped the American way.
 */
const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function Pricing({ standalone = false }: { standalone?: boolean }) {
  const [annual, setAnnual] = useState(true);

  return (
    <section
      id="pricing"
      className={cn("relative scroll-mt-24", standalone ? "pb-24" : "section-y")}
      aria-labelledby="pricing-heading"
    >
      <div className="container-skite">
        {standalone ? (
          // The standalone page supplies its own <h1>, but the tier names are
          // <h3>; without this the outline jumps h1 → h3.
          <h2 id="pricing-heading" className="sr-only">Plans</h2>
        ) : (
          <SectionHeading
            titleId="pricing-heading"
            align="center"
            eyebrow="Pricing"
            title={
              <>
                Priced for the work, not the <Accent>seat count</Accent>.
              </>
            }
            lead="Start free with five redraws a month. Upgrade when SKITE has already paid for itself."
            titleClassName="text-display"
          />
        )}

        {/* Billing toggle */}
        <Reveal delay={0.1} className={cn("flex justify-center", standalone ? "" : "mt-12")}>
          <div className="glass inline-flex items-center gap-1 rounded-full p-1.5">
            {(["monthly", "annual"] as const).map((mode) => {
              const active = (mode === "annual") === annual;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAnnual(mode === "annual")}
                  aria-pressed={active}
                  className={cn(
                    "relative rounded-full px-5 py-2 text-[0.8125rem] font-medium capitalize transition-colors duration-300",
                    active ? "text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-full border border-electric-400/30 bg-[color-mix(in_oklab,var(--color-electric-500)_16%,transparent)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <span className="relative z-10 inline-flex items-center gap-2">
                    {mode}
                    {mode === "annual" ? (
                      <span className="rounded-full bg-success-500/20 px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-success-400">
                        −20%
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-start">
          {pricingTiers.map((tier, index) => {
            const monthly = tier.price;
            const displayed =
              monthly === null
                ? null
                : annual
                  ? Math.round(monthly * (1 - ANNUAL_DISCOUNT))
                  : monthly;

            return (
              <Reveal key={tier.name} delay={index * 0.1} className="h-full">
                <TiltCard intensity={tier.highlight ? 6 : 4} className="h-full">
                  <GlassCard
                    variant={tier.highlight ? "accent" : "glass"}
                    radius="xl"
                    padding="none"
                    className={cn(
                      "flex h-full flex-col gap-7 p-8",
                      tier.highlight && "lg:-my-4 lg:py-12",
                    )}
                  >
                    {tier.highlight ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(46,107,255,0.4),transparent_65%)] blur-2xl"
                      />
                    ) : null}

                    <div className="relative flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-display text-heading font-semibold">{tier.name}</h3>
                        {tier.highlight ? (
                          <Badge variant="accent" size="sm">
                            <Sparkles className="size-3" strokeWidth={2} />
                            Most chosen
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-[0.875rem] text-muted">{tier.tagline}</p>
                    </div>

                    {/* Price */}
                    <div className="relative flex items-end gap-2">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={`${tier.name}-${displayed}`}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -14 }}
                          transition={{ duration: 0.28, ease: EASE.out }}
                          className="font-display text-[3rem] leading-none font-semibold tracking-[-0.045em] tabular-nums"
                        >
                          {displayed === null ? "Let's talk" : inr(displayed)}
                        </motion.span>
                      </AnimatePresence>
                      {displayed !== null ? (
                        <span className="pb-1.5 text-[0.8125rem] text-subtle">{tier.cadence}</span>
                      ) : null}
                    </div>

                    <Button
                      asChild
                      size="lg"
                      variant={tier.highlight ? "primary" : "outline"}
                      magnetic={false}
                      className="w-full"
                    >
                      <Link href={tier.price === null ? "/contact" : "/soon"}>{tier.cta}</Link>
                    </Button>

                    <ul className="flex flex-col gap-3.5 border-t border-border pt-7">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-[0.875rem]">
                          <span
                            className={cn(
                              "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                              tier.highlight
                                ? "bg-[linear-gradient(120deg,var(--color-aqua-500),var(--color-electric-600))] text-white"
                                : "bg-foreground/10 text-foreground",
                            )}
                          >
                            <Check className="size-2.5" strokeWidth={3.5} />
                          </span>
                          <span className="text-muted">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-10 text-center text-[0.8125rem] text-subtle">
            All plans include the photoreal render mode, SSO-ready accounts and
            zero training on your data. Prices in INR, excluding GST.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

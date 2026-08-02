"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Aurora } from "@/components/backdrop/aurora";
import { ParticleField } from "@/components/backdrop/particle-field";
import { Reveal } from "@/components/motion/reveal";
import { WordReveal } from "@/components/motion/text-reveal";
import { Button } from "@/components/ui/button";
import { Accent } from "@/components/ui/section-heading";

/**
 * The closing statement. Deliberately the quietest section on the page in terms
 * of interface — one sentence, two buttons — because after eleven sections of
 * demonstration the only thing left to do is ask.
 */
export function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="grid-paper mask-radial-fade absolute inset-0" />
      <Aurora interactive intensity={0.85} />
      <ParticleField className="opacity-50" maxParticles={70} />

      <div className="container-skite relative py-28 lg:py-40">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
          <h2 className="text-display">
            <WordReveal text="Your next idea is already" className="block" />
            <span className="block">
              <Accent>on a napkin</Accent>
              <span className="text-electric-400">.</span>
            </span>
          </h2>

          <Reveal delay={0.2}>
            <p className="max-w-xl text-lead text-muted">
              Photograph it. Give SKITE eleven seconds. Decide for yourself whether the
              rebuild step was ever really design work.
            </p>
          </Reveal>

          <Reveal delay={0.3} className="mt-2">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/soon" data-cursor="hover" data-cursor-label="Go">
                  Redraw your first sketch
                  <ArrowRight className="size-4" strokeWidth={2} />
                </Link>
              </Button>
              <Button asChild size="xl" variant="glass" magnetic>
                <Link href="/contact">Talk to the team</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <p className="font-mono text-[11px] tracking-[0.08em] text-subtle">
              5 free redraws · No card required · Cancel in one click
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

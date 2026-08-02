"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MousePointer2 } from "lucide-react";
import { useRef } from "react";

import { Aurora } from "@/components/backdrop/aurora";
import { ParticleField } from "@/components/backdrop/particle-field";
import { LineReveal, WordReveal } from "@/components/motion/text-reveal";
import { Parallax } from "@/components/motion/parallax";
import { LazyRedrawScene } from "@/components/three/lazy-redraw-scene";
import { Button } from "@/components/ui/button";
import { Accent } from "@/components/ui/section-heading";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // The hero recedes as the visitor leaves it, so the next section feels like
  // it arrives *over* the hero rather than after it.
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, 1.16]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-32 pb-24 lg:pt-40"
    >
      {/* Layered backdrop: paper grid → aurora → particles */}
      <div className="grid-paper mask-radial-fade absolute inset-0" />
      <Aurora interactive />
      <ParticleField className="opacity-70" />

      {/* 3D scene — anchored to the right half and faded at its inner edge so it
          dissolves into the aurora instead of ending on a hard rectangle. */}
      <motion.div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] lg:block xl:w-[48%]",
          "[mask-image:linear-gradient(to_right,transparent,#000_28%,#000_88%,transparent)]",
          "[-webkit-mask-image:linear-gradient(to_right,transparent,#000_28%,#000_88%,transparent)]",
        )}
        style={reducedMotion ? undefined : { scale: sceneScale }}
      >
        <LazyRedrawScene className="h-full w-full" />
      </motion.div>

      <motion.div
        className="container-skite relative z-10"
        style={reducedMotion ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        <div className="max-w-3xl">
          {/* Announcement */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE.out, delay: 0.15 }}
          >
            <Link
              href="/blog"
              className={cn(
                "group glass glass-sheen inline-flex items-center gap-2.5 rounded-full py-1.5 pr-3 pl-1.5",
                "text-[0.8125rem] transition-colors duration-300 hover:border-border-strong",
              )}
            >
              <span className="rounded-full bg-[linear-gradient(100deg,var(--color-aqua-500),var(--color-electric-600))] px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.1em] text-white uppercase">
                New
              </span>
              <span className="text-muted transition-colors group-hover:text-foreground">
                Structure pass v4 — 94% layout fidelity
              </span>
              <ArrowUpRight
                className="size-3.5 text-subtle transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2}
              />
            </Link>
          </motion.div>

          {/* Headline */}
          <h1 className="mt-8 text-hero">
            <WordReveal text="From sketch to" immediate delay={0.3} className="block" />
            <LineReveal delay={0.55} immediate>
              <Accent>stunning reality</Accent>
              <span className="text-electric-400">.</span>
            </LineReveal>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.85, ease: EASE.out, delay: 0.9 }}
            className="mt-8 max-w-xl text-lead text-muted"
          >
            SKITE turns hand-drawn wireframes, whiteboard photos and Figma frames into
            production-ready websites — or photoreal renders — while preserving the exact
            layout you drew.
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE.out, delay: 1.05 }}
            className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
          >
            <Button asChild size="xl">
              <Link href="/soon" data-cursor="hover" data-cursor-label="Go">
                Redraw your first sketch
                <ArrowRight className="size-4" strokeWidth={2} />
              </Link>
            </Button>

            <Button asChild size="xl" variant="glass" magnetic>
              <Link href="#demo" data-cursor="hover" data-cursor-label="Play">
                <MousePointer2 className="size-4" strokeWidth={2} />
                See it work
              </Link>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.25 }}
            className="mt-6 font-mono text-[11px] tracking-[0.08em] text-subtle"
          >
            5 free redraws · No card required · Your work is never used for training
          </motion.p>
        </div>
      </motion.div>

      {/* Floating sketch fragments — the raw material, drifting in the margins.
          Kept strictly outside the text column: they sit in the page gutter, and
          only appear once the viewport is wide enough to have one. */}
      <Parallax
        speed={0.28}
        className="pointer-events-none absolute top-[18%] left-4 z-0 hidden 2xl:block"
      >
        <FloatingSketch variant="wireframe" className="w-28 rotate-[-8deg] opacity-65" />
      </Parallax>
      <Parallax
        speed={-0.18}
        className="pointer-events-none absolute bottom-[14%] left-2 z-0 hidden 2xl:block"
      >
        <FloatingSketch variant="resolved" className="w-24 rotate-[6deg] opacity-65" />
      </Parallax>

      <ScrollCue />
    </section>
  );
}

/**
 * A miniature of the product's before/after, used as ambient decoration.
 * `wireframe` is the input state, `resolved` is the output state.
 */
function FloatingSketch({
  variant,
  className,
}: {
  variant: "wireframe" | "resolved";
  className?: string;
}) {
  const resolved = variant === "resolved";

  return (
    <div
      aria-hidden
      className={cn(
        "glass glass-sheen animate-float rounded-md p-3 shadow-card",
        className,
      )}
      style={{ animationDelay: resolved ? "-3s" : "0s" }}
    >
      <div className="flex items-center gap-1 pb-2.5">
        {["bg-error-400/60", "bg-warning-400/60", "bg-success-400/60"].map((dot) => (
          <span key={dot} className={cn("size-1.5 rounded-full", dot)} />
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <div
          className={cn(
            "h-10 rounded-xs",
            resolved
              ? "bg-[linear-gradient(110deg,var(--color-aqua-400),var(--color-electric-500)_55%,var(--color-violet-500))] opacity-80"
              : "border border-dashed border-foreground/25",
          )}
        />
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-6 flex-1 rounded-xs",
                resolved
                  ? "bg-foreground/12"
                  : "border border-dashed border-foreground/20",
              )}
            />
          ))}
        </div>
        <div
          className={cn(
            "h-2 w-2/3 rounded-full",
            resolved ? "bg-foreground/20" : "border border-dashed border-foreground/20",
          )}
        />
      </div>
    </div>
  );
}

function ScrollCue() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 1.6 }}
      className="absolute inset-x-0 bottom-8 flex justify-center"
    >
      <div className="flex flex-col items-center gap-3">
        <span className="font-mono text-[10px] tracking-[0.22em] text-subtle uppercase">
          Scroll
        </span>
        <div className="relative h-12 w-px overflow-hidden bg-border">
          {/* A single travelling highlight reads as motion far better than a
              bouncing arrow, and never competes with the CTAs above it. */}
          <motion.div
            className="absolute inset-x-0 h-5 bg-[linear-gradient(180deg,transparent,var(--color-electric-400),transparent)]"
            animate={{ y: ["-100%", "340%"] }}
            transition={{ duration: 2.4, ease: EASE.inOut, repeat: Infinity, repeatDelay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

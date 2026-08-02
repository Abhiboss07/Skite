"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";

import { useHasPointer, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * The living background. Three oversized, heavily-blurred colour fields drift
 * on independent cycles; because they are blurred far past their own size, the
 * overlaps read as a single continuous aurora rather than three blobs.
 *
 * `interactive` adds a fourth field that follows the pointer, which is what
 * makes the page feel responsive even in the empty space between sections.
 */
export function Aurora({
  className,
  interactive = false,
  intensity = 1,
}: {
  className?: string;
  interactive?: boolean;
  intensity?: number;
}) {
  const hasPointer = useHasPointer();
  const reducedMotion = usePrefersReducedMotion();
  const trackPointer = interactive && hasPointer && !reducedMotion;

  const mx = useMotionValue(50);
  const my = useMotionValue(35);
  const sx = useSpring(mx, { stiffness: 42, damping: 22, mass: 1.4 });
  const sy = useSpring(my, { stiffness: 42, damping: 22, mass: 1.4 });

  useEffect(() => {
    if (!trackPointer) return;
    const onMove = (event: PointerEvent) => {
      mx.set((event.clientX / window.innerWidth) * 100);
      my.set((event.clientY / window.innerHeight) * 100);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [trackPointer, mx, my]);

  const pointerGlow = useMotionTemplate`radial-gradient(45rem circle at ${sx}% ${sy}%, rgba(77,124,255,0.22), transparent 60%)`;

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ opacity: `calc(var(--aurora-opacity) * ${intensity})` }}
    >
      <div className="absolute -top-1/3 left-1/2 h-[70vw] w-[70vw] -translate-x-1/2 animate-aurora rounded-full bg-[radial-gradient(circle,rgba(46,107,255,0.42),transparent_62%)] blur-[110px]" />
      <div
        className="absolute top-1/4 -left-[15%] h-[55vw] w-[55vw] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.3),transparent_60%)] blur-[120px]"
        style={{ animationDelay: "-8s", animationDuration: "31s" }}
      />
      <div
        className="absolute -right-[12%] bottom-0 h-[60vw] w-[60vw] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.34),transparent_62%)] blur-[130px]"
        style={{ animationDelay: "-16s", animationDuration: "27s" }}
      />

      {trackPointer ? (
        <motion.div className="absolute inset-0" style={{ background: pointerGlow }} />
      ) : null}
    </div>
  );
}

/**
 * A single positioned glow. Used to seed light behind specific elements so the
 * page reads as lit from within rather than uniformly tinted.
 */
export function GlowOrb({
  className,
  color = "electric",
  size = 32,
  blur = 90,
  opacity = 0.4,
  float = true,
}: {
  className?: string;
  color?: "electric" | "aqua" | "violet";
  /** Diameter in rem. */
  size?: number;
  blur?: number;
  opacity?: number;
  float?: boolean;
}) {
  const fill = {
    electric: "rgba(46,107,255,1)",
    aqua: "rgba(34,211,238,1)",
    violet: "rgba(139,92,246,1)",
  }[color];

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full", float && "animate-float", className)}
      style={{
        width: `${size}rem`,
        height: `${size}rem`,
        opacity,
        filter: `blur(${blur}px)`,
        background: `radial-gradient(circle, ${fill}, transparent 65%)`,
      }}
    />
  );
}

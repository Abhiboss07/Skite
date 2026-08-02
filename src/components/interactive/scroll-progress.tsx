"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Page reading progress. Fixed to the very top of the viewport, above the
 * header, so it never competes with content.
 */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 30,
    restDelta: 0.001,
  });
  // Stay invisible at the very top of the page — a bar at 0% is just noise.
  const opacity = useTransform(scrollYProgress, [0, 0.01], [0, 1]);

  return (
    <motion.div
      aria-hidden
      className={cn(
        "fixed inset-x-0 top-0 z-[80] h-[2px] origin-left",
        "bg-[linear-gradient(90deg,var(--color-aqua-400),var(--color-electric-500)_46%,var(--color-violet-500))]",
        className,
      )}
      style={{ scaleX, opacity }}
    />
  );
}

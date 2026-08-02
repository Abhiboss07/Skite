"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type ParallaxProps = {
  children: ReactNode;
  className?: string;
  /** Positive drifts slower than the page (recedes), negative drifts faster. */
  speed?: number;
  axis?: "y" | "x";
  /** Softens the tie to scroll position so it never feels mechanically locked. */
  smooth?: boolean;
};

/**
 * Moves its children against the scroll to create depth. Values are expressed
 * as a percentage of the element's own size, so a parallax layer behaves the
 * same whether it wraps a 40px badge or a full-bleed image.
 */
export function Parallax({
  children,
  className,
  speed = 0.2,
  axis = "y",
  smooth = true,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const smoothed = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.0005,
  });
  const progress = smooth ? smoothed : scrollYProgress;

  const distance = speed * 100;
  const offset = useTransform(progress, [0, 1], [`${distance}%`, `${-distance}%`]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={cn("will-change-transform", className)}
      style={axis === "y" ? { y: offset } : { x: offset }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scroll-linked scale + fade, used to make hero media settle as the visitor
 * moves past it.
 */
export function ScrollScale({
  children,
  className,
  from = 1.12,
  to = 1,
}: {
  children: ReactNode;
  className?: string;
  from?: number;
  to?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [from, to]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0.4, 1]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div ref={ref} className={cn("will-change-transform", className)} style={{ scale, opacity }}>
      {children}
    </motion.div>
  );
}

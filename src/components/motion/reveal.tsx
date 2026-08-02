"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { DURATION, EASE, VIEWPORT } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 32 },
  down: { x: 0, y: -32 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 },
  none: { x: 0, y: 0 },
};

/** motion's `children` also accepts MotionValue, which a plain div cannot. */
type MotionDivProps = Omit<HTMLMotionProps<"div">, "children"> & { children?: ReactNode };

type RevealProps = Omit<MotionDivProps, "variants"> & {
  direction?: Direction;
  delay?: number;
  duration?: number;
  distance?: number;
  /** Adds a subtle defocus-to-focus, echoing "sketch resolving into reality". */
  blur?: boolean;
};

/**
 * The workhorse scroll entrance. Wrap anything that should arrive as the
 * visitor reaches it. Collapses to a plain div under reduced motion.
 */
export function Reveal({
  direction = "up",
  delay = 0,
  duration = DURATION.base,
  distance,
  blur = true,
  className,
  children,
  ...props
}: RevealProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return (
      <div className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  const base = OFFSET[direction];
  const offset = distance
    ? { x: Math.sign(base.x) * distance, y: Math.sign(base.y) * distance }
    : base;

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, ...offset, filter: blur ? "blur(8px)" : "blur(0px)" }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      viewport={VIEWPORT}
      transition={{ duration, ease: EASE.out, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Parent for a run of children that should cascade in. Children must be
 * <RevealItem> (or any motion element using the "hidden"/"visible" variants).
 */
export function RevealGroup({
  className,
  children,
  stagger = 0.09,
  delay = 0,
  ...props
}: MotionDivProps & { stagger?: number; delay?: number }) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return (
      <div className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: DURATION.base, ease: EASE.out },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

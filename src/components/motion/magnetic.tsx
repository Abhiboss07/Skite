"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

import { useHasPointer, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

type MagneticProps = {
  children: ReactNode;
  className?: string;
  /** How far the element travels toward the cursor, as a fraction of the offset. */
  strength?: number;
  /** Distance in px beyond the element's bounds where the pull begins. */
  radius?: number;
  /** Inner content lags slightly behind the shell for a parallax "weight" feel. */
  contentStrength?: number;
};

/**
 * Wraps any element so it leans toward the cursor when the pointer comes near.
 *
 * The child moves at `contentStrength` while the wrapper moves at `strength`,
 * which produces a subtle internal parallax — the element reads as a solid
 * object with mass rather than a flat sticker.
 *
 * Disabled entirely on touch devices and under reduced-motion.
 */
export function Magnetic({
  children,
  className,
  strength = 0.32,
  radius = 90,
  contentStrength = 0.16,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasPointer = useHasPointer();
  const reducedMotion = usePrefersReducedMotion();
  const enabled = hasPointer && !reducedMotion;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING.magnetic);
  const springY = useSpring(y, SPRING.magnetic);

  const innerX = useTransform(springX, (v) => v * (contentStrength / strength - 1));
  const innerY = useTransform(springY, (v) => v * (contentStrength / strength - 1));

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;

    // Falls off with distance so the pull eases in rather than snapping on.
    const distance = Math.hypot(dx, dy);
    const reach = Math.max(rect.width, rect.height) / 2 + radius;
    const falloff = Math.max(0, 1 - distance / reach);

    x.set(dx * strength * falloff);
    y.set(dy * strength * falloff);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={cn("relative inline-flex will-change-transform", className)}
      style={{ x: springX, y: springY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onBlur={reset}
    >
      <motion.div className="contents" style={{ x: innerX, y: innerY }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

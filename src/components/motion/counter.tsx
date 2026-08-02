"use client";

import { animate, useInView, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { EASE } from "@/lib/motion";

type CounterProps = {
  value: number;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
};

/**
 * Counts up to `value` the first time it scrolls into view.
 *
 * The visible number is rendered aria-hidden with the final value exposed to
 * assistive tech, so screen readers announce "1.2M" once rather than narrating
 * every intermediate frame.
 */
export function Counter({
  value,
  className,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 2,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reducedMotion = usePrefersReducedMotion();
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;

    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    const controls = animate(motionValue, value, {
      duration,
      ease: EASE.out,
      onUpdate: (latest) => setDisplay(latest),
    });

    return () => controls.stop();
  }, [inView, value, duration, motionValue, reducedMotion]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      <span aria-hidden className="tabular-nums">
        {prefix}
        {formatted}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {value.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
        {suffix}
      </span>
    </span>
  );
}

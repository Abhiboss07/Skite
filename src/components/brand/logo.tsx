"use client";

import { motion } from "motion/react";
import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * The SKITE mark: one frame caught mid-transformation.
 *
 * The left half is still a wireframe — dashed stroke, placeholder rules, no
 * colour. The right half has already resolved into the brand spectrum. The
 * seam down the middle is the redraw itself.
 *
 * IDs are namespaced with useId because gradients and clip paths are global in
 * SVG: two logos on one page with hardcoded ids would silently share defs.
 */
export function LogoMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `skite-grad-${uid}`;
  const leftId = `skite-left-${uid}`;
  const rightId = `skite-right-${uid}`;
  const glowId = `skite-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label="SKITE"
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="0.5" stopColor="#4D7CFF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <clipPath id={leftId}>
          <rect x="0" y="0" width="16" height="32" />
        </clipPath>
        <clipPath id={rightId}>
          <rect x="16" y="0" width="16" height="32" />
        </clipPath>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Sketch half — still a wireframe */}
      <g clipPath={`url(#${leftId})`} className="text-foreground">
        <rect
          x="3.4"
          y="3.4"
          width="25.2"
          height="25.2"
          rx="7.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeDasharray="3.1 2.7"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M8.6 12.4h6.2M8.6 17.1h4.1M8.6 21.8h5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.34"
        />
      </g>

      {/* Rendered half — resolved into the brand spectrum */}
      <g clipPath={`url(#${rightId})`}>
        <rect
          x="3.4"
          y="3.4"
          width="25.2"
          height="25.2"
          rx="7.4"
          fill={`url(#${gradientId})`}
        />
        <path
          d="M17.6 12.4h6.2M17.6 17.1h4.1M17.6 21.8h5"
          stroke="#050816"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.42"
        />
      </g>

      {/* The seam: the redraw pass itself */}
      {animated ? (
        <motion.path
          d="M16 2.2v27.6"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.7"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      ) : (
        <path
          d="M16 2.2v27.6"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.7"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
        />
      )}
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("h-7 w-7", markClassName)} />
      {showWordmark ? (
        <span className="font-display text-[1.0625rem] leading-none font-semibold tracking-[-0.02em]">
          SKITE
        </span>
      ) : null}
      <span className="sr-only">SKITE — From Sketch to Stunning Reality</span>
    </span>
  );
}

import type { Transition, Variants } from "motion/react";

/**
 * House motion language. Every animation on the site pulls from this file so
 * the whole experience shares one sense of weight and timing.
 *
 * Rule of thumb used throughout:
 *  - entrances are expo-out (fast start, long settle) — feels confident
 *  - exits are quick and linear-ish — never make the user wait to leave
 *  - anything the cursor drives is a spring — it must feel physical
 */

export const EASE = {
  /** Signature entrance curve. */
  out: [0.16, 1, 0.3, 1],
  /** Symmetric curve for loops and morphs. */
  inOut: [0.87, 0, 0.13, 1],
  /** Slight overshoot for playful, tactile moments. */
  spring: [0.34, 1.56, 0.64, 1],
} as const;

export const SPRING = {
  /** Cursor-following elements. */
  cursor: { type: "spring", stiffness: 380, damping: 32, mass: 0.6 },
  /** Magnetic buttons and tilt cards. */
  magnetic: { type: "spring", stiffness: 260, damping: 22, mass: 0.5 },
  /** Soft, heavy panels. */
  panel: { type: "spring", stiffness: 180, damping: 26, mass: 0.9 },
} satisfies Record<string, Transition>;

export const DURATION = {
  fast: 0.35,
  base: 0.65,
  slow: 0.95,
  reveal: 1.1,
} as const;

/** Standard rise-and-fade entrance. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.base, ease: EASE.out },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE.out } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE.out },
  },
};

/** Parent that walks its children in one after another. */
export function stagger(staggerChildren = 0.08, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren, delayChildren } },
  };
}

/** Per-line mask reveal — pair with the `line-clip` utility on the wrapper. */
export const lineReveal: Variants = {
  hidden: { y: "115%" },
  visible: {
    y: "0%",
    transition: { duration: DURATION.reveal, ease: EASE.out },
  },
};

/** Per-word reveal used in hero headlines. */
export const wordReveal: Variants = {
  hidden: { y: "110%", opacity: 0, rotateX: -55 },
  visible: {
    y: "0%",
    opacity: 1,
    rotateX: 0,
    transition: { duration: 0.9, ease: EASE.out },
  },
};

/** Shared viewport config so scroll-triggered sections fire consistently. */
export const VIEWPORT = { once: true, margin: "-12% 0px -12% 0px" } as const;

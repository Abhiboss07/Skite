"use client";

import { motion } from "motion/react";

import { EASE } from "@/lib/motion";

/**
 * Runs on every navigation (unlike layout.tsx, which persists), which makes it
 * the right place for the page-enter transition.
 *
 * Deliberately restrained: a short rise and defocus. Long page transitions feel
 * luxurious exactly once and then feel slow — the content is the reward.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: EASE.out }}
    >
      {children}
    </motion.div>
  );
}

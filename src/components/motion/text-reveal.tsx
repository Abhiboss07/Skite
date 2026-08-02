"use client";

import { motion } from "motion/react";
import type { ElementType, ReactNode } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { EASE, VIEWPORT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Narrowed so TS can resolve className/children — bare ElementType cannot. */
type TextTag = ElementType<{ className?: string; children?: ReactNode }>;

type WordRevealProps = {
  text: string;
  as?: TextTag;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  /** Play immediately instead of waiting for the element to scroll into view. */
  immediate?: boolean;
};

/**
 * Headline reveal: each word swings up from behind a mask with a slight
 * rotateX, so the type reads as physical cards flipping into place rather than
 * a generic fade. The mask is what sells it — without `line-clip` the words
 * would visibly slide in from outside their box.
 */
export function WordReveal({
  text,
  as: Tag = "span" as TextTag,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.055,
  immediate = false,
}: WordRevealProps) {
  const reducedMotion = usePrefersReducedMotion();
  const words = text.split(" ");

  if (reducedMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  const animationProps = immediate
    ? { animate: "visible" as const }
    : { whileInView: "visible" as const, viewport: VIEWPORT };

  return (
    <Tag className={className}>
      <motion.span
        className="inline"
        initial="hidden"
        {...animationProps}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
        }}
        style={{ perspective: "800px" }}
      >
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="line-clip inline-flex overflow-hidden align-bottom">
            <motion.span
              className={cn("inline-block will-change-transform", wordClassName)}
              variants={{
                hidden: { y: "110%", opacity: 0, rotateX: -60 },
                visible: {
                  y: "0%",
                  opacity: 1,
                  rotateX: 0,
                  transition: { duration: 0.95, ease: EASE.out },
                },
              }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/**
 * Reveals arbitrary JSX (so a line can contain gradients, serif accents, links)
 * as one masked line. Use one per visual line of a headline.
 */
export function LineReveal({
  children,
  className,
  delay = 0,
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  immediate?: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <span className={cn("block", className)}>{children}</span>;
  }

  const animationProps = immediate
    ? { animate: { y: "0%", opacity: 1 } }
    : { whileInView: { y: "0%", opacity: 1 }, viewport: VIEWPORT };

  return (
    <span className={cn("line-clip", className)}>
      <motion.span
        className="block will-change-transform"
        initial={{ y: "115%", opacity: 0 }}
        {...animationProps}
        transition={{ duration: 1.05, ease: EASE.out, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/**
 * Body copy that resolves character-group by character-group as it enters —
 * the typographic equivalent of a sketch sharpening into a render.
 */
export function CharacterFade({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.012, delayChildren: delay } },
      }}
      aria-label={text}
    >
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block whitespace-pre"
          variants={{
            hidden: { opacity: 0, filter: "blur(5px)", y: 6 },
            visible: {
              opacity: 1,
              filter: "blur(0px)",
              y: 0,
              transition: { duration: 0.5, ease: EASE.out },
            },
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

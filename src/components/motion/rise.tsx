import type { CSSProperties, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Narrowed so TS can resolve className/children — bare ElementType cannot. */
type RiseTag = ElementType<{ className?: string; style?: CSSProperties; children?: ReactNode }>;

/**
 * Above-the-fold entrance, driven entirely by CSS.
 *
 * This is a server component on purpose. Motion serialises its `initial` prop
 * into the server HTML, so a JS-driven entrance ships as `opacity: 0` and the
 * content cannot paint until the bundle has downloaded, parsed and hydrated —
 * which measured as a 4.5s LCP. A CSS animation starts at first paint and
 * needs no JavaScript at all, so the text is on screen immediately.
 *
 * Use this for anything in the first viewport. Below the fold, keep using
 * <Reveal>: those elements are meant to be invisible until scrolled to, so they
 * cost nothing and Motion's viewport handling is better.
 */
export function Rise({
  children,
  className,
  delay = 0,
  as: Tag = "div" as RiseTag,
}: {
  children: ReactNode;
  className?: string;
  /** Milliseconds. Stagger siblings by passing increasing values. */
  delay?: number;
  as?: RiseTag;
}) {
  return (
    <Tag
      className={cn("enter", className)}
      style={delay ? ({ "--enter-delay": `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * Headline reveal: each word swings up from behind a mask. CSS-only, so the
 * words are present and paintable in the server HTML.
 */
export function WordRise({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 55,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  /** Milliseconds before the first word starts. */
  delay?: number;
  /** Milliseconds between words. */
  stagger?: number;
}) {
  const words = text.split(" ");

  return (
    <span className={cn("inline", className)} style={{ perspective: "800px" }}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="line-clip inline-flex overflow-hidden align-bottom">
          <span
            className={cn("word-enter inline-block will-change-transform", wordClassName)}
            style={{ "--enter-delay": `${delay + i * stagger}ms` } as React.CSSProperties}
          >
            {word}
          </span>
          {i < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </span>
      ))}
    </span>
  );
}

/**
 * Reveals arbitrary JSX as one masked line — for headline lines that contain
 * gradients or the serif accent and so cannot be split on spaces.
 */
export function LineRise({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <span className={cn("line-clip", className)}>
      <span
        className="word-enter block will-change-transform"
        style={{ "--enter-delay": `${delay}ms` } as React.CSSProperties}
      >
        {children}
      </span>
    </span>
  );
}

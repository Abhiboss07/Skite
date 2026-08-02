"use client";

import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/**
 * The eyebrow label. A short monospaced tag with a leading rule — it gives every
 * section a consistent "chapter marker" and keeps headlines from floating.
 */
export function Eyebrow({
  children,
  className,
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 font-mono text-eyebrow text-subtle uppercase",
        align === "center" && "justify-center",
        className,
      )}
    >
      <span
        aria-hidden
        className="h-px w-7 bg-[linear-gradient(90deg,transparent,var(--color-electric-400))]"
      />
      {children}
    </span>
  );
}

type SectionHeadingProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
  leadClassName?: string;
  /** Heading level — keeps the document outline correct per page. */
  as?: "h1" | "h2" | "h3";
  children?: ReactNode;
};

/**
 * Standard section header used across every page. Centralising it is what keeps
 * 19 pages feeling like one product rather than 19 designs.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  titleClassName,
  leadClassName,
  as: Tag = "h2",
  children,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "mx-auto items-center text-center",
        align === "center" ? "max-w-3xl" : "max-w-2xl",
        className,
      )}
    >
      {eyebrow ? (
        <Reveal duration={0.5}>
          <Eyebrow align={align}>{eyebrow}</Eyebrow>
        </Reveal>
      ) : null}

      <Reveal delay={0.06}>
        <Tag className={cn("text-title text-balance", titleClassName)}>{title}</Tag>
      </Reveal>

      {lead ? (
        <Reveal delay={0.12}>
          <p className={cn("text-lead text-muted", leadClassName)}>{lead}</p>
        </Reveal>
      ) : null}

      {children ? <Reveal delay={0.18}>{children}</Reveal> : null}
    </div>
  );
}

/**
 * Renders the emotional word of a headline in the accent serif italic.
 * This pairing — geometric grotesque + one serif italic word — is the SKITE
 * headline signature.
 */
export function Accent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <em className={cn("font-serif font-normal italic text-brand-gradient", className)}>{children}</em>
  );
}

"use client";

import { Children, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type MarqueeProps = {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  reverse?: boolean;
  /** Seconds for one full cycle. Larger = slower. */
  speed?: number;
  /** Slow to a crawl while the pointer is over the track. */
  pauseOnHover?: boolean;
  /** Fade the left and right edges into the background. */
  fade?: boolean;
};

/**
 * Seamless infinite marquee.
 *
 * The track holds two identical copies of the content and translates by exactly
 * -50%, so the second copy lands precisely where the first began — that is what
 * makes the loop invisible. Duplicated content is aria-hidden so screen readers
 * hear each item once.
 */
export function Marquee({
  children,
  className,
  itemClassName,
  reverse = false,
  speed = 42,
  pauseOnHover = true,
  fade = true,
}: MarqueeProps) {
  const items = Children.toArray(children);

  const renderTrack = (ariaHidden: boolean) =>
    items.map((child, i) => (
      <li key={i} className={cn("shrink-0", itemClassName)} aria-hidden={ariaHidden || undefined}>
        {child}
      </li>
    ));

  return (
    <div
      className={cn(
        "group/marquee relative flex w-full overflow-hidden",
        fade && "mask-fade-x",
        className,
      )}
    >
      <ul
        className={cn(
          "flex w-max min-w-full shrink-0 items-center will-change-transform",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
          pauseOnHover && "group-hover/marquee:[animation-play-state:paused]",
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {renderTrack(false)}
        {renderTrack(true)}
      </ul>
    </div>
  );
}

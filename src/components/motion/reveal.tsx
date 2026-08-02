"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<Direction, { x: string; y: string }> = {
  up: { x: "0", y: "32px" },
  down: { x: "0", y: "-32px" },
  left: { x: "40px", y: "0" },
  right: { x: "-40px", y: "0" },
  none: { x: "0", y: "0" },
};

/** Fires once when the element scrolls into view. */
function useInViewOnce<T extends HTMLElement>(margin = "-12% 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion: show immediately, never animate. This is a browser-only
    // query, so it cannot be resolved during render without breaking hydration.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [margin]);

  return { ref, shown };
}

type RevealProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children?: ReactNode;
  direction?: Direction;
  /** Seconds, to match the previous Motion-based API. */
  delay?: number;
  duration?: number;
  distance?: number;
  blur?: boolean;
};

/**
 * The workhorse scroll entrance. Wrap anything that should arrive as the
 * visitor reaches it.
 *
 * Previously this was a Motion component. It appears roughly a hundred times
 * across the site, which meant Motion was pulled into the bundle of every
 * single route just to fade things in. This version is an IntersectionObserver
 * plus a CSS transition — visually identical, a fraction of the JavaScript.
 *
 * For content in the *first* viewport use <Rise> instead: this one starts at
 * opacity 0 in the server HTML, which would delay LCP.
 */
export function Reveal({
  direction = "up",
  delay = 0,
  duration = 0.65,
  distance,
  blur = true,
  className,
  children,
  style,
  ...props
}: RevealProps) {
  const { ref, shown } = useInViewOnce<HTMLDivElement>();

  const base = OFFSET[direction];
  const offset = distance
    ? {
        x: base.x === "0" ? "0" : `${base.x.startsWith("-") ? -distance : distance}px`,
        y: base.y === "0" ? "0" : `${base.y.startsWith("-") ? -distance : distance}px`,
      }
    : base;

  return (
    <div
      ref={ref}
      data-shown={shown ? "" : undefined}
      className={cn("js-reveal", className)}
      style={
        {
          "--reveal-x": offset.x,
          "--reveal-y": offset.y,
          "--reveal-blur": blur ? "8px" : "0px",
          "--reveal-delay": `${Math.round(delay * 1000)}ms`,
          "--reveal-duration": `${Math.round(duration * 1000)}ms`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Parent for a run of children that should cascade in. Each child is given an
 * increasing transition delay; the group reveals as a unit.
 */
export function RevealGroup({
  className,
  children,
  stagger = 0.09,
  delay = 0,
  style,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children?: ReactNode;
  stagger?: number;
  delay?: number;
}) {
  const { ref, shown } = useInViewOnce<HTMLDivElement>();

  return (
    <div
      ref={ref}
      data-shown={shown ? "" : undefined}
      className={cn("js-reveal-group", className)}
      style={style}
      {...props}
    >
      {Children.map(children, (child, index) =>
        isValidElement(child) ? (
          // `display: contents` so this wrapper never affects layout; it exists
          // only to hand the child its stagger offset through CSS inheritance.
          <div
            className="contents"
            style={
              { "--reveal-delay": `${Math.round((delay + index * stagger) * 1000)}ms` } as CSSProperties
            }
          >
            {child}
          </div>
        ) : (
          child
        ),
      )}
    </div>
  );
}

export function RevealItem({
  className,
  children,
  style,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "children"> & { children?: ReactNode }) {
  return (
    <div
      className={cn("js-reveal", className)}
      style={{ "--reveal-y": "26px", ...style } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}

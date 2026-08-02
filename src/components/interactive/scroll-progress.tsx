"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Page reading progress. Fixed to the very top of the viewport, above the
 * header, so it never competes with content.
 *
 * Plain DOM rather than Motion. `useSpring` gave the bar a pleasant liquid lag,
 * but it is a permanently running WAAPI animation — it survived unmounting the
 * spring variant under reduced motion (React reuses the host node), leaving one
 * animation running for visitors who explicitly asked for none. A rAF-throttled
 * scroll listener writing a transform is exact, costs nothing, and honours the
 * preference by simply omitting the CSS transition.
 */
export function ScrollProgress({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const progress = scrollable > 0 ? doc.scrollTop / scrollable : 0;
      el.style.transform = `scaleX(${progress})`;
      // A bar sitting at 0% is just noise at the top of the page.
      el.style.opacity = progress > 0.005 ? "1" : "0";
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "fixed inset-x-0 top-0 z-[80] h-[2px] origin-left opacity-0",
        "bg-[linear-gradient(90deg,var(--color-aqua-400),var(--color-electric-500)_46%,var(--color-violet-500))]",
        // Short transition smooths the per-frame writes into a fluid bar. The
        // global reduced-motion rule collapses it to nothing.
        "transition-[transform,opacity] duration-150 ease-out",
        className,
      )}
      style={{ transform: "scaleX(0)" }}
    />
  );
}

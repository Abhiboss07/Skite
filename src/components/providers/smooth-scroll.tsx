"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";

const LenisContext = createContext<Lenis | null>(null);

/** Access the live Lenis instance (e.g. to scroll to an anchor, or to lock scroll). */
export function useLenis() {
  return useContext(LenisContext);
}

/**
 * Owns the page's scroll behaviour.
 *
 * Lenis replaces the browser's scroll easing with an interpolated one. It drives
 * the real scroll position, so anything reading native scroll — Motion's
 * `useScroll`, IntersectionObserver, `whileInView` — follows it for free.
 *
 * This previously ran Lenis off GSAP's ticker to keep ScrollTrigger in sync.
 * Nothing in this codebase uses ScrollTrigger (every scroll animation is
 * Motion), so GSAP was ~55kB gzipped of dependency existing only to synchronise
 * a library nobody called. Lenis's own RAF loop does the job.
 *
 * Fully disabled when the visitor prefers reduced motion.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (reducedMotion) return;

    // Constructing Lenis binds listeners and starts a RAF loop. Holding it
    // until the browser is idle keeps that work off the critical path; native
    // scrolling works perfectly in the meantime, so nothing is broken while we
    // wait — it just isn't eased yet.
    let instance: Lenis | null = null;

    const init = () => {
      instance = new Lenis({
        duration: 1.05,
        // Expo-out: matches the entrance curve used everywhere else on the site.
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6,
        wheelMultiplier: 1,
        autoRaf: true,
      });

      // Lenis is exactly the "external system" this rule exists to allow; the
      // instance must be published to context so children can drive scrolling.
      setLenis(instance);
    };

    const schedule = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const handle = schedule(init) as unknown as number;

    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
      instance?.destroy();
      setLenis(null);
    };
  }, [reducedMotion]);

  // App Router keeps the scroll position on soft navigation when a transition
  // is animating; reset it explicitly so every page starts at the top.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, lenis]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

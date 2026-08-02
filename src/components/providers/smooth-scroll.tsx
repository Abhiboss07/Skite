"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";

const LenisContext = createContext<Lenis | null>(null);

/** Access the live Lenis instance (e.g. to scroll to an anchor, or to lock scroll). */
export function useLenis() {
  return useContext(LenisContext);
}

/**
 * Owns the page's scroll behaviour.
 *
 * Lenis replaces the browser's scroll easing with an interpolated one, and GSAP's
 * ticker drives its RAF loop so ScrollTrigger, Lenis and every GSAP timeline
 * advance on the exact same frame — mixing two RAF loops is what causes the
 * classic "scroll-linked animation lags one frame behind" jitter.
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

    gsap.registerPlugin(ScrollTrigger);

    const instance = new Lenis({
      duration: 1.05,
      // Expo-out: matches the entrance curve used everywhere else on the site.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
      wheelMultiplier: 1,
      autoRaf: false,
    });

    // Lenis is exactly the "external system" this rule exists to allow; the
    // instance must be published to context so children can drive scrolling.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLenis(instance);

    const onScroll = () => ScrollTrigger.update();
    instance.on("scroll", onScroll);

    // GSAP's ticker reports seconds; Lenis expects milliseconds.
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(raf);
      instance.off("scroll", onScroll);
      instance.destroy();
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
    ScrollTrigger.refresh();
  }, [pathname, lenis]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

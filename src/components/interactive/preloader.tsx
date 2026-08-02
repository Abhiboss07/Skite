"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { LogoMark } from "@/components/brand/logo";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { EASE } from "@/lib/motion";
import { siteConfig } from "@/lib/site";

const SESSION_KEY = "skite:intro-played";
const PHASES = ["Reading strokes", "Inferring structure", "Resolving surfaces", "Ready"] as const;

/**
 * First-impression curtain.
 *
 * Shown once per session (sessionStorage) so returning to the homepage mid-visit
 * is instant. It is a pure overlay — the real page is already rendered and
 * hydrating underneath, so this costs nothing in crawlability or LCP of the
 * content itself.
 *
 * The counter is driven by a fake-but-eased progression rather than real load
 * events: actual asset timing is jumpy and produces an ugly stuttering number.
 */
export function Preloader() {
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  // Decide on mount, not during render — sessionStorage is client-only and
  // reading it during render would desync hydration.
  useEffect(() => {
    // Disabled by default — see siteConfig.features.introCurtain for the
    // measured LCP cost and the reasoning.
    if (!siteConfig.features.introCurtain) return;
    if (reducedMotion) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    // sessionStorage is a browser-only API, so this decision cannot be made
    // during render without desyncing hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(true);
    setReady(true);
  }, [reducedMotion]);

  useEffect(() => {
    if (!active) return;

    document.body.style.overflow = "hidden";
    const start = performance.now();
    // Kept deliberately short. Every millisecond here is added directly to
    // Speed Index, and at 1.9s the curtain was the single largest performance
    // cost on the homepage. Just long enough to register as intent.
    const DURATION = 1100;
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // Expo-out so the number sprints early then settles — reads as "fast".
      const eased = 1 - Math.pow(2, -10 * t);
      setProgress(Math.round(eased * 100));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        sessionStorage.setItem(SESSION_KEY, "1");
        setTimeout(() => setActive(false), 140);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
    };
  }, [active]);

  if (!ready) return null;

  const phase = PHASES[Math.min(PHASES.length - 1, Math.floor((progress / 100) * PHASES.length))];

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 0.7, ease: EASE.inOut }}
          aria-hidden
        >
          <div className="grid-paper mask-radial-fade absolute inset-0 opacity-70" />

          <motion.div
            className="relative flex flex-col items-center gap-7"
            exit={{ y: -34, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE.out }}
          >
            <LogoMark className="h-14 w-14" animated />

            <div className="flex flex-col items-center gap-3">
              <div className="font-display text-5xl leading-none font-semibold tracking-[-0.04em]">
                {/* Fixed 3-character box. Letting the number size itself grew it
                    from "0%" to "100%" mid-count, shifting this centred stack on
                    every digit — a measurable CLS contribution. */}
                <span className="inline-block w-[3ch] text-right tabular-nums">{progress}</span>
                <span className="text-muted">%</span>
              </div>

              {/* Progress rail */}
              <div className="h-px w-52 overflow-hidden bg-border">
                <motion.div
                  className="h-full origin-left bg-[linear-gradient(90deg,var(--color-aqua-400),var(--color-electric-500),var(--color-violet-500))]"
                  style={{ scaleX: progress / 100 }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={phase}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28 }}
                  className="font-mono text-[10px] tracking-[0.22em] text-subtle uppercase"
                >
                  {phase}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

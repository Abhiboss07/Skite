"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

import { useHasPointer, usePrefersReducedMotion } from "@/hooks/use-media-query";

type CursorState = "default" | "hover" | "text" | "drag" | "view";

/**
 * Two-part cursor: a hard dot pinned exactly to the pointer, and a soft ring
 * that springs after it. The lag between the two is the whole effect — it reads
 * as intention (the dot) trailed by presence (the ring).
 *
 * State is driven by `data-cursor` attributes on elements anywhere in the tree,
 * so any component can change the cursor without importing anything:
 *
 *   <button data-cursor="hover" data-cursor-label="Upload">
 *
 * Never renders on touch devices or under reduced-motion; the native cursor is
 * only hidden (via `cursor-none-desktop`) when this is actually active.
 */
export function CustomCursor() {
  const hasPointer = useHasPointer();
  const reducedMotion = usePrefersReducedMotion();
  const enabled = hasPointer && !reducedMotion;

  const [state, setState] = useState<CursorState>("default");
  const [label, setLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const ringX = useSpring(x, { stiffness: 220, damping: 26, mass: 0.7 });
  const ringY = useSpring(y, { stiffness: 220, damping: 26, mass: 0.7 });

  useEffect(() => {
    if (!enabled) return;

    document.documentElement.classList.add("has-custom-cursor");

    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      if (!visible) setVisible(true);

      const target = event.target as Element | null;
      const owner = target?.closest?.("[data-cursor]") as HTMLElement | null;

      if (owner) {
        setState((owner.dataset.cursor as CursorState) || "hover");
        setLabel(owner.dataset.cursorLabel ?? null);
        return;
      }

      // Anything interactive gets the hover treatment for free.
      const interactive = target?.closest?.(
        'a, button, [role="button"], input, textarea, select, summary',
      );
      setState(interactive ? "hover" : "default");
      setLabel(null);
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled, visible, x, y]);

  if (!enabled) return null;

  const ringSize = label ? 76 : state === "hover" ? 52 : state === "text" ? 6 : 34;
  const dotScale = state === "hover" || label ? 0 : pressed ? 0.6 : 1;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999] hidden lg:block">
      {/* Soft trailing ring */}
      <motion.div
        className="absolute top-0 left-0 flex items-center justify-center rounded-full border border-electric-400/60 bg-electric-400/5 backdrop-blur-[1px]"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: ringSize,
          height: ringSize,
          opacity: visible ? 1 : 0,
          scale: pressed ? 0.86 : 1,
          borderColor: label ? "rgba(102,144,255,0)" : "rgba(102,144,255,0.6)",
          backgroundColor: label ? "rgba(46,107,255,0.92)" : "rgba(102,144,255,0.05)",
        }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        <AnimatePresence>
          {label ? (
            <motion.span
              key={label}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18 }}
              className="font-mono text-[9px] font-medium tracking-[0.14em] text-white uppercase"
            >
              {label}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* Hard dot, locked to the true pointer position */}
      <motion.div
        className="absolute top-0 left-0 h-1.5 w-1.5 rounded-full bg-foreground"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        animate={{ scale: visible ? dotScale : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </div>
  );
}

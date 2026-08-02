"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * Theme switch with a circular View Transition wipe originating from the
 * button itself, so the new theme reads as *spreading out from the click*
 * rather than snapping.
 *
 * Falls back to an instant swap wherever View Transitions aren't supported or
 * the visitor prefers reduced motion — the feature is pure enhancement.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  // Theme is unknowable on the server; render a stable placeholder until mount
  // to avoid a hydration mismatch on the icon.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";

    const supportsViewTransition =
      typeof document !== "undefined" && "startViewTransition" in document;

    if (!supportsViewTransition || reducedMotion || !ref.current) {
      setTheme(next);
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    // Radius must reach the furthest corner or the wipe leaves an unpainted edge.
    const radius = Math.hypot(
      Math.max(originX, window.innerWidth - originX),
      Math.max(originY, window.innerHeight - originY),
    );

    document.documentElement.style.setProperty("--theme-x", `${originX}px`);
    document.documentElement.style.setProperty("--theme-y", `${originY}px`);
    document.documentElement.style.setProperty("--theme-r", `${radius}px`);

    (
      document as Document & { startViewTransition: (cb: () => void) => void }
    ).startViewTransition(() => setTheme(next));
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={toggle}
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Switch theme"}
      className={cn(
        "group relative grid size-10 place-items-center rounded-md border border-border",
        "text-muted transition-colors duration-300",
        "hover:border-border-strong hover:text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500",
          "bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--color-electric-500)_28%,transparent),transparent_70%)]",
          "group-hover:opacity-100",
        )}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={mounted ? (isDark ? "moon" : "sun") : "placeholder"}
          initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {mounted && !isDark ? (
            <Sun className="size-4.5" strokeWidth={1.75} />
          ) : (
            <Moon className="size-4.5" strokeWidth={1.75} />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

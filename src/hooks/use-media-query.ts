"use client";

import { useSyncExternalStore } from "react";

/**
 * SSR-safe media query hook. Uses useSyncExternalStore so the server snapshot
 * is explicit (false) and there is no hydration flash.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True when the visitor has asked the OS to reduce motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** True on devices with a precise pointer — where hover effects make sense. */
export function useHasPointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

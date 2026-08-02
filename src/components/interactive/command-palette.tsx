"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * cmdk + Radix Dialog are only meaningful once the visitor opens the palette,
 * so the body is code-split and fetched on first open. The provider itself is
 * a few hundred bytes: state plus a keydown listener.
 */
const CommandPaletteDialog = dynamic(
  () => import("@/components/interactive/command-palette-dialog"),
  { ssr: false },
);

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/** Lets any component (header button, footer link, empty states) open ⌘K. */
export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used inside <CommandPaletteProvider>");
  }
  return context;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Latched on first open so the chunk stays mounted and reopening is instant.
  // Flipped from event handlers, never during render.
  const [mounted, setMounted] = useState(false);

  const openPalette = useCallback((next: boolean) => {
    if (next) setMounted(true);
    setOpen(next);
  }, []);

  const toggle = useCallback(() => {
    setMounted(true);
    setOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({ open, setOpen: openPalette, toggle }),
    [open, openPalette, toggle],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // ⌘K / Ctrl-K opens; "/" opens too, but only when not already typing.
      const isShortcut = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if (isShortcut || (event.key === "/" && !typing && !open)) {
        event.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggle, open]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {mounted ? <CommandPaletteDialog open={open} setOpen={openPalette} /> : null}
    </CommandPaletteContext.Provider>
  );
}

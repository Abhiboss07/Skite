"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Gate for the custom cursor.
 *
 * The cursor is meaningless without a fine pointer, and on touch devices the
 * component previously still shipped and hydrated just to render null. This
 * wrapper checks the pointer first and only then fetches the chunk, so phones
 * and tablets never download it at all.
 */
const CustomCursor = dynamic(
  () => import("@/components/interactive/custom-cursor").then((m) => m.CustomCursor),
  { ssr: false },
);

export function CursorMount() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(mql.matches && !reduced.matches);
    update();
    mql.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      mql.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  return enabled ? <CustomCursor /> : null;
}

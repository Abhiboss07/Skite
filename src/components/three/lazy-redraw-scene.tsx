"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { useIsDesktop, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * three, R3F and drei are ~150kB gzipped combined. Loading them eagerly would
 * dominate the homepage bundle for a decoration, so the scene is code-split and
 * only requested once we know the device should get it.
 */
const RedrawScene = dynamic(
  () => import("@/components/three/redraw-scene").then((mod) => mod.RedrawScene),
  { ssr: false, loading: () => <SketchOrb /> },
);

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export function LazyRedrawScene({ className }: { className?: string }) {
  const isDesktop = useIsDesktop();
  const reducedMotion = usePrefersReducedMotion();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [idle, setIdle] = useState(false);

  // WebGL support can only be probed in the browser, so it has to land after
  // mount; there is no server-renderable answer to snapshot.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setWebgl(supportsWebGL()), []);

  // Wait for the main thread to settle before pulling in the 3D chunk, so the
  // hero's text and CTAs are interactive first.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const schedule =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400));
    const handle = schedule(() => setIdle(true));
    return () => {
      if (window.cancelIdleCallback && typeof handle === "number") {
        window.cancelIdleCallback(handle);
      }
    };
  }, []);

  // Machines reporting very few cores are usually low-power laptops or
  // virtualised environments where WebGL falls back to software rasterisation
  // — there the scene costs main-thread time instead of GPU time. They get the
  // SVG composition, which carries the same idea.
  const capableDevice =
    typeof navigator === "undefined" || (navigator.hardwareConcurrency ?? 8) >= 4;

  const shouldRender3D = isDesktop && webgl === true && !reducedMotion && idle && capableDevice;

  if (!shouldRender3D) {
    return <SketchOrb className={className} />;
  }

  return <RedrawScene className={className} />;
}

/**
 * The fallback is not a spinner — it is the same idea drawn in SVG. Phones,
 * reduced-motion visitors and WebGL-less browsers get a composition that still
 * says "wireframe becoming render", just without the GPU.
 */
function SketchOrb({ className }: { className?: string }) {
  return (
    <div className={cn("relative grid place-items-center", className)} aria-hidden>
      <svg viewBox="0 0 400 400" className="h-full max-h-[32rem] w-full max-w-[32rem]">
        <defs>
          <linearGradient id="orb-fill" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#4D7CFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.85" />
          </linearGradient>
          <clipPath id="orb-lower">
            <rect x="0" y="200" width="400" height="200" />
          </clipPath>
          <clipPath id="orb-upper">
            <rect x="0" y="0" width="400" height="200" />
          </clipPath>
          <filter id="orb-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <circle cx="200" cy="200" r="120" fill="url(#orb-fill)" opacity="0.28" filter="url(#orb-blur)" />

        {/* Resolved lower half */}
        <g clipPath="url(#orb-lower)">
          <circle cx="200" cy="200" r="116" fill="url(#orb-fill)" opacity="0.5" />
          <circle cx="200" cy="200" r="116" fill="none" stroke="url(#orb-fill)" strokeWidth="1.5" />
        </g>

        {/* Unresolved upper half — latitude and longitude strokes only */}
        <g clipPath="url(#orb-upper)" stroke="currentColor" fill="none" className="text-electric-400/45">
          <circle cx="200" cy="200" r="116" strokeWidth="1.4" strokeDasharray="5 4" />
          {[0.32, 0.6, 0.85].map((k, i) => (
            <ellipse key={i} cx="200" cy="200" rx={116 * k} ry="116" strokeWidth="1" opacity="0.7" />
          ))}
          {[-70, -35, 0].map((offset, i) => (
            <ellipse key={i} cx="200" cy={200 + offset} rx="116" ry={116 * 0.28} strokeWidth="1" opacity="0.55" />
          ))}
        </g>

        {/* The scan seam */}
        <line
          x1="60"
          y1="200"
          x2="340"
          y2="200"
          stroke="#67E8F9"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}

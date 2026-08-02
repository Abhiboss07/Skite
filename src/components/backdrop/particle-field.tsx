"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  alpha: number;
};

const PALETTE = [
  [102, 144, 255], // electric-400
  [34, 211, 238], // aqua-400
  [167, 139, 250], // violet-400
];

/**
 * Canvas particle field with proximity linking — the "network of ideas" motif.
 *
 * Deliberately canvas rather than DOM: a few hundred animated nodes as elements
 * would thrash layout every frame. Density scales with viewport area (capped),
 * and the whole thing pauses when scrolled offscreen so it costs nothing on the
 * rest of the page.
 */
export function ParticleField({
  className,
  density = 0.00009,
  maxParticles = 130,
  linkDistance = 130,
  interactive = true,
}: {
  className?: string;
  density?: number;
  maxParticles?: number;
  linkDistance?: number;
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frame = 0;
    let running = true;
    const pointer = { x: -9999, y: -9999 };

    // Retina-crisp without paying for 3x pixels on high-DPI phones.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const seed = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(maxParticles, Math.floor(width * height * density));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.random() * 1.6 + 0.5,
        hue: Math.floor(Math.random() * PALETTE.length),
        alpha: Math.random() * 0.45 + 0.25,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap rather than bounce — bouncing creates visible "walls".
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        if (interactive) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140 && dist > 0.001) {
            // Gentle repulsion so the field parts around the cursor.
            const push = (1 - dist / 140) * 0.5;
            p.x += (dx / dist) * push;
            p.y += (dy / dist) * push;
          }
        }

        const [r, g, b] = PALETTE[p.hue];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.fill();
      }

      // Link nearby particles. O(n²) is fine at n ≤ 130 and reads far better
      // than a spatial grid would at this scale.
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > linkDistance * linkDistance) continue;

          const opacity = (1 - Math.sqrt(distSq) / linkDistance) * 0.16;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(126,164,255,${opacity})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      if (running) frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    seed();
    frame = requestAnimationFrame(draw);

    const resizeObserver = new ResizeObserver(seed);
    resizeObserver.observe(canvas);

    // Stop burning frames once the field scrolls out of view.
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          frame = requestAnimationFrame(draw);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(frame);
        }
      },
      { threshold: 0 },
    );
    visibility.observe(canvas);

    if (interactive) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [density, maxParticles, linkDistance, interactive, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}

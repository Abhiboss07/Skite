"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

import { useHasPointer, usePrefersReducedMotion } from "@/hooks/use-media-query";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees at the card's corners. */
  intensity?: number;
  /** Pointer-tracking specular highlight across the surface. */
  glare?: boolean;
  /** Border that lights up nearest the cursor. */
  spotlightBorder?: boolean;
  /** How far the card lifts toward the viewer on hover, in px. */
  lift?: number;
};

/**
 * A card that rotates in 3D toward the cursor, with a glare that tracks the
 * pointer across its surface and a border that brightens where the cursor is.
 *
 * Together these three cues (rotation, specular, edge light) are what make a
 * flat rectangle read as a physical pane of glass — any one alone looks cheap.
 */
export function TiltCard({
  children,
  className,
  intensity = 9,
  glare = true,
  spotlightBorder = true,
  lift = 14,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasPointer = useHasPointer();
  const reducedMotion = usePrefersReducedMotion();
  const enabled = hasPointer && !reducedMotion;

  // Normalised pointer position within the card, -0.5 → 0.5 on each axis.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  // Raw pixel position, used to place the glare and spotlight.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const hovered = useMotionValue(0);

  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [intensity, -intensity]), SPRING.magnetic);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-intensity, intensity]), SPRING.magnetic);
  const z = useSpring(useTransform(hovered, [0, 1], [0, lift]), SPRING.magnetic);
  const glareOpacity = useSpring(useTransform(hovered, [0, 1], [0, 0.16]), SPRING.magnetic);
  const spotOpacity = useSpring(useTransform(hovered, [0, 1], [0, 1]), SPRING.magnetic);

  const glareBackground = useMotionTemplate`radial-gradient(320px circle at ${mx}px ${my}px, rgba(255,255,255,0.9), transparent 65%)`;
  const spotlightBackground = useMotionTemplate`radial-gradient(280px circle at ${mx}px ${my}px, rgba(102,144,255,0.7), rgba(34,211,238,0.25) 40%, transparent 70%)`;

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    mx.set(localX);
    my.set(localY);
    px.set(localX / rect.width - 0.5);
    py.set(localY / rect.height - 0.5);
  };

  const handleEnter = () => enabled && hovered.set(1);
  const handleLeave = () => {
    hovered.set(0);
    px.set(0);
    py.set(0);
  };

  if (!enabled) {
    return <div className={cn("relative", className)}>{children}</div>;
  }

  return (
    <div className="perspective-card">
      <motion.div
        ref={ref}
        className={cn("relative will-change-transform", className)}
        style={{ rotateX, rotateY, z, transformStyle: "preserve-3d" }}
        onPointerMove={handlePointerMove}
        onPointerEnter={handleEnter}
        onPointerLeave={handleLeave}
      >
        {spotlightBorder ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude] [padding:1px]"
            style={{ background: spotlightBackground, opacity: spotOpacity }}
          />
        ) : null}

        {children}

        {glare ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay"
            style={{ background: glareBackground, opacity: glareOpacity }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}

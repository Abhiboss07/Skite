"use client";

import { AnimatePresence, motion, useMotionValue, useMotionTemplate } from "motion/react";
import { Check, ImageUp, RotateCcw, Sparkles, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { MockSite } from "@/components/sections/mock-site";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { pipelineStages } from "@/lib/content";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { EASE } from "@/lib/motion";
import { clamp, cn } from "@/lib/utils";

type Phase = "idle" | "processing" | "done";

const STAGE_MS = 620;

export function LiveDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const start = useCallback(() => {
    setPhase("processing");
    setStage(0);
  }, []);

  // Walk the pipeline stages, then reveal the comparison.
  useEffect(() => {
    if (phase !== "processing") return;

    if (stage >= pipelineStages.length) {
      const timer = setTimeout(() => setPhase("done"), 260);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setStage((s) => s + 1), reducedMotion ? 120 : STAGE_MS);
    return () => clearTimeout(timer);
  }, [phase, stage, reducedMotion]);

  return (
    <section id="demo" className="section-y relative scroll-mt-24" aria-labelledby="demo-heading">
      <div className="container-skite">
        <SectionHeading
          titleId="demo-heading"
          align="center"
          eyebrow="Live demo"
          title={
            <>
              Watch a wireframe become <Accent>real</Accent>.
            </>
          }
          lead="A working simulation of the redraw pass. Run it, then drag the handle to compare what went in with what came out."
          titleClassName="text-display"
        />

        <Reveal delay={0.15} className="mt-16">
          <div className="glass glass-sheen relative overflow-hidden rounded-2xl p-2.5 shadow-lift sm:p-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  {["bg-error-400/70", "bg-warning-400/70", "bg-success-400/70"].map((dot) => (
                    <span key={dot} className={cn("size-2.5 rounded-full", dot)} />
                  ))}
                </div>
                <span className="ml-2 font-mono text-[11px] text-subtle">
                  workshop-sketch.heic
                </span>
              </div>

              <div className="flex items-center gap-2">
                <AnimatePresence mode="wait">
                  {phase === "done" ? (
                    <motion.div
                      key="done-badge"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Badge variant="success" size="sm">
                        <Check className="size-3" strokeWidth={3} />
                        Redrawn in 11s
                      </Badge>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {phase === "done" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    magnetic={false}
                    onClick={() => {
                      setPhase("idle");
                      setStage(0);
                    }}
                  >
                    <RotateCcw className="size-3.5" strokeWidth={2} />
                    Reset
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Stage */}
            <div className="relative aspect-16/10 overflow-hidden rounded-xl border border-border bg-background-deep sm:aspect-16/9">
              <div className="grid-paper-fine absolute inset-0 opacity-50" />

              {/* The wireframe is always present — it is what everything else
                  is layered on top of. */}
              <div className="absolute inset-0">
                <MockSite mode="wire" />
              </div>

              {/* Rendered output, revealed by the comparison handle */}
              <AnimatePresence>
                {phase === "done" ? (
                  <Comparison onDraggingChange={setDragging} />
                ) : null}
              </AnimatePresence>

              {/* Scanning overlay */}
              <AnimatePresence>
                {phase === "processing" ? <ScanOverlay stage={stage} /> : null}
              </AnimatePresence>

              {/* Idle drop zone */}
              <AnimatePresence>
                {phase === "idle" ? <DropZone onStart={start} /> : null}
              </AnimatePresence>
            </div>

            {/* Caption bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-3 pb-1.5">
              <p className="font-mono text-[11px] text-subtle">
                {phase === "idle"
                  ? "Awaiting input"
                  : phase === "processing"
                    ? pipelineStages[Math.min(stage, pipelineStages.length - 1)].description
                    : dragging
                      ? "Comparing — release to hold"
                      : "Drag the handle to compare"}
              </p>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-subtle">
                <span className={phase === "done" ? "text-electric-300" : ""}>Sketch</span>
                <span className="text-subtle/50">↔</span>
                <span className={phase === "done" ? "text-violet-300" : ""}>Reality</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function DropZone({ onStart }: { onStart: () => void }) {
  const [hovering, setHovering] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: EASE.out }}
      // Kept fairly transparent so the wireframe underneath stays legible —
      // the sketch waiting to be redrawn is the point of the shot.
      className="absolute inset-0 grid place-items-center bg-background-deep/55 backdrop-blur-[2px]"
    >
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setHovering(true);
        }}
        onDragLeave={() => setHovering(false)}
        onDrop={(event) => {
          // Nothing is uploaded in Phase 1 — the drop just triggers the
          // simulation, and no file ever leaves the browser.
          event.preventDefault();
          setHovering(false);
          onStart();
        }}
        className={cn(
          "mx-6 flex max-w-md flex-col items-center gap-4 rounded-xl border border-dashed px-8 py-10 text-center",
          "transition-colors duration-400",
          hovering
            ? "border-electric-400/70 bg-[color-mix(in_oklab,var(--color-electric-500)_12%,transparent)]"
            : "border-border-strong",
        )}
      >
        <span
          className={cn(
            "grid size-14 place-items-center rounded-full border border-border transition-all duration-500",
            hovering
              ? "scale-110 border-electric-400/60 text-electric-300"
              : "text-subtle",
          )}
        >
          {hovering ? (
            <ImageUp className="size-6" strokeWidth={1.5} />
          ) : (
            <UploadCloud className="size-6" strokeWidth={1.5} />
          )}
        </span>

        <div className="flex flex-col gap-1.5">
          <p className="font-display text-base font-medium">Drop a sketch to redraw it</p>
          <p className="text-[0.8125rem] text-subtle">
            Photo, PDF, SVG or a Figma link. This demo runs entirely in your browser —
            nothing is uploaded.
          </p>
        </div>

        <Button size="md" onClick={onStart} magnetic={false} className="mt-1">
          <Sparkles className="size-4" strokeWidth={2} />
          Run the sample
        </Button>
      </div>
    </motion.div>
  );
}

function ScanOverlay({ stage }: { stage: number }) {
  const current = Math.min(stage, pipelineStages.length - 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0"
    >
      {/* The scan bar */}
      <motion.div
        className="absolute inset-x-0 h-28"
        initial={{ top: "-14%" }}
        animate={{ top: ["-14%", "100%"] }}
        transition={{
          duration: (STAGE_MS * pipelineStages.length) / 1000,
          ease: "linear",
        }}
      >
        <div className="h-full bg-[linear-gradient(180deg,transparent,rgba(34,211,238,0.16),rgba(34,211,238,0.04))]" />
        <div className="h-px w-full bg-[linear-gradient(90deg,transparent,var(--color-aqua-300),transparent)] shadow-[0_0_18px_2px_rgba(103,232,249,0.6)]" />
      </motion.div>

      {/* Stage readout */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        {pipelineStages.map((pipelineStage, index) => {
          const state = index < stage ? "done" : index === stage ? "active" : "pending";
          return (
            <motion.div
              key={pipelineStage.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{
                opacity: state === "pending" ? 0.3 : 1,
                x: 0,
              }}
              transition={{ duration: 0.35, ease: EASE.out, delay: index * 0.05 }}
              className="flex items-center gap-2"
            >
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-full border text-[8px]",
                  state === "done"
                    ? "border-success-400/60 bg-success-500/20 text-success-400"
                    : state === "active"
                      ? "border-aqua-400/70 bg-aqua-400/20 text-aqua-300"
                      : "border-border text-subtle",
                )}
              >
                {state === "done" ? <Check className="size-2.5" strokeWidth={4} /> : null}
                {state === "active" ? (
                  <span className="size-1.5 animate-ping rounded-full bg-aqua-300" />
                ) : null}
              </span>
              <span
                className={cn(
                  "font-mono text-[10px] tracking-[0.12em] uppercase",
                  state === "active" ? "text-aqua-200" : "text-subtle",
                )}
              >
                {pipelineStage.name}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="absolute right-4 bottom-4 font-mono text-[10px] text-subtle">
        {pipelineStages[current].model}
      </div>
    </motion.div>
  );
}

/**
 * Before/after wipe. The rendered layer is clipped from the left by the handle
 * position, so dragging genuinely reveals the same coordinates on both layers.
 */
function Comparison({ onDraggingChange }: { onDraggingChange: (dragging: boolean) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(58);
  const progress = useMotionValue(58);
  const clip = useMotionTemplate`inset(0 ${100 - position}% 0 0)`;

  const updateFromClientX = useCallback((clientX: number) => {
    const element = containerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const next = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    setPosition(next);
    progress.set(next);
  }, [progress]);

  const startDrag = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    onDraggingChange(true);
    updateFromClientX(event.clientX);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: EASE.out }}
      className="absolute inset-0 touch-none"
      onPointerDown={startDrag}
      onPointerMove={(event) => {
        if (event.buttons === 1) updateFromClientX(event.clientX);
      }}
      onPointerUp={() => onDraggingChange(false)}
      onPointerCancel={() => onDraggingChange(false)}
      data-cursor="drag"
      data-cursor-label="Drag"
    >
      {/* Rendered result, clipped to the handle */}
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        <MockSite mode="render" />
      </motion.div>

      {/* Handle */}
      <div
        className="absolute inset-y-0 z-10 w-px bg-[linear-gradient(180deg,transparent,var(--color-aqua-300)_12%,var(--color-electric-400)_50%,var(--color-violet-400)_88%,transparent)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center">
          <span className="glass absolute inset-0 rounded-full border-border-strong shadow-lift" />
          <span className="relative flex items-center gap-0.5 text-foreground">
            <span className="block h-3 w-px bg-current opacity-70" />
            <span className="block h-4 w-px bg-current" />
            <span className="block h-3 w-px bg-current opacity-70" />
          </span>
        </div>
      </div>

      {/* Corner labels */}
      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-abyss-950/70 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-violet-200 uppercase backdrop-blur-sm">
        Reality
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-abyss-950/70 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-electric-200 uppercase backdrop-blur-sm">
        Sketch
      </span>

      {/* Keyboard-accessible equivalent of the drag handle */}
      <label className="sr-only" htmlFor="comparison-range">
        Compare sketch and rendered result
      </label>
      <input
        id="comparison-range"
        type="range"
        min={0}
        max={100}
        value={Math.round(position)}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="absolute inset-x-0 bottom-0 h-10 w-full cursor-ew-resize opacity-0"
      />
    </motion.div>
  );
}

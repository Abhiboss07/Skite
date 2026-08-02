"use client";

import { Eraser, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Stroke = { x: number; y: number }[];

/**
 * A small drawing surface for the 404 page.
 *
 * The joke earns its place: this is a site about turning drawings into pages,
 * on the one page that does not exist. Draw something and the "redraw" button
 * resolves your strokes from graphite into the brand gradient — the product's
 * whole gesture, at toy scale.
 *
 * Strokes are kept in React state (not just painted) so a resize or a theme
 * change can repaint them without losing the drawing.
 */
export function DrawPad({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [resolved, setResolved] = useState(false);
  const currentStroke = useRef<Stroke>([]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const all = currentStroke.current.length ? [...strokes, currentStroke.current] : strokes;

    for (const stroke of all) {
      if (stroke.length < 2) continue;

      if (resolved) {
        // "Rendered" state: the brand spectrum, thicker, with a glow.
        const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
        gradient.addColorStop(0, "#22D3EE");
        gradient.addColorStop(0.5, "#4D7CFF");
        gradient.addColorStop(1, "#8B5CF6");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 5;
        ctx.shadowColor = "rgba(77,124,255,0.75)";
        ctx.shadowBlur = 14;
      } else {
        // "Sketch" state: thin graphite.
        ctx.strokeStyle = "rgba(154,161,177,0.85)";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      // Quadratic midpoints smooth out the polyline so it reads as a drawn
      // line rather than a chain of segments.
      for (let i = 1; i < stroke.length - 1; i++) {
        const midX = (stroke[i].x + stroke[i + 1].x) / 2;
        const midY = (stroke[i].y + stroke[i + 1].y) / 2;
        ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, midX, midY);
      }
      ctx.stroke();
    }
  }, [strokes, resolved]);

  useEffect(() => {
    paint();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  const positionFrom = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawing(true);
    setResolved(false);
    currentStroke.current = [positionFrom(event)];
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    currentStroke.current.push(positionFrom(event));
    paint();
  };

  const end = () => {
    if (!drawing) return;
    setDrawing(false);
    if (currentStroke.current.length > 1) {
      setStrokes((prev) => [...prev, currentStroke.current]);
    }
    currentStroke.current = [];
  };

  const hasDrawing = strokes.length > 0;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="glass glass-sheen relative overflow-hidden rounded-xl">
        <div className="grid-paper-fine absolute inset-0 opacity-70" />

        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="relative h-56 w-full touch-none sm:h-72"
          data-cursor="hover"
          data-cursor-label="Draw"
          aria-label="Drawing surface — draw with your pointer, then press Redraw"
          role="img"
        />

        {!hasDrawing && !drawing ? (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-[0.875rem] text-subtle">
            Draw something here
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="md"
          magnetic={false}
          disabled={!hasDrawing}
          onClick={() => setResolved(true)}
        >
          <Sparkles className="size-4" strokeWidth={2} />
          Redraw it
        </Button>

        <Button
          size="md"
          variant="ghost"
          magnetic={false}
          disabled={!hasDrawing}
          onClick={() => {
            setStrokes([]);
            setResolved(false);
          }}
        >
          <Eraser className="size-4" strokeWidth={2} />
          Clear
        </Button>

        <p className="text-[0.8125rem] text-subtle">
          {resolved ? "That is the entire product, roughly." : "Not the real engine. Still fun."}
        </p>
      </div>
    </div>
  );
}

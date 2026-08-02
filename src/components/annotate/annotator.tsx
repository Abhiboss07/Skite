"use client";

import { Check, Download, Save, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { Role } from "@/pipeline/ir/schema";

/**
 * Ground-truth annotation.
 *
 * The benchmark can only be as good as its labels, so this is built around the
 * two things that actually make labelling 40 sketches survivable: the boxes
 * snap to nothing and are drawn directly on the image at full size, and the
 * containment hierarchy is *derived* rather than entered. Asking a person to
 * nominate a parent for every one of twenty regions is how annotation projects
 * die at sample four.
 *
 * Coordinates are stored in a 1440-wide canvas space, not source pixels,
 * because that is what the harness compares in — both sides are normalised to
 * canvas fractions, so an annotation made on a 4032px phone photo and one made
 * on a 800px scan mean the same thing.
 */

const ROLES: Role[] = [
  "navbar",
  "hero",
  "heading",
  "paragraph",
  "button",
  "image",
  "card",
  "grid",
  "footer",
  "unknown",
];

/** Matches the overlay palette in the Studio, so the two read the same way. */
const ROLE_COLOUR: Record<Role, string> = {
  navbar: "#38bdf8",
  hero: "#a78bfa",
  heading: "#f472b6",
  paragraph: "#fb923c",
  button: "#facc15",
  image: "#34d399",
  card: "#60a5fa",
  grid: "#c084fc",
  footer: "#94a3b8",
  unknown: "#ef4444",
};

const STYLES = ["notebook", "whiteboard", "paper", "figma"] as const;
type Style = (typeof STYLES)[number];

const CANVAS_W = 1440;

type Box = { x: number; y: number; w: number; h: number };
type Annotation = { id: string; role: Role; box: Box; text?: string };

/**
 * An in-progress drag.
 *
 * `overId` records the region the press landed on, if any. A press that ends
 * without travelling is a selection of that region; one that travels is a new
 * box. Deciding on release rather than on press is what allows a card to be
 * drawn *inside* a hero — the first version refused to start a drag over an
 * existing region, which made nested annotation impossible, and nesting is the
 * main thing being annotated.
 */
type Draft = { startX: number; startY: number; x: number; y: number; overId: string | null } | null;

/** Below this, in canvas units, a drag is a click. */
const CLICK_SLOP = 8;

export function Annotator() {
  const [image, setImage] = useState<{ src: string; name: string; w: number; h: number } | null>(null);
  const [style, setStyle] = useState<Style>("notebook");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [role, setRole] = useState<Role>("card");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const counter = useRef(0);

  /** Canvas height that preserves the source aspect ratio at 1440 wide. */
  const canvasH = image ? Math.round((image.h / image.w) * CANVAS_W) : 0;

  const load = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const probe = new Image();
      probe.onload = () => {
        setImage({ src, name: file.name, w: probe.naturalWidth, h: probe.naturalHeight });
        setAnnotations([]);
        setSelected(null);
        setSaved(null);
        counter.current = 0;
      };
      probe.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  /** Pointer position in canvas space. */
  const toCanvas = useCallback(
    (event: React.PointerEvent) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: ((event.clientX - rect.left) / rect.width) * CANVAS_W,
        y: ((event.clientY - rect.top) / rect.height) * canvasH,
      };
    },
    [canvasH],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    if (!image) return;
    const { x, y } = toCanvas(event);
    const overId = (event.target as SVGElement).dataset?.regionId ?? null;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setDraft({ startX: x, startY: y, x, y, overId });
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!draft) return;
    const { x, y } = toCanvas(event);
    setDraft({ ...draft, x, y });
  };

  const onPointerUp = () => {
    if (!draft) return;
    const box = {
      x: Math.round(Math.min(draft.startX, draft.x)),
      y: Math.round(Math.min(draft.startY, draft.y)),
      w: Math.round(Math.abs(draft.x - draft.startX)),
      h: Math.round(Math.abs(draft.y - draft.startY)),
    };
    const wasClick = box.w < CLICK_SLOP || box.h < CLICK_SLOP;
    setDraft(null);

    if (wasClick) {
      // Select what was under the press, or clear the selection on empty space.
      setSelected(draft.overId);
      if (draft.overId) {
        const hit = annotations.find((a) => a.id === draft.overId);
        if (hit) setRole(hit.role);
      }
      return;
    }

    // The id is computed here, not inside the updater. React invokes state
    // updaters more than once in development, and mutating a ref inside one
    // numbered the regions n2, n4, n6 — harmless to the geometry, but the ids
    // appear in exported ground truth and should mean what they look like.
    const id = `n${++counter.current}`;

    // Deliberately does not select the new region. Selecting it would make the
    // role palette destructive: picking the role for the *next* box would
    // silently relabel the one just drawn.
    setAnnotations((prev) => [...prev, { id, role, box }]);
    setSaved(null);
  };

  /**
   * Containment, derived on export rather than entered by hand.
   *
   * A region's parent is the smallest annotation that fully contains it, which
   * is the same rule the pipeline's structure pass uses — so the ground truth
   * and the thing being measured agree on what nesting means.
   */
  const withParents = useMemo(() => {
    return annotations.map((node) => {
      let parent: string | null = null;
      let smallest = Infinity;
      for (const other of annotations) {
        if (other.id === node.id) continue;
        const contains =
          other.box.x <= node.box.x &&
          other.box.y <= node.box.y &&
          other.box.x + other.box.w >= node.box.x + node.box.w &&
          other.box.y + other.box.h >= node.box.y + node.box.h;
        const area = other.box.w * other.box.h;
        if (contains && area < smallest) {
          smallest = area;
          parent = other.id;
        }
      }
      return { ...node, parent };
    });
  }, [annotations]);

  const truth = useMemo(() => {
    if (!image) return null;
    const id = image.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    return {
      id,
      style,
      source: { file: image.name, pixels: { w: image.w, h: image.h } },
      canvas: { w: CANVAS_W, h: canvasH },
      nodes: withParents.map((n) => ({
        id: n.id,
        role: n.role,
        parent: n.parent,
        box: n.box,
        ...(n.text ? { text: n.text } : {}),
      })),
    };
  }, [image, style, canvasH, withParents]);

  const download = () => {
    if (!truth) return;
    const blob = new Blob([JSON.stringify(truth, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${truth.id}.truth.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    if (!truth || !image) return;
    setError(null);
    try {
      const response = await fetch("/api/annotations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ truth, image: image.src }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? `Save failed with ${response.status}.`);
        return;
      }
      setSaved(data.savedAs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reach the server.");
    }
  };

  // Undo and delete, because annotating without them is miserable.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.tagName === "INPUT";
      if (typing) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selected) {
        event.preventDefault();
        setAnnotations((prev) => prev.filter((a) => a.id !== selected));
        setSelected(null);
      }
      if (event.key === "z" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setAnnotations((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const draftBox = draft
    ? {
        x: Math.min(draft.startX, draft.x),
        y: Math.min(draft.startY, draft.y),
        w: Math.abs(draft.x - draft.startX),
        h: Math.abs(draft.y - draft.startY),
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* ── controls ────────────────────────────────────────────────── */}
      <div className="glass flex flex-wrap items-center gap-4 rounded-xl p-4">
        <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm hover:border-border-strong">
          {image ? "Change image" : "Choose a sketch"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) load(file);
              e.target.value = "";
            }}
          />
        </label>

        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-subtle">Category</span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as Style)}
            className="rounded-md border border-border bg-transparent px-2 py-1.5 text-sm"
          >
            {STYLES.map((s) => (
              <option key={s} value={s} className="bg-background">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnnotations((prev) => prev.slice(0, -1))}
            disabled={!annotations.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
          >
            <Undo2 className="size-3.5" aria-hidden /> Undo
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!truth?.nodes.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
          >
            <Download className="size-3.5" aria-hidden /> Export JSON
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!truth?.nodes.length}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-40"
          >
            <Save className="size-3.5" aria-hidden /> Save to dataset
          </button>
        </div>
      </div>

      {/* Role picker — a palette, so the next box is already labelled. */}
      <div className="flex flex-wrap gap-1.5">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setRole(r);
              // Retag the selected box, so a mislabel is one click to fix.
              if (selected) {
                setAnnotations((prev) => prev.map((a) => (a.id === selected ? { ...a, role: r } : a)));
                setSaved(null);
              }
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              role === r ? "border-transparent text-background" : "border-border text-muted hover:text-foreground",
            )}
            style={role === r ? { backgroundColor: ROLE_COLOUR[r] } : undefined}
          >
            {r}
          </button>
        ))}
      </div>

      {saved && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300">
          <Check className="size-3.5" aria-hidden /> Saved as {saved}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-300">
          {error}
        </p>
      )}

      {!image ? (
        <div className="glass rounded-2xl border-2 border-dashed border-white/15 p-16 text-center text-sm text-foreground-subtle">
          Choose a sketch to begin. Drag on the image to draw a region, pick a role for it, and the
          nesting is worked out for you.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          {/* ── drawing surface ─────────────────────────────────────── */}
          <div
            ref={surfaceRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="relative touch-none overflow-hidden rounded-xl border border-white/10 select-none"
            style={{ cursor: "crosshair" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a local data: URL */}
            <img src={image.src} alt="" className="pointer-events-none block w-full" draggable={false} />

            <svg
              viewBox={`0 0 ${CANVAS_W} ${canvasH}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
            >
              {withParents.map((a) => (
                <g key={a.id}>
                  <rect
                    x={a.box.x}
                    y={a.box.y}
                    width={a.box.w}
                    height={a.box.h}
                    fill={ROLE_COLOUR[a.role]}
                    fillOpacity={selected === a.id ? 0.24 : 0.08}
                    stroke={ROLE_COLOUR[a.role]}
                    strokeWidth={selected === a.id ? 5 : 2.5}
                    data-region-id={a.id}
                    className="pointer-events-auto cursor-crosshair"
                  />
                  <text x={a.box.x + 8} y={a.box.y + 26} fontSize={18} fill={ROLE_COLOUR[a.role]}>
                    {a.role}
                  </text>
                </g>
              ))}

              {draftBox && (
                <rect
                  x={draftBox.x}
                  y={draftBox.y}
                  width={draftBox.w}
                  height={draftBox.h}
                  fill={ROLE_COLOUR[role]}
                  fillOpacity={0.18}
                  stroke={ROLE_COLOUR[role]}
                  strokeWidth={3}
                  strokeDasharray="10 6"
                />
              )}
            </svg>
          </div>

          {/* ── region list ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs text-foreground-subtle">
              {annotations.length} region{annotations.length === 1 ? "" : "s"} · canvas {CANVAS_W}×
              {canvasH} · source {image.w}×{image.h}
            </p>
            <ul className="max-h-[34rem] space-y-1 overflow-y-auto font-mono text-xs">
              {withParents.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(a.id);
                      setRole(a.role);
                    }}
                    className={cn(
                      "flex-1 rounded-lg px-2.5 py-2 text-left transition-colors",
                      selected === a.id ? "bg-white/10" : "hover:bg-white/5",
                    )}
                  >
                    <span style={{ color: ROLE_COLOUR[a.role] }}>{a.role}</span>{" "}
                    <span className="text-foreground-subtle">
                      {a.box.w}×{a.box.h}
                      {a.parent ? ` · in ${a.parent}` : " · top level"}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${a.role} region`}
                    onClick={() => setAnnotations((prev) => prev.filter((x) => x.id !== a.id))}
                    className="rounded-md p-1.5 text-foreground-subtle hover:text-rose-400"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-foreground-subtle">
              Drag to draw · click to select · <kbd>Del</kbd> removes · <kbd>⌘Z</kbd> undoes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

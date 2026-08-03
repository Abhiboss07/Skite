"use client";

import { Loader2, Upload } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { PreviewTree } from "@/pipeline/emit/runtime";
import type { ComponentTree, IR } from "@/pipeline/ir/schema";
import type { SemanticIR, SemanticNode } from "@/pipeline/semantic/schema";
import type { RunReport } from "@/pipeline/run";

import { BoxOverlay, RoleLegend } from "./overlay";
import { ReportPanel } from "./report-panel";

/**
 * The Studio: one upload, every stage of the pipeline laid out side by side.
 *
 * The tabs are not decoration. A generative pipeline fails in the middle far
 * more often than at the end, and the failure is almost always invisible in the
 * final output — a wrong role three stages back becomes a plausible-looking page
 * that is subtly not the sketch. Being able to open the intermediate and see
 * *which* stage went wrong is what turns a demo into something improvable.
 */

type Result = {
  ok: boolean;
  ir: IR;
  tree: ComponentTree;
  semantic: SemanticIR;
  code: string;
  prompt: string;
  images: { working: string; cleaned: string };
  report: RunReport;
  warnings: string[];
  filename: string;
};

const STAGES = [
  { id: "upload", label: "Original", hint: "What you uploaded, resized to the working resolution." },
  { id: "cleaned", label: "Cleaned", hint: "After illumination correction and adaptive thresholding." },
  { id: "ocr", label: "OCR", hint: "Text transcribed from the drawing." },
  { id: "components", label: "Components", hint: "Regions with their assigned roles and confidences." },
  { id: "layout", label: "Layout boxes", hint: "The inferred grid, and which regions snapped to it." },
  { id: "semantic", label: "Semantic", hint: "What each region means, and the rule that decided it." },
  { id: "ir", label: "IR", hint: "The intermediate representation every later stage reads." },
  { id: "prompt", label: "Prompt", hint: "Exactly what the classification model is sent." },
  { id: "code", label: "Code", hint: "The generated component." },
  { id: "preview", label: "Preview", hint: "The generated component, rendered." },
] as const;

type StageId = (typeof STAGES)[number]["id"];

export function Studio() {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<StageId>("upload");
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const generate = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setSelected(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/generate", { method: "POST", body });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? `Request failed with ${response.status}.`);
        return;
      }

      setResult(data as Result);
      setStage("preview");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The request could not be sent.");
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void generate(file);
    },
    [generate],
  );

  return (
    <div className="flex flex-col gap-8">
      {/* ── upload ──────────────────────────────────────────────── */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "glass relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          dragging ? "border-accent bg-accent/5" : "border-white/15",
        )}
      >
        <Upload className="size-6 text-foreground-subtle" aria-hidden />
        <div>
          <label htmlFor={inputId} className="cursor-pointer font-medium underline underline-offset-4">
            Choose a wireframe
          </label>{" "}
          <span className="text-foreground-subtle">or drop one here</span>
        </div>
        <p className="text-xs text-foreground-subtle">
          A photo of a hand drawing, a whiteboard, or an exported wireframe. PNG, JPEG, WebP or AVIF,
          up to 12&nbsp;MB.
        </p>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void generate(file);
            e.target.value = "";
          }}
        />

        {busy && (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center gap-3 rounded-2xl bg-background/80 backdrop-blur-sm"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span className="text-sm">Running the pipeline…</span>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">
          {error}
        </p>
      )}

      {result && (
        <>
          <ReportPanel report={result.report} warnings={result.warnings} />

          {/* ── stage tabs ───────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div
              role="tablist"
              aria-label="Pipeline stages"
              className="glass flex w-full flex-wrap gap-1 rounded-xl p-1.5"
            >
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  id={`tab-${s.id}`}
                  aria-selected={stage === s.id}
                  aria-controls={`panel-${s.id}`}
                  onClick={() => setStage(s.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-colors",
                    stage === s.id
                      ? "bg-white/10 font-medium text-foreground"
                      : "text-foreground-subtle hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-foreground-subtle">
              {STAGES.find((s) => s.id === stage)?.hint}
            </p>

            <div
              role="tabpanel"
              id={`panel-${stage}`}
              aria-labelledby={`tab-${stage}`}
              tabIndex={0}
              className="min-h-[24rem] rounded-2xl"
            >
              <StagePanel stage={stage} result={result} selected={selected} onSelect={setSelected} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StagePanel({
  stage,
  result,
  selected,
  onSelect,
}: {
  stage: StageId;
  result: Result;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  switch (stage) {
    case "upload":
      return (
        <figure className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL from the pipeline */}
          <img
            src={result.images.working}
            alt={`The uploaded wireframe, ${result.filename}`}
            className="w-full rounded-xl border border-white/10"
          />
          <figcaption className="font-mono text-xs text-foreground-subtle">
            {result.filename} · source {result.ir.source.pixels.w}×{result.ir.source.pixels.h}px ·
            sha256 {result.ir.source.sha256.slice(0, 16)}…
          </figcaption>
        </figure>
      );

    case "cleaned":
      return (
        <figure className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL from the pipeline */}
          <img
            src={result.images.cleaned}
            alt="The binarised stroke mask"
            className="w-full rounded-xl border border-white/10 bg-white"
          />
          <figcaption className="text-xs text-foreground-subtle">
            Every later stage reads this mask, never the original photograph. If strokes are missing
            here, no amount of downstream cleverness recovers them.
          </figcaption>
        </figure>
      );

    case "ocr": {
      const withText = result.ir.nodes.filter((n) => n.content);
      if (!withText.length) {
        return (
          <p className="text-sm text-foreground-subtle">
            No text was transcribed. The offline heuristic classifier reads geometry only — it cannot
            read handwriting, and reports that rather than inventing plausible copy. Set{" "}
            <code className="font-mono">ANTHROPIC_API_KEY</code> to enable the vision pass.
          </p>
        );
      }
      return (
        <table className="w-full text-sm">
          <caption className="sr-only">Transcribed text by region</caption>
          <thead className="text-left text-xs uppercase tracking-wider text-foreground-subtle">
            <tr>
              <th scope="col" className="pb-2 pr-4 font-medium">Region</th>
              <th scope="col" className="pb-2 pr-4 font-medium">Role</th>
              <th scope="col" className="pb-2 pr-4 font-medium">Text</th>
              <th scope="col" className="pb-2 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {withText.map((node) => (
              <tr key={node.id} className="border-t border-white/5">
                <td className="py-2 pr-4">{node.id}</td>
                <td className="py-2 pr-4">{node.role}</td>
                <td className="py-2 pr-4 font-sans">{node.content?.text}</td>
                <td className="py-2 tabular-nums">
                  {((node.content?.confidence ?? 0) * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    case "components":
      return (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-3">
            <BoxOverlay
              ir={result.ir}
              image={result.images.working}
              mode="roles"
              selected={selected}
              onSelect={onSelect}
            />
            <RoleLegend roles={result.ir.nodes.map((n) => n.role)} />
          </div>
          <ul className="max-h-[32rem] space-y-1 overflow-y-auto font-mono text-xs">
            {result.ir.nodes.map((node) => (
              <li key={node.id}>
                <button
                  onClick={() => onSelect(selected === node.id ? null : node.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left transition-colors",
                    selected === node.id ? "bg-white/10" : "hover:bg-white/5",
                  )}
                >
                  <span className="text-foreground-subtle">{node.id}</span>{" "}
                  <span className="font-semibold">{node.role}</span>{" "}
                  <span className="tabular-nums text-foreground-subtle">
                    {(node.roleConfidence * 100).toFixed(0)}%
                  </span>
                  <br />
                  <span className="text-foreground-subtle">
                    {Math.round(node.box.w)}×{Math.round(node.box.h)} at {Math.round(node.box.x)},
                    {Math.round(node.box.y)}
                    {node.parent ? ` · in ${node.parent}` : " · top level"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      );

    case "layout":
      return (
        <div className="flex flex-col gap-3">
          <BoxOverlay
            ir={result.ir}
            image={result.images.working}
            mode="layout"
            selected={selected}
            onSelect={onSelect}
          />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-foreground-subtle">
            <span>
              <span className="inline-block size-2.5 rounded-full bg-cyan-400 align-middle" /> snapped
              to a column
            </span>
            <span>
              <span className="inline-block size-2.5 rounded-full bg-rose-500 align-middle" /> free
            </span>
            <span className="font-mono">
              {result.ir.canvas.grid.columns} columns · {result.ir.canvas.grid.gutter}px gutter ·{" "}
              {result.ir.canvas.grid.margin}px margin · {result.ir.canvas.grid.baseUnit}px base unit ·
              fit {(result.ir.canvas.grid.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      );

    case "semantic":
      return (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <SemanticOverlay semantic={result.semantic} image={result.images.working} />
          <div className="flex flex-col gap-3">
            <p className="text-xs text-foreground-subtle">
              {Object.entries(result.semantic.summary)
                .sort((a, b) => b[1] - a[1])
                .map(([t, n]) => `${t}×${n}`)
                .join(" · ")}
            </p>
            <div className="max-h-[34rem] overflow-auto rounded-xl border border-white/10 bg-black/30 p-3">
              <SemanticTree node={result.semantic.root} />
            </div>
            {result.semantic.undecidable.length > 0 && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
                Not decidable without reading the text:{" "}
                {result.semantic.undecidable.join(", ")}. These types are distinguished by what a
                region says, not by its shape — reported as undecidable rather than guessed.
              </p>
            )}
          </div>
        </div>
      );

    case "ir":
      return (
        <Pre
          text={JSON.stringify({ detection: result.ir, semantic: result.semantic }, null, 2)}
        />
      );

    case "prompt":
      return <Pre text={result.prompt} />;

    case "code":
      return <Pre text={result.code} />;

    case "preview":
      return (
        <div className="rounded-2xl border border-white/10 bg-white p-4 text-slate-900 dark:bg-[#0b1023] dark:text-slate-100">
          {/* The surface follows the app's theme rather than forcing white.
              The `dark` variant is defined as `.dark *`, so a nested subtree
              cannot opt out of it — forcing a white background here rendered
              every `dark:text-slate-50` in the generated markup as white on
              white. The generated code carries both themes, so honouring the
              current one is both simpler and what the user will actually see. */}
          <PreviewTree tree={result.tree} columns={result.ir.canvas.grid.columns} />
        </div>
      );
  }
}

/** Colour by semantic family, so the tree and the overlay read together. */
const TYPE_COLOUR: Record<string, string> = {
  Page: "#94a3b8", Navigation: "#38bdf8", Hero: "#a78bfa", Section: "#64748b", Footer: "#475569",
  Grid: "#c084fc", Gallery: "#22d3ee", List: "#818cf8", Card: "#60a5fa", Stack: "#6b7280", Form: "#f472b6",
  Logo: "#fbbf24", Heading: "#ec4899", Subheading: "#f472b6", Label: "#fb923c", Paragraph: "#fdba74",
  Image: "#34d399", Icon: "#10b981", Divider: "#4b5563",
  Button: "#facc15", CTAButton: "#eab308", Link: "#fde047", Input: "#f59e0b",
  Unknown: "#ef4444",
};

const colourOf = (type: string) => TYPE_COLOUR[type] ?? "#9ca3af";

function SemanticTree({ node, depth = 0 }: { node: SemanticNode; depth?: number }) {
  const l = node.layout;
  return (
    <div style={{ paddingLeft: depth ? 14 : 0 }}>
      <div className="flex flex-wrap items-baseline gap-x-2 py-0.5 font-mono text-xs">
        <span style={{ color: colourOf(node.type) }} className="font-semibold">
          {node.type}
        </span>
        {node.inferred && <span className="text-foreground-subtle italic">inferred</span>}
        <span className="text-foreground-subtle">
          {Math.round(node.box.w)}×{Math.round(node.box.h)} · span {l.span}
          {l.direction !== "none" && ` · ${l.direction}${l.direction === "row" ? `×${l.columns}` : ""} gap ${l.gap} ${l.align}`}
        </span>
        <span className="text-foreground-subtle">
          {(node.evidence.confidence * 100).toFixed(0)}% {node.evidence.rule}
        </span>
      </div>
      {node.children.map((child) => (
        <SemanticTree key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function SemanticOverlay({ semantic, image }: { semantic: SemanticIR; image: string }) {
  // Flattened, because the overlay draws every node regardless of depth.
  const flat: SemanticNode[] = [];
  const walk = (n: SemanticNode) => {
    if (n.type !== "Page") flat.push(n);
    n.children.forEach(walk);
  };
  walk(semantic.root);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URL from the pipeline */}
      <img src={image} alt="" className="block w-full" />
      <svg
        viewBox={`0 0 ${semantic.canvas.w} ${semantic.canvas.h}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${flat.length} semantic components`}
      >
        {flat.map((n) => {
          const c = colourOf(n.type);
          return (
            <g key={n.id}>
              <rect
                x={n.box.x}
                y={n.box.y}
                width={n.box.w}
                height={n.box.h}
                fill={c}
                fillOpacity={n.inferred ? 0.03 : 0.08}
                stroke={c}
                strokeWidth={n.inferred ? 2 : 3}
                strokeDasharray={n.inferred ? "12 8" : undefined}
              />
              <text x={n.box.x + 6} y={n.box.y + 24} fontSize={20} fill={c} className="font-mono">
                {n.type}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Pre({ text }: { text: string }) {
  return (
    <pre className="max-h-[36rem] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-relaxed">
      <code>{text}</code>
    </pre>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { IR, Role } from "@/pipeline/ir/schema";

/**
 * Box overlays drawn over the working image.
 *
 * The SVG uses the IR canvas as its viewBox rather than pixel positions. The
 * canvas has the same aspect ratio as the image by construction, so the overlay
 * scales with the container and stays registered at any size — and, more
 * usefully, what you see is the coordinate space the pipeline actually reasons
 * in, not a re-projection of it.
 */

/** Role → stroke. Distinguishable in both themes and for the common colour-vision types. */
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

export function BoxOverlay({
  ir,
  image,
  mode,
  selected,
  onSelect,
  className,
}: {
  ir: IR;
  image: string;
  /** `roles` colours by classification; `layout` shows the grid and snapping. */
  mode: "roles" | "layout";
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  className?: string;
}) {
  const { w, h, grid } = ir.canvas;
  const columnWidth = (w - grid.margin * 2 - grid.gutter * (grid.columns - 1)) / grid.columns;

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-white/10", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL from the pipeline, not an asset */}
      <img src={image} alt="" className="block w-full select-none" draggable={false} />

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={
          mode === "layout"
            ? `Layout grid: ${grid.columns} columns, ${grid.gutter}px gutter, ${ir.nodes.length} regions`
            : `${ir.nodes.length} detected regions with assigned roles`
        }
      >
        {mode === "layout" && (
          <g>
            {Array.from({ length: grid.columns }, (_, i) => (
              <rect
                key={i}
                x={grid.margin + i * (columnWidth + grid.gutter)}
                y={0}
                width={columnWidth}
                height={h}
                fill="#6366f1"
                opacity={0.07}
              />
            ))}
          </g>
        )}

        {ir.nodes.map((node) => {
          const colour = mode === "roles" ? ROLE_COLOUR[node.role] : node.evidence.snapped ? "#22d3ee" : "#f43f5e";
          const isSelected = selected === node.id;
          return (
            <g key={node.id}>
              <rect
                x={node.box.x}
                y={node.box.y}
                width={node.box.w}
                height={node.box.h}
                fill={colour}
                fillOpacity={isSelected ? 0.22 : 0.06}
                stroke={colour}
                strokeWidth={isSelected ? 5 : 2.5}
                className="cursor-pointer"
                onClick={() => onSelect?.(isSelected ? null : node.id)}
              />
              {mode === "roles" && (
                <text
                  x={node.box.x + 8}
                  y={node.box.y + 26}
                  fontSize={18}
                  fill={colour}
                  className="pointer-events-none select-none font-mono"
                >
                  {node.role}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function RoleLegend({ roles }: { roles: Role[] }) {
  const unique = [...new Set(roles)];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground-subtle">
      {unique.map((role) => (
        <li key={role} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ backgroundColor: ROLE_COLOUR[role] }}
          />
          {role}
        </li>
      ))}
    </ul>
  );
}

import { cn } from "@/lib/utils";

/**
 * The demo's subject: one landing-page layout rendered in two states.
 *
 * Both states come from this single component, so the wireframe and the render
 * are guaranteed to share identical geometry. That is not a shortcut — it is
 * the honest way to demonstrate "your layout is preserved", because there is no
 * opportunity for the two sides to quietly differ.
 *
 * Every dimension is expressed in `cqw` (container-query width) rather than rem,
 * so the whole mock scales as one piece. That lets the same component read
 * correctly as a 1200px demo stage and as a 340px showcase thumbnail — with
 * fixed pixel sizes it left large voids in the former and overflowed the latter.
 */
export function MockSite({ mode, className }: { mode: "wire" | "render"; className?: string }) {
  const wire = mode === "wire";

  /** Placeholder block: dashed outline when unresolved, filled when resolved. */
  const block = (extra?: string) =>
    cn(
      "rounded-[0.4cqw]",
      wire ? "border border-dashed border-foreground/45" : "bg-foreground/12",
      extra,
    );

  /** Outline in sketch mode, brand gradient in render mode. */
  const accent = (extra?: string) =>
    cn(
      wire
        ? "border border-dashed border-foreground/55"
        : "bg-[linear-gradient(100deg,var(--color-aqua-500),var(--color-electric-600))]",
      extra,
    );

  return (
    <div
      className={cn(
        "@container flex h-full w-full flex-col justify-center gap-[2.6cqw] px-[3.4cqw] pt-[5cqw] pb-[3.4cqw] select-none",
        wire ? "bg-transparent" : "bg-abyss-900",
        className,
      )}
      aria-hidden
    >
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[1.2cqw]">
          <div
            className={cn(
              "size-[2cqw] rounded-[0.4cqw]",
              wire
                ? "border border-dashed border-foreground/55"
                : "bg-[linear-gradient(120deg,var(--color-aqua-400),var(--color-violet-500))]",
            )}
          />
          <div className={block("h-[0.75cqw] w-[4.2cqw]")} />
        </div>
        <div className="flex items-center gap-[2cqw]">
          {[3.2, 2.6, 3.6].map((w, i) => (
            <div key={i} className={block("h-[0.6cqw]")} style={{ width: `${w}cqw` }} />
          ))}
          <div className={accent("h-[2.1cqw] w-[5.4cqw] rounded-full")} />
        </div>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-[1.15fr_1fr] items-center gap-[3.4cqw]">
        <div className="flex flex-col gap-[1.1cqw]">
          <div className={block("h-[0.75cqw] w-[6cqw] rounded-full")} />
          <div className="mt-[0.4cqw] flex flex-col gap-[0.9cqw]">
            <div
              className={cn(
                "h-[2.7cqw] w-full rounded-[0.4cqw]",
                wire
                  ? "border border-dashed border-foreground/55"
                  : "bg-[linear-gradient(100deg,var(--color-aqua-300),var(--color-electric-400)_50%,var(--color-violet-400))]",
              )}
            />
            <div
              className={cn(
                "h-[2.7cqw] w-3/4 rounded-[0.4cqw]",
                wire ? "border border-dashed border-foreground/55" : "bg-foreground/85",
              )}
            />
          </div>
          <div className="mt-[0.5cqw] flex flex-col gap-[0.6cqw]">
            <div className={block("h-[0.6cqw] w-full")} />
            <div className={block("h-[0.6cqw] w-5/6")} />
          </div>
          <div className="mt-[1cqw] flex gap-[1cqw]">
            <div className={accent("h-[2.4cqw] w-[7.4cqw] rounded-full")} />
            <div
              className={cn(
                "h-[2.4cqw] w-[5.8cqw] rounded-full",
                wire ? "border border-dashed border-foreground/45" : "border border-foreground/25",
              )}
            />
          </div>
        </div>

        {/* Hero media */}
        <div
          className={cn(
            "relative aspect-16/11 overflow-hidden rounded-[0.8cqw]",
            wire
              ? "border border-dashed border-foreground/45"
              : "border border-white/10 bg-[linear-gradient(140deg,rgba(34,211,238,0.35),rgba(77,124,255,0.3)_45%,rgba(139,92,246,0.4))]",
          )}
        >
          {wire ? (
            /* The classic "this is an image" diagonal */
            <svg
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 69"
            >
              <path
                d="M0 0 L100 69 M100 0 L0 69"
                stroke="currentColor"
                strokeWidth="0.4"
                className="text-foreground/35"
                strokeDasharray="2 2"
              />
            </svg>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_55%)]" />
          )}
        </div>
      </div>

      {/* Feature row */}
      <div className="grid grid-cols-3 gap-[1.6cqw]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-[0.9cqw] rounded-[0.7cqw] p-[1.4cqw]",
              wire ? "border border-dashed border-foreground/45" : "border border-white/8 bg-white/5",
            )}
          >
            <div
              className={cn(
                "size-[1.7cqw] rounded-[0.35cqw]",
                wire
                  ? "border border-dashed border-foreground/55"
                  : "bg-[color-mix(in_oklab,var(--color-electric-400)_50%,transparent)]",
              )}
            />
            <div className={block("h-[0.55cqw] w-full")} />
            <div className={block("h-[0.55cqw] w-2/3")} />
          </div>
        ))}
      </div>
    </div>
  );
}

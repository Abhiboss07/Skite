"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { MockSite } from "@/components/sections/mock-site";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { showcase } from "@/lib/content";
import { cn } from "@/lib/utils";

const ACCENT_RING = {
  electric: "group-hover/show:border-electric-400/50",
  aqua: "group-hover/show:border-aqua-400/50",
  violet: "group-hover/show:border-violet-400/50",
} as const;

const ACCENT_GLOW = {
  electric: "from-electric-500/25",
  aqua: "from-aqua-400/25",
  violet: "from-violet-500/25",
} as const;

/**
 * Gallery of finished work. Each tile shows the rendered result at rest and
 * cross-fades to the originating wireframe on hover — the whole value
 * proposition compressed into one gesture, repeated twelve times down the page.
 */
export function Showcase({ limit }: { limit?: number }) {
  const items = limit ? showcase.slice(0, limit) : showcase;

  return (
    <section className="section-y relative" aria-labelledby="showcase-heading">
      <div className="container-skite">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            titleId="showcase-heading"
            eyebrow="Showcase"
            title={
              <>
                Drawn on a Tuesday. <Accent>Deployed</Accent> on a Tuesday.
              </>
            }
            lead="Every one of these started as a photograph of something someone drew by hand."
            titleClassName="text-display"
          />

          <Reveal delay={0.2} className="shrink-0">
            <Button asChild variant="outline" size="lg" magnetic>
              <Link href="/showcase">
                Browse the full gallery
                <ArrowUpRight className="size-4" strokeWidth={2} />
              </Link>
            </Button>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <Reveal key={item.title} delay={(index % 3) * 0.09}>
              <TiltCard intensity={6} className="h-full">
                <article
                  className={cn(
                    "group/show relative flex h-full flex-col overflow-hidden rounded-lg",
                    "glass glass-sheen transition-colors duration-500",
                    ACCENT_RING[item.accent],
                  )}
                >
                  {/* Preview: render at rest, wireframe on hover */}
                  <div className="relative aspect-4/3 overflow-hidden border-b border-border bg-abyss-900">
                    <div
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-0 z-10 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-500 group-hover/show:opacity-100",
                        ACCENT_GLOW[item.accent],
                      )}
                    />
                    <div className="absolute inset-0 transition-opacity duration-500 group-hover/show:opacity-0">
                      <MockSite mode="render" />
                    </div>
                    <div className="grid-paper-fine absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/show:opacity-100">
                      <MockSite mode="wire" />
                    </div>

                    <span className="absolute bottom-3 left-3 z-20 rounded-full bg-abyss-950/75 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-white/80 uppercase opacity-0 backdrop-blur-sm transition-opacity duration-400 group-hover/show:opacity-100">
                      Original sketch
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-display text-base font-semibold tracking-[-0.015em]">
                          {item.title}
                        </h3>
                        <p className="text-[0.8125rem] text-subtle">{item.category}</p>
                      </div>
                      <ArrowUpRight
                        className="size-4 shrink-0 -translate-x-1 translate-y-1 text-subtle opacity-0 transition-all duration-400 group-hover/show:translate-x-0 group-hover/show:translate-y-0 group-hover/show:opacity-100"
                        strokeWidth={2}
                      />
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <Badge size="sm" variant="outline" className="font-mono">
                        {item.source}
                      </Badge>
                      <Badge size="sm" variant={item.accent} className="font-mono">
                        {item.duration}
                      </Badge>
                    </div>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

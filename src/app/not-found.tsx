import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { Aurora } from "@/components/backdrop/aurora";
import { DrawPad } from "@/components/interactive/draw-pad";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Accent } from "@/components/ui/section-heading";
import { allRoutes } from "@/lib/site";

/**
 * 404. The one page on a sketch-to-website product that was never drawn — so
 * we hand the visitor a pencil instead of an apology.
 */
export default function NotFound() {
  const suggestions = allRoutes.filter((route) =>
    ["/", "/features", "/pricing", "/showcase", "/docs", "/contact"].includes(route.href),
  );

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden py-32">
      <div className="grid-paper mask-radial-fade absolute inset-0" />
      <Aurora intensity={0.7} />

      <div className="container-skite relative">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20">
          <div className="flex flex-col gap-7">
            <Reveal>
              <span className="font-display text-[clamp(4rem,3rem+8vw,9rem)] leading-none font-semibold tracking-[-0.05em] text-brand-gradient">
                404
              </span>
            </Reveal>

            <Reveal delay={0.08} className="flex flex-col gap-4">
              <h1 className="text-title">
                This page was never <Accent>drawn</Accent>.
              </h1>
              <p className="max-w-md text-lead text-muted">
                Nothing here to redraw — the link is broken, the page moved, or it only ever
                existed in someone&apos;s head. Draw your own while you decide where to go.
              </p>
            </Reveal>

            <Reveal delay={0.16} className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/">
                  <ArrowLeft className="size-4" strokeWidth={2} />
                  Back home
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" magnetic>
                <Link href="/showcase">
                  <Compass className="size-4" strokeWidth={2} />
                  Browse the showcase
                </Link>
              </Button>
            </Reveal>

            <Reveal delay={0.24} className="flex flex-col gap-3 border-t border-border pt-7">
              <p className="font-mono text-[10px] tracking-[0.2em] text-subtle uppercase">
                Or try one of these
              </p>
              <ul className="flex flex-wrap gap-2">
                {suggestions.map((route) => (
                  <li key={route.href}>
                    <Link
                      href={route.href}
                      className="inline-flex rounded-full border border-border px-3.5 py-1.5 text-[0.8125rem] text-muted transition-colors duration-300 hover:border-electric-400/50 hover:text-foreground"
                    >
                      {route.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-subtle">
                Press{" "}
                <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>{" "}
                to search everything.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.2} direction="left">
            <DrawPad />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

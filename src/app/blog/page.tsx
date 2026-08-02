import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Cta } from "@/components/sections/cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent } from "@/components/ui/section-heading";
import { posts } from "@/lib/blog";
import { createMetadata } from "@/lib/metadata";
import { formatDate } from "@/lib/utils";

export const metadata = createMetadata({
  title: "Blog",
  description:
    "Research notes and product dispatches from the team building SKITE — how the constraint graph works, reading badly-photographed whiteboards, and why the rebuild step was never design work.",
  path: "/blog",
  keywords: ["SKITE blog", "AI design engineering writing"],
});

export default function BlogPage() {
  const [featured, ...rest] = posts;

  return (
    <>
      <PageHero
        eyebrow="Blog"
        crumbs={[{ label: "Blog", href: "/blog" }]}
        title={
          <>
            Notes from inside the <Accent>redraw engine</Accent>.
          </>
        }
        lead="Research, architecture and the occasional opinion. Written by the people who built it, published when there is something worth saying."
      />

      <section className="section-y">
        <div className="container-skite flex flex-col gap-5">
          {/* Featured */}
          <Reveal>
            <Link href={`/blog/${featured.slug}`} className="group/post block">
              <GlassCard
                variant="accent"
                radius="xl"
                padding="none"
                className="grid gap-8 p-8 transition-transform duration-500 group-hover/post:-translate-y-1 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:p-12"
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="accent" size="sm">
                      Featured
                    </Badge>
                    <Badge variant="outline" size="sm">
                      {featured.category}
                    </Badge>
                  </div>

                  <h2 className="font-display text-title font-semibold tracking-[-0.03em]">
                    {featured.title}
                  </h2>
                  <p className="max-w-xl text-lead text-muted">{featured.excerpt}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-subtle">
                    <span className="text-foreground">{featured.author.name}</span>
                    <span>{featured.author.role}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={featured.date}>{formatDate(featured.date)}</time>
                    <span aria-hidden>·</span>
                    <span>{featured.readingTime}</span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-electric-300">
                    Read the piece
                    <ArrowUpRight
                      className="size-4 transition-transform duration-300 group-hover/post:translate-x-0.5 group-hover/post:-translate-y-0.5"
                      strokeWidth={2}
                    />
                  </span>
                </div>

                <div
                  aria-hidden
                  className="relative hidden aspect-square overflow-hidden rounded-lg border border-border lg:block"
                >
                  <div className="grid-paper-fine absolute inset-0 opacity-70" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_35%,rgba(46,107,255,0.4),transparent_62%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_75%,rgba(139,92,246,0.35),transparent_58%)]" />
                  <span className="absolute inset-x-0 top-1/2 h-px bg-[linear-gradient(90deg,transparent,var(--color-aqua-300),transparent)]" />
                </div>
              </GlassCard>
            </Link>
          </Reveal>

          {/* The rest */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((post, index) => (
              <Reveal key={post.slug} delay={(index % 3) * 0.08}>
                <TiltCard intensity={5} className="h-full">
                  <Link href={`/blog/${post.slug}`} className="group/card block h-full">
                    <GlassCard
                      radius="lg"
                      padding="none"
                      className="flex h-full flex-col gap-4 p-7"
                    >
                      <Badge variant="outline" size="sm" className="w-fit">
                        {post.category}
                      </Badge>

                      <h2 className="font-display text-[1.125rem] leading-snug font-semibold tracking-[-0.02em]">
                        {post.title}
                      </h2>
                      <p className="flex-1 text-[0.875rem] leading-relaxed text-muted">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center justify-between gap-3 border-t border-border pt-4 text-[0.75rem] text-subtle">
                        <time dateTime={post.date}>{formatDate(post.date)}</time>
                        <span>{post.readingTime}</span>
                      </div>
                    </GlassCard>
                  </Link>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Cta />
    </>
  );
}

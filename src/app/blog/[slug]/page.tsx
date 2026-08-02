import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Cta } from "@/components/sections/cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { getAdjacentPosts, getPost, posts } from "@/lib/blog";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { formatDate } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

/** Pre-renders every post at build time — the set is known and finite. */
export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return createMetadata({
      title: "Post not found",
      description: "This article does not exist.",
      path: `/blog/${slug}`,
      index: false,
    });
  }

  return createMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    keywords: [post.category.toLowerCase()],
  });
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) notFound();

  const { previous, next } = getAdjacentPosts(slug);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: post.author.name },
    publisher: {
      "@type": "Organization",
      name: siteConfig.company.legalName,
      logo: { "@type": "ImageObject", url: `${siteConfig.url}/icon.svg` },
    },
    mainEntityOfPage: `${siteConfig.url}/blog/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <PageHero
        crumbs={[
          { label: "Blog", href: "/blog" },
          { label: post.title, href: `/blog/${post.slug}` },
        ]}
        eyebrow={post.category}
        title={post.title}
        lead={post.excerpt}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-subtle">
          <span className="text-foreground">{post.author.name}</span>
          <span>{post.author.role}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>{post.readingTime}</span>
        </div>
      </PageHero>

      <article className="section-y">
        <div className="container-skite">
          <div className="mx-auto flex max-w-2xl flex-col gap-7">
            {post.body.map((block, index) => {
              if (block.kind === "h2") {
                return (
                  <Reveal key={index}>
                    <h2 className="mt-6 font-display text-heading font-semibold tracking-[-0.025em]">
                      {block.text}
                    </h2>
                  </Reveal>
                );
              }

              if (block.kind === "quote") {
                return (
                  <Reveal key={index}>
                    <blockquote className="my-2 border-l-2 border-electric-400/60 py-1 pl-6">
                      <p className="font-serif text-[1.375rem] leading-snug italic text-foreground/90">
                        {block.text}
                      </p>
                    </blockquote>
                  </Reveal>
                );
              }

              if (block.kind === "list") {
                return (
                  <Reveal key={index}>
                    <ul className="flex flex-col gap-3">
                      {block.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-[1.0625rem] leading-relaxed text-muted">
                          <span
                            aria-hidden
                            className="mt-2.5 size-1.5 shrink-0 rounded-full bg-electric-400"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                );
              }

              return (
                <Reveal key={index}>
                  <p className="text-[1.0625rem] leading-relaxed text-muted">{block.text}</p>
                </Reveal>
              );
            })}
          </div>

          {/* Prev / next */}
          <Reveal className="mx-auto mt-20 max-w-2xl">
            <div className="grid gap-4 border-t border-border pt-10 sm:grid-cols-2">
              {previous ? (
                <Link href={`/blog/${previous.slug}`} className="group/nav">
                  <GlassCard radius="md" padding="md" className="flex h-full flex-col gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-subtle uppercase">
                      <ArrowLeft className="size-3" strokeWidth={2} />
                      Previous
                    </span>
                    <span className="text-[0.9375rem] font-medium transition-colors group-hover/nav:text-electric-300">
                      {previous.title}
                    </span>
                  </GlassCard>
                </Link>
              ) : (
                <div />
              )}

              {next ? (
                <Link href={`/blog/${next.slug}`} className="group/nav sm:text-right">
                  <GlassCard radius="md" padding="md" className="flex h-full flex-col gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-subtle uppercase sm:justify-end">
                      Next
                      <ArrowRight className="size-3" strokeWidth={2} />
                    </span>
                    <span className="text-[0.9375rem] font-medium transition-colors group-hover/nav:text-electric-300">
                      {next.title}
                    </span>
                  </GlassCard>
                </Link>
              ) : null}
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-[0.875rem] text-muted transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" strokeWidth={2} />
                All writing
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 flex justify-center">
            <Badge variant="outline" size="sm">
              {post.category}
            </Badge>
          </div>
        </div>
      </article>

      <Cta />
    </>
  );
}

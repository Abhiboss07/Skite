"use client";

import { Marquee } from "@/components/motion/marquee";
import { Reveal } from "@/components/motion/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { testimonials } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * Two counter-scrolling marquees. Opposing directions read as a living surface
 * rather than a single conveyor belt, and the split lets twice the content sit
 * in the same vertical space.
 */
export function Testimonials() {
  const firstRow = testimonials.slice(0, Math.ceil(testimonials.length / 2));
  const secondRow = testimonials.slice(Math.ceil(testimonials.length / 2));

  return (
    <section className="section-y relative overflow-hidden" aria-labelledby="testimonials-heading">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[36rem] w-[64rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(34,211,238,0.12),transparent_65%)] blur-3xl"
      />

      <div className="container-skite relative">
        <SectionHeading
          align="center"
          eyebrow="Signal"
          title={
            <>
              The reaction is usually <Accent>disbelief</Accent>, then relief.
            </>
          }
          lead="From the designers, engineers and founders who stopped rebuilding their own whiteboards."
          titleClassName="text-display"
        />
      </div>

      <div className="mt-16 flex flex-col gap-5">
        <Marquee speed={64} itemClassName="px-2.5">
          {firstRow.map((testimonial) => (
            <TestimonialCard key={testimonial.name} {...testimonial} />
          ))}
        </Marquee>
        <Marquee speed={74} reverse itemClassName="px-2.5">
          {secondRow.map((testimonial) => (
            <TestimonialCard key={testimonial.name} {...testimonial} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}

function TestimonialCard({
  quote,
  name,
  role,
  company,
}: {
  quote: string;
  name: string;
  role: string;
  company: string;
}) {
  // Deterministic initials — avoids shipping avatar images for placeholder people.
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <GlassCard
      radius="lg"
      padding="none"
      className={cn(
        "flex h-full w-[21rem] flex-col gap-5 p-6 sm:w-[25rem]",
        "transition-transform duration-500 hover:-translate-y-1",
      )}
    >
      <svg viewBox="0 0 24 24" className="size-6 shrink-0 text-electric-400/50" fill="currentColor" aria-hidden>
        <path d="M9.6 5.2c-3.4 1.6-5.6 4.6-5.6 8.4 0 3.2 1.9 5.2 4.4 5.2 2.2 0 3.9-1.6 3.9-3.8 0-2.1-1.5-3.6-3.4-3.6-.4 0-.9.1-1 .1.3-1.8 2-3.9 3.7-4.9l-2-1.4Zm9.6 0c-3.4 1.6-5.6 4.6-5.6 8.4 0 3.2 1.9 5.2 4.4 5.2 2.2 0 3.9-1.6 3.9-3.8 0-2.1-1.5-3.6-3.4-3.6-.4 0-.9.1-1 .1.3-1.8 2-3.9 3.7-4.9l-2-1.4Z" />
      </svg>

      <blockquote className="flex-1 text-[0.9375rem] leading-relaxed text-foreground/90">
        {quote}
      </blockquote>

      <figcaption className="flex items-center gap-3 border-t border-border pt-5">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(130deg,var(--color-aqua-500),var(--color-electric-600)_55%,var(--color-violet-600))] font-mono text-[11px] font-medium text-white"
        >
          {initials}
        </span>
        <div className="flex flex-col">
          <span className="text-[0.8125rem] font-medium">{name}</span>
          <span className="text-xs text-subtle">
            {role} · {company}
          </span>
        </div>
      </figcaption>
    </GlassCard>
  );
}

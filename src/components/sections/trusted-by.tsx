"use client";

import { Marquee } from "@/components/motion/marquee";
import { Counter } from "@/components/motion/counter";
import { Reveal } from "@/components/motion/reveal";
import { logos, stats } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * Social proof band. Logos are set as typographic wordmarks rather than images:
 * at this scale real logos would be a dozen extra requests and would never sit
 * together optically. Swap for supplied SVGs once partners are real.
 */
export function TrustedBy() {
  return (
    <section className="relative border-y border-border py-14" aria-labelledby="trusted-heading">
      <div className="container-skite">
        <Reveal>
          <h2
            id="trusted-heading"
            className="text-center font-mono text-eyebrow text-subtle uppercase"
          >
            Trusted by studios that care about the details
          </h2>
        </Reveal>
      </div>

      <div className="mt-9">
        <Marquee speed={48} itemClassName="px-8 md:px-12">
          {logos.map((logo) => (
            <span
              key={logo}
              className={cn(
                "font-display text-lg font-medium tracking-[-0.02em] whitespace-nowrap",
                "text-subtle opacity-70 transition-all duration-500",
                "hover:text-foreground hover:opacity-100",
              )}
            >
              {logo}
            </span>
          ))}
        </Marquee>
      </div>

      <div className="container-skite mt-14">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {stats.map((stat, index) => (
            // Reveal renders the <div> that groups each pair — the only element
            // besides dt/dd a <dl> may contain. The term precedes the definition
            // in the DOM as the spec requires; `order` flips them visually so the
            // number still reads first.
            <Reveal
              key={stat.label}
              delay={index * 0.08}
              className="flex flex-col items-center gap-2 text-center"
            >
              <dt className="order-2 text-[0.8125rem] text-subtle">{stat.label}</dt>
              <dd className="order-1 font-display text-[clamp(2rem,1.4rem+2vw,3rem)] leading-none font-semibold tracking-[-0.04em]">
                <Counter
                  value={stat.value}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                  className="text-brand-gradient"
                />
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { GlassCard } from "@/components/ui/glass-card";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

/**
 * Shared renderer for the privacy policy and terms of service.
 *
 * Both documents are structurally identical — a dated preamble followed by
 * numbered sections — so they share one component and differ only in content.
 */
export function LegalPage({
  title,
  lead,
  updated,
  crumbLabel,
  crumbHref,
  sections,
}: {
  title: string;
  lead: string;
  updated: string;
  crumbLabel: string;
  crumbHref: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        crumbs={[{ label: crumbLabel, href: crumbHref }]}
        title={title}
        lead={lead}
      >
        <p className="font-mono text-[11px] tracking-[0.08em] text-subtle">
          Last updated {updated}
        </p>
      </PageHero>

      <section className="section-y">
        <div className="container-skite">
          <div className="grid gap-12 lg:grid-cols-[16rem_1fr] lg:gap-16">
            <aside className="lg:sticky lg:top-32 lg:self-start">
              <nav aria-label="Sections">
                <p className="mb-4 font-mono text-[10px] tracking-[0.2em] text-subtle uppercase">
                  Contents
                </p>
                <ol className="flex flex-col gap-1 border-l border-border">
                  {sections.map((section, index) => (
                    <li key={section.heading}>
                      <a
                        href={`#section-${index + 1}`}
                        className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[0.875rem] text-muted transition-colors duration-300 hover:border-electric-400 hover:text-foreground"
                      >
                        {index + 1}. {section.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <div className="flex min-w-0 flex-col gap-12">
              <Reveal>
                <GlassCard radius="lg" padding="md">
                  <p className="text-[0.875rem] leading-relaxed text-muted">
                    <span className="font-medium text-foreground">Plain-language summary.</span>{" "}
                    {lead}
                  </p>
                </GlassCard>
              </Reveal>

              {sections.map((section, index) => (
                <Reveal key={section.heading}>
                  <section id={`section-${index + 1}`} className="scroll-mt-32">
                    <h2 className="font-display text-heading font-semibold tracking-[-0.025em]">
                      <span className="mr-3 font-mono text-[0.875rem] text-subtle">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {section.heading}
                    </h2>

                    <div className="mt-5 flex max-w-2xl flex-col gap-4">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph} className="text-[0.9375rem] leading-relaxed text-muted">
                          {paragraph}
                        </p>
                      ))}

                      {section.bullets?.length ? (
                        <ul className="flex flex-col gap-2.5">
                          {section.bullets.map((bullet) => (
                            <li
                              key={bullet}
                              className="flex items-start gap-3 text-[0.9375rem] leading-relaxed text-muted"
                            >
                              <span
                                aria-hidden
                                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-electric-400"
                              />
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </section>
                </Reveal>
              ))}

              <Reveal>
                <GlassCard radius="lg" padding="md" className="border-warning-400/25">
                  <p className="text-[0.8125rem] leading-relaxed text-muted">
                    <span className="font-medium text-warning-400">Not yet legal advice.</span>{" "}
                    This document is a drafting starting point written for the launch site. Have
                    it reviewed by counsel in your operating jurisdictions before you rely on it.
                  </p>
                </GlassCard>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

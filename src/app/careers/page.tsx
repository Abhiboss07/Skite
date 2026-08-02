import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Cta } from "@/components/sections/cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { Badge, PulseBadge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata = createMetadata({
  title: "Careers",
  description:
    "Open roles at SKITE. Small team, distributed, building the redraw engine — research, front-end infrastructure, design and developer relations.",
  path: "/careers",
  keywords: ["SKITE jobs", "AI design tool careers"],
});

const ROLES = [
  {
    title: "Research Engineer, Structure",
    team: "Research",
    location: "Remote (UTC−8 to UTC+3)",
    type: "Full-time",
    blurb:
      "Own the pass that turns strokes into a constraint graph. This is the highest-leverage surface in the product and the hardest to evaluate.",
  },
  {
    title: "Front-end Infrastructure Engineer",
    team: "Platform",
    location: "Remote or San Francisco",
    type: "Full-time",
    blurb:
      "Make generated code indistinguishable from code a careful human wrote. Compilers, ASTs, and strong opinions about semantic HTML.",
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote (Europe preferred)",
    type: "Full-time",
    blurb:
      "Design the tool designers use to stop doing the boring part of design. Uncomfortably meta; genuinely fun.",
  },
  {
    title: "Developer Relations Engineer",
    team: "DevRel",
    location: "Remote",
    type: "Full-time",
    blurb:
      "Write the docs, build the examples, answer the Discord at a human speed. You will ship code, not conference talks.",
  },
  {
    title: "Evaluation Engineer",
    team: "Research",
    location: "Remote",
    type: "Contract → full-time",
    blurb:
      "Build the harness that tells us whether a release actually improved fidelity, on 4,000 hand-labelled wireframes.",
  },
];

const BENEFITS = [
  "Fully distributed, with a San Francisco room if you want one",
  "Four-day weeks in August, every year, no exceptions",
  "Equipment budget that assumes you know what you need",
  "Private health cover wherever we can legally provide it",
  "Meaningful equity, with the maths explained before you sign",
  "Conference and course budget, used or not — no guilt either way",
];

export default function CareersPage() {
  return (
    <>
      <PageHero
        eyebrow="Careers"
        crumbs={[{ label: "Careers", href: "/careers" }]}
        title={
          <>
            Build the thing that ends <Accent>transcription work</Accent>.
          </>
        }
        lead="Eighteen people. No layers. If you join, the surface you own will be genuinely yours — which is the good news and also the warning."
      >
        <PulseBadge tone="success">5 open roles</PulseBadge>
      </PageHero>

      <section className="section-y">
        <div className="container-skite">
          <SectionHeading
            eyebrow="Open roles"
            title="Where we need help right now."
            titleClassName="text-display"
          />

          <ul className="mt-14 flex flex-col gap-3">
            {ROLES.map((role, index) => (
              // Reveal inside the <li>: a <ul> may only directly contain <li>.
              <li key={role.title}>
                <Reveal delay={index * 0.06}>
                  <Link href="/contact" className="group/role block">
                    <GlassCard
                      radius="lg"
                      padding="none"
                      className={cn(
                        "flex flex-col gap-4 p-7 transition-all duration-500",
                        "group-hover/role:-translate-y-0.5 group-hover/role:border-electric-400/40",
                        "md:flex-row md:items-center md:gap-8",
                      )}
                    >
                      <div className="flex flex-1 flex-col gap-2">
                        <h3 className="font-display text-[1.125rem] font-semibold tracking-[-0.02em]">
                          {role.title}
                        </h3>
                        <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
                          {role.blurb}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                        <Badge size="sm" variant="accent">
                          {role.team}
                        </Badge>
                        <Badge size="sm" variant="outline">
                          {role.location}
                        </Badge>
                        <Badge size="sm">{role.type}</Badge>
                        <ArrowUpRight
                          className="size-4 text-subtle transition-all duration-300 group-hover/role:translate-x-0.5 group-hover/role:-translate-y-0.5 group-hover/role:text-electric-300"
                          strokeWidth={2}
                        />
                      </div>
                    </GlassCard>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>

          <Reveal delay={0.2} className="mt-6">
            <GlassCard radius="lg" padding="lg" className="flex flex-col gap-3">
              <h3 className="font-display text-base font-semibold">
                Nothing here fits, but you are certain?
              </h3>
              <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
                Write to{" "}
                <a
                  href={`mailto:${siteConfig.links.email}`}
                  className="text-electric-300 underline underline-offset-4 hover:text-electric-200"
                >
                  {siteConfig.links.email}
                </a>{" "}
                and tell us what you would own and why it matters. We read all of them, and we
                have hired from three.
              </p>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      <section className="section-y border-t border-border">
        <div className="container-skite">
          <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <SectionHeading
              eyebrow="How we work"
              title={
                <>
                  Small, distributed, and <Accent>allergic to process</Accent>.
                </>
              }
              lead="We write things down instead of meeting about them. Deep work is protected by default. Nobody is measured on hours."
              titleClassName="text-display"
            />

            <Reveal delay={0.12}>
              <ul className="flex flex-col gap-3">
                {BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 border-b border-border pb-3 text-[0.9375rem] text-muted last:border-0"
                  >
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-electric-400"
                    />
                    {benefit}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <Cta />
    </>
  );
}

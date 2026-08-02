import { Counter } from "@/components/motion/counter";
import { Cta } from "@/components/sections/cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createMetadata({
  title: "About",
  description:
    "SKITE is built by a small team who got tired of redrawing their own whiteboards. Our story, the principles we build against, and the people behind the redraw engine.",
  path: "/about",
  keywords: ["about SKITE", "SKITE team", "design tool company"],
});

const VALUES = [
  {
    title: "Fidelity over flourish",
    body: "We will never improve your layout without being asked. A tool that silently overrides intent is a collaborator you did not hire.",
  },
  {
    title: "Boring where it counts",
    body: "Type-checks, contrast ratios and keyboard reachability are arithmetic, not judgement. They belong outside the model, as hard gates.",
  },
  {
    title: "Legible failure",
    body: "When something is wrong you should be able to see where. That is why there is an inspectable graph in the middle of the pipeline.",
  },
  {
    title: "Your work is yours",
    body: "No training on customer data, on any plan. Delete a project and the artefacts go with it. This is not a tier, it is a floor.",
  },
];

/** ⚠️ Placeholder — invented people. Replace with the real team before launch. */
const TEAM = [
  { name: "Aisha Kone", role: "Co-founder & CEO", note: "Previously design systems at a large marketplace." },
  { name: "Marisol Vega", role: "Co-founder & CTO", note: "Computer vision, then eight years of front-end infrastructure." },
  { name: "Dae-Ho Lim", role: "Research Engineer", note: "Works on the ingest and structure passes." },
  { name: "Freya Ostrom", role: "Design Lead", note: "Responsible for everything you are looking at." },
  { name: "Tomás Iglesias", role: "Platform Engineer", note: "Keeps the queue fast and the SLAs honest." },
  { name: "Nadia Haddad", role: "Developer Relations", note: "Writes the docs, answers the Discord." },
];

const MILESTONES = [
  { year: "2024", event: "Founded after one too many workshop rebuilds." },
  { year: "2025", event: "Structure pass v1 — the constraint graph proves the thesis." },
  { year: "2025", event: "Private beta opens to 400 studios." },
  { year: "2026", event: "Structure pass v4 reaches 94% layout fidelity." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        crumbs={[{ label: "About", href: "/about" }]}
        title={
          <>
            We got tired of redrawing our own <Accent>whiteboards</Accent>.
          </>
        }
        lead="SKITE started as an internal tool built out of irritation. The irritation turned out to be universal."
      />

      <section className="section-y">
        <div className="container-skite">
          <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <Reveal className="flex flex-col gap-5 text-[1.0625rem] leading-relaxed text-muted">
              <p>
                In 2024 we were running design workshops for a marketplace product. Every session
                ended the same way: a whiteboard covered in exactly the right answer, photographed
                on six phones, and then two days of work to turn that photograph back into
                something a browser could render.
              </p>
              <p>
                Nobody thought this was strange. It is simply how the work goes. But the drawing
                was already a specification — complete, agreed, and understood by everyone in the
                room. Everything after it was transcription, performed at senior salaries, with
                loss at every step.
              </p>
              <p>
                We built the first version to skip that. It was bad. The second was worse in more
                interesting ways. The thing that eventually worked was not a better model but a
                different shape: compile the drawing into an explicit structure first, then
                constrain generation to it.
              </p>
              <p className="text-foreground">
                That single decision is the company.
              </p>
            </Reveal>

            <Reveal delay={0.12} className="flex flex-col gap-4">
              {MILESTONES.map((milestone, index) => (
                <GlassCard
                  key={`${milestone.year}-${index}`}
                  radius="md"
                  padding="none"
                  className="flex items-start gap-5 p-5"
                >
                  <span className="font-mono text-[0.8125rem] text-electric-300">
                    {milestone.year}
                  </span>
                  <p className="flex-1 text-[0.9375rem] text-muted">{milestone.event}</p>
                </GlassCard>
              ))}

              <GlassCard variant="accent" radius="lg" padding="lg" className="mt-2">
                <dl className="grid grid-cols-2 gap-6">
                  {[
                    { label: "Founded", value: 2024, suffix: "" },
                    { label: "People", value: 18, suffix: "" },
                    { label: "Teams building", value: 38, suffix: "k" },
                    { label: "Layout fidelity", value: 94, suffix: "%" },
                  ].map((stat) => (
                    <div key={stat.label} className="flex flex-col gap-1">
                      <dd className="font-display text-[1.75rem] leading-none font-semibold tracking-[-0.04em]">
                        <Counter value={stat.value} suffix={stat.suffix} className="text-brand-gradient" />
                      </dd>
                      <dt className="text-[0.8125rem] text-subtle">{stat.label}</dt>
                    </div>
                  ))}
                </dl>
              </GlassCard>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section-y border-t border-border">
        <div className="container-skite">
          <SectionHeading
            eyebrow="Principles"
            title={
              <>
                Four things we will not <Accent>trade away</Accent>.
              </>
            }
            titleClassName="text-display"
          />

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {VALUES.map((value, index) => (
              <Reveal key={value.title} delay={(index % 2) * 0.08}>
                <GlassCard radius="lg" padding="lg" className="flex h-full flex-col gap-3">
                  <h3 className="font-display text-[1.125rem] font-semibold tracking-[-0.02em]">
                    {value.title}
                  </h3>
                  <p className="text-[0.9375rem] leading-relaxed text-muted">{value.body}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y border-t border-border">
        <div className="container-skite">
          <SectionHeading
            eyebrow="Team"
            title="Eighteen people, one obsession."
            lead={`Distributed, with a room in ${siteConfig.company.location} for the people who want one.`}
            titleClassName="text-display"
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member, index) => (
              <Reveal key={member.name} delay={(index % 3) * 0.07}>
                <GlassCard radius="lg" padding="md" className="flex h-full items-start gap-4">
                  <span
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(130deg,var(--color-aqua-500),var(--color-electric-600)_55%,var(--color-violet-600))] font-mono text-[12px] font-medium text-white"
                  >
                    {member.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="text-[0.9375rem] font-medium">{member.name}</p>
                    <p className="text-[0.8125rem] text-electric-300">{member.role}</p>
                    <p className="mt-1 text-[0.8125rem] leading-snug text-subtle">{member.note}</p>
                  </div>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Cta />
    </>
  );
}

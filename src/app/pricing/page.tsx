import { Faq } from "@/components/sections/faq";
import { Cta } from "@/components/sections/cta";
import { Pricing } from "@/components/sections/pricing";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Pricing",
  description:
    "Start free with five redraws a month. Studio at ₹1,999 per editor billed annually for unlimited redraws and design-system binding. Custom Atelier plans for agencies and platform teams.",
  path: "/pricing",
  keywords: ["SKITE pricing", "sketch to code pricing", "AI design tool cost"],
});

const COMPARISON = [
  { feature: "Redraws per month", sketch: "5", studio: "Unlimited", atelier: "Unlimited" },
  { feature: "React + Tailwind export", sketch: true, studio: true, atelier: true },
  { feature: "Photoreal render mode", sketch: true, studio: true, atelier: true },
  { feature: "Design-system binding", sketch: false, studio: true, atelier: true },
  { feature: "Plain-language iteration", sketch: false, studio: true, atelier: true },
  { feature: "Figma & GitHub integrations", sketch: false, studio: true, atelier: true },
  { feature: "API access", sketch: false, studio: true, atelier: true },
  { feature: "Private previews (no badge)", sketch: false, studio: true, atelier: true },
  { feature: "Dedicated model capacity", sketch: false, studio: false, atelier: true },
  { feature: "Self-hosted / VPC deployment", sketch: false, studio: false, atelier: true },
  { feature: "SSO, SCIM and audit logs", sketch: false, studio: false, atelier: true },
  { feature: "99.9% uptime SLA", sketch: false, studio: false, atelier: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="font-mono text-[0.8125rem] text-foreground">{value}</span>;
  }
  return value ? (
    <span className="mx-auto grid size-5 place-items-center rounded-full bg-[linear-gradient(120deg,var(--color-aqua-500),var(--color-electric-600))] text-white">
      <svg viewBox="0 0 12 12" className="size-2.5" fill="none" aria-hidden>
        <path d="M2 6.2 4.6 8.8 10 3.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">Included</span>
    </span>
  ) : (
    <span className="text-subtle/50" aria-label="Not included">
      —
    </span>
  );
}

export default function PricingPage() {
  return (
    <>
      <PageHero
        align="center"
        eyebrow="Pricing"
        crumbs={[{ label: "Pricing", href: "/pricing" }]}
        title={
          <>
            Priced for the work, not the <Accent>seat count</Accent>.
          </>
        }
        lead="Five free redraws every month, forever. Upgrade when SKITE has already paid for itself — which, for most teams, is the first afternoon."
      />

      <div className="pt-16">
        <Pricing standalone />
      </div>

      <section className="section-y border-t border-border">
        <div className="container-skite">
          <SectionHeading
            align="center"
            eyebrow="Compare"
            title="Everything, side by side."
            titleClassName="text-display"
          />

          <Reveal delay={0.15} className="mt-14">
            {/* Wide table scrolls inside its own container so the page body never
                scrolls horizontally on small screens. */}
            <div className="overflow-x-auto">
              <GlassCard radius="xl" padding="none" className="min-w-3xl overflow-hidden">
                <table className="w-full text-left">
                  <caption className="sr-only">Feature comparison across SKITE plans</caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="px-6 py-5 font-mono text-[10px] tracking-[0.16em] text-subtle uppercase">
                        Feature
                      </th>
                      {["Sketch", "Studio", "Atelier"].map((plan) => (
                        <th
                          key={plan}
                          scope="col"
                          className="px-6 py-5 text-center font-display text-sm font-semibold"
                        >
                          {plan}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row) => (
                      <tr
                        key={row.feature}
                        className="border-b border-border transition-colors last:border-0 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]"
                      >
                        <th scope="row" className="px-6 py-4 text-[0.875rem] font-normal text-muted">
                          {row.feature}
                        </th>
                        <td className="px-6 py-4 text-center">
                          <Cell value={row.sketch} />
                        </td>
                        <td className="bg-[color-mix(in_oklab,var(--color-electric-500)_6%,transparent)] px-6 py-4 text-center">
                          <Cell value={row.studio} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Cell value={row.atelier} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            </div>
          </Reveal>
        </div>
      </section>

      <Faq limit={5} />
      <Cta />
    </>
  );
}

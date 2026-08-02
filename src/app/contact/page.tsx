import { Mail, MapPin, MessageCircle, Users } from "lucide-react";

import { ContactForm } from "@/components/sections/contact-form";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createMetadata({
  title: "Contact",
  description:
    "Talk to the SKITE team about sales, support, partnerships or press — or just send us the messiest sketch you have and we will redraw it.",
  path: "/contact",
  keywords: ["contact SKITE", "SKITE sales", "SKITE support"],
});

const CHANNELS = [
  {
    icon: Mail,
    title: "Email",
    body: "For anything that is not urgent. We answer within one working day.",
    action: siteConfig.links.email,
    href: `mailto:${siteConfig.links.email}`,
  },
  {
    icon: MessageCircle,
    title: "Discord",
    body: "The fastest route to an engineer. Genuinely — we live in there.",
    action: "Join the server",
    href: siteConfig.links.discord,
  },
  {
    icon: Users,
    title: "Sales",
    body: "Atelier plans, procurement, security review and self-hosted deployment.",
    action: "Book a call",
    href: `mailto:${siteConfig.links.email}?subject=Atelier%20enquiry`,
  },
  {
    icon: MapPin,
    title: "Studio",
    body: `${siteConfig.company.location}. Distributed team, with a room for whoever wants one.`,
    action: null,
    href: null,
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        crumbs={[{ label: "Contact", href: "/contact" }]}
        title={
          <>
            Send us the sketch you think will <Accent>break it</Accent>.
          </>
        }
        lead="Genuinely our favourite kind of message. Failure cases teach us more than clean ones do — and you get the result back either way."
      />

      <section className="section-y">
        <div className="container-skite">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
            <Reveal>
              <ContactForm />
            </Reveal>

            <Reveal delay={0.12} className="flex flex-col gap-4">
              {CHANNELS.map((channel) => (
                <GlassCard
                  key={channel.title}
                  radius="lg"
                  padding="md"
                  className="flex items-start gap-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-[color-mix(in_oklab,var(--color-electric-500)_12%,transparent)] text-electric-300">
                    <channel.icon className="size-4.5" strokeWidth={1.6} />
                  </span>

                  <div className="flex flex-col gap-1.5">
                    <h2 className="font-display text-base font-semibold">{channel.title}</h2>
                    <p className="text-[0.875rem] leading-relaxed text-muted">{channel.body}</p>
                    {channel.action && channel.href ? (
                      <a
                        href={channel.href}
                        {...(channel.href.startsWith("http")
                          ? { target: "_blank", rel: "noreferrer noopener" }
                          : {})}
                        className="mt-1 w-fit text-[0.875rem] text-electric-300 underline underline-offset-4 transition-colors hover:text-electric-200"
                      >
                        {channel.action}
                      </a>
                    ) : null}
                  </div>
                </GlassCard>
              ))}
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}

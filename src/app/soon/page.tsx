import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Aurora } from "@/components/backdrop/aurora";
import { ParticleField } from "@/components/backdrop/particle-field";
import { LogoMark } from "@/components/brand/logo";
import { Reveal } from "@/components/motion/reveal";
import { WaitlistForm } from "@/components/sections/waitlist-form";
import { Button } from "@/components/ui/button";
import { PulseBadge } from "@/components/ui/badge";
import { Accent } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Coming Soon",
  description: "SKITE is opening access in waves. Join the waitlist to get an invitation.",
  path: "/soon",
  // Utility page — kept out of the index so it never outranks real content.
  index: false,
});

const UPCOMING = [
  { label: "Private beta", detail: "400 studios, currently redrawing", state: "live" },
  { label: "Public beta", detail: "Opening in waves through the autumn", state: "next" },
  { label: "API general availability", detail: "Alongside public beta", state: "next" },
  { label: "Self-hosted deployment", detail: "Atelier customers first", state: "later" },
];

export default function ComingSoonPage() {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden py-32">
      <div className="grid-paper mask-radial-fade absolute inset-0" />
      <Aurora interactive />
      <ParticleField className="opacity-60" maxParticles={80} />

      <div className="container-skite relative">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
          <Reveal>
            <LogoMark className="h-12 w-12" animated />
          </Reveal>

          <Reveal delay={0.06}>
            <PulseBadge tone="accent">Private beta · opening in waves</PulseBadge>
          </Reveal>

          <Reveal delay={0.12} className="flex flex-col gap-5">
            <h1 className="text-display">
              Almost <Accent>ready</Accent>.
            </h1>
            <p className="text-lead text-muted">
              We are letting teams in gradually so the queue stays fast and we can actually
              read the feedback. Leave your email and we will send an invitation with your
              first five redraws attached.
            </p>
          </Reveal>

          <Reveal delay={0.2} className="w-full max-w-md">
            <WaitlistForm />
          </Reveal>

          <Reveal delay={0.28} className="w-full">
            <ol className="mx-auto flex max-w-md flex-col gap-3 border-t border-border pt-8 text-left">
              {UPCOMING.map((item) => (
                <li key={item.label} className="flex items-center gap-3.5">
                  <span
                    aria-hidden
                    className={
                      item.state === "live"
                        ? "size-2 shrink-0 rounded-full bg-success-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.6)]"
                        : item.state === "next"
                          ? "size-2 shrink-0 rounded-full bg-electric-400"
                          : "size-2 shrink-0 rounded-full border border-subtle/60"
                    }
                  />
                  <span className="flex-1 text-[0.9375rem] text-foreground">{item.label}</span>
                  <span className="text-[0.8125rem] text-subtle">{item.detail}</span>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={0.34}>
            <Button asChild variant="ghost" size="md" magnetic={false}>
              <Link href="/">
                <ArrowLeft className="size-4" strokeWidth={2} />
                Back to the site
              </Link>
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

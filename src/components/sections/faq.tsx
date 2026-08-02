"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { faqs } from "@/lib/content";

export function Faq({ limit }: { limit?: number }) {
  const items = limit ? faqs.slice(0, limit) : faqs;

  return (
    <section className="section-y relative" aria-labelledby="faq-heading">
      <div className="container-skite">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeading
              eyebrow="Questions"
              title={
                <>
                  The things people ask <Accent>before</Accent> they trust it.
                </>
              }
              lead="If something is still unclear, we would rather you asked than guessed."
              titleClassName="text-display"
            />

            <Reveal delay={0.2} className="mt-10">
              <GlassCard radius="lg" padding="md" className="flex flex-col gap-4">
                <span className="grid size-10 place-items-center rounded-md border border-border bg-[color-mix(in_oklab,var(--color-electric-500)_12%,transparent)] text-electric-300">
                  <MessageSquare className="size-4.5" strokeWidth={1.6} />
                </span>
                <div className="flex flex-col gap-1.5">
                  <p className="font-display text-base font-medium">Still deciding?</p>
                  <p className="text-[0.8125rem] leading-relaxed text-muted">
                    Send us the messiest sketch you have. We will redraw it and send back
                    the result, no account needed.
                  </p>
                </div>
                <Button asChild variant="outline" size="md" magnetic={false} className="w-fit">
                  <Link href="/contact">Send us a sketch</Link>
                </Button>
              </GlassCard>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <Accordion type="single" collapsible className="w-full border-t border-border">
              {items.map((faq, index) => (
                <AccordionItem key={faq.question} value={`item-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

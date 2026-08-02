"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label, Textarea } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";
import { EASE } from "@/lib/motion";

const TOPICS = ["Sales", "Support", "Partnership", "Press", "Something else"] as const;

/**
 * Phase 1 form: fully validated and accessible, but not wired to a backend.
 * Submission is intercepted and shows the success state locally — swap the
 * handler for a real endpoint (or a server action) when the API exists.
 */
export function ContactForm() {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("Sales");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <GlassCard radius="xl" padding="lg" className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE.out }}
            className="flex flex-col items-center gap-5 py-14 text-center"
          >
            <span className="grid size-14 place-items-center rounded-full bg-[linear-gradient(120deg,var(--color-aqua-500),var(--color-electric-600))] text-white">
              <Check className="size-6" strokeWidth={2.5} />
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-heading font-semibold">Message received</h2>
              <p className="max-w-sm text-[0.9375rem] text-muted">
                We answer everything within one working day — usually sooner, and usually from
                the person who built the thing you are asking about.
              </p>
            </div>
            <Button variant="outline" size="md" magnetic={false} onClick={() => setSubmitted(false)}>
              Send another
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-6"
          >
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-medium">What is this about?</legend>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTopic(option)}
                    aria-pressed={topic === option}
                    className={`rounded-full border px-4 py-2 text-[0.8125rem] transition-all duration-300 ${
                      topic === option
                        ? "border-electric-400/50 bg-[color-mix(in_oklab,var(--color-electric-500)_16%,transparent)] text-foreground"
                        : "border-border text-muted hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <Label htmlFor="contact-name">Name</Label>
                <Input id="contact-name" name="name" required autoComplete="name" placeholder="Ada Lovelace" />
              </Field>
              <Field>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@studio.com"
                />
              </Field>
            </div>

            <Field>
              <Label htmlFor="contact-company" hint="Optional">
                Company
              </Label>
              <Input
                id="contact-company"
                name="company"
                autoComplete="organization"
                placeholder="Northwind Studio"
              />
            </Field>

            <Field>
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                name="message"
                required
                minLength={10}
                placeholder="Tell us what you are trying to build — or describe the sketch you want us to try."
              />
            </Field>

            {/* Topic travels with the form for whichever backend picks this up. */}
            <input type="hidden" name="topic" value={topic} />

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-subtle">
                We reply within one working day.
              </p>
              <Button type="submit" size="lg" magnetic={false}>
                <Send className="size-4" strokeWidth={2} />
                Send message
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

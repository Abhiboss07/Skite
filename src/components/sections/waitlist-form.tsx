"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EASE } from "@/lib/motion";

/**
 * Waitlist capture. Presentation-only in Phase 1 — swap the handler for the
 * mailing provider (or a server action) once the backend exists. Nothing is
 * transmitted anywhere today.
 */
export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJoined(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="wait">
        {joined ? (
          <motion.div
            key="joined"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE.out }}
            className="glass flex items-center justify-center gap-3 rounded-md px-5 py-4"
          >
            <span className="grid size-6 place-items-center rounded-full bg-[linear-gradient(120deg,var(--color-aqua-500),var(--color-electric-600))] text-white">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <p className="text-[0.9375rem]">
              You&apos;re on the list. We&apos;ll be in touch shortly.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="waitlist-email" className="sr-only">
              Email address
            </label>
            <Input
              id="waitlist-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="sm:flex-1"
            />
            <Button type="submit" size="md" magnetic={false}>
              Join waitlist
              <ArrowRight className="size-4" strokeWidth={2} />
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <p className="text-xs text-subtle">
        No newsletter unless you ask. One email when your invitation is ready.
      </p>
    </div>
  );
}

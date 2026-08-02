"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

import { LogoMark } from "@/components/brand/logo";
import {
  DiscordIcon,
  GithubIcon,
  LinkedinIcon,
  XIcon,
} from "@/components/brand/social-icons";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PulseBadge } from "@/components/ui/badge";
import { footerNav, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const SOCIALS = [
  { label: "X", href: siteConfig.links.x, icon: XIcon },
  { label: "GitHub", href: siteConfig.links.github, icon: GithubIcon },
  { label: "LinkedIn", href: siteConfig.links.linkedin, icon: LinkedinIcon },
  { label: "Discord", href: siteConfig.links.discord, icon: DiscordIcon },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border">
      <div className="grid-paper mask-fade-y pointer-events-none absolute inset-0 opacity-60" />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/2 left-1/2 h-[46rem] w-[80rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(46,107,255,0.18),transparent_62%)] blur-3xl"
      />

      <div className="container-skite relative">
        {/* Newsletter + brand */}
        <div className="grid gap-12 border-b border-border py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-20">
          <Reveal className="flex flex-col gap-5">
            <LogoMark className="h-9 w-9" />
            <h2 className="max-w-md text-heading">
              Bring the next sketch. We&apos;ll bring the reality.
            </h2>
            <p className="max-w-sm text-[0.9375rem] leading-relaxed text-muted">
              Product notes, research from the redraw engine, and the occasional
              teardown of a beautiful interface. Twice a month, never more.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="flex flex-col justify-center gap-4">
            <NewsletterForm />
            <p className="text-xs text-subtle">
              No spam. Unsubscribe in one click. Read our{" "}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                privacy policy
              </Link>
              .
            </p>
          </Reveal>
        </div>

        {/* Link columns */}
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-3 lg:grid-cols-5">
          {footerNav.map((group, index) => (
            <Reveal key={group.label} delay={index * 0.05} className="flex flex-col gap-4">
              <h3 className="font-mono text-[10px] tracking-[0.2em] text-subtle uppercase">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {group.items.map((item) => (
                  <li key={`${group.label}-${item.href}`}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group/f inline-flex items-center gap-1 text-[0.875rem] text-muted",
                        "transition-colors duration-300 hover:text-foreground",
                      )}
                    >
                      {item.label}
                      <ArrowUpRight
                        className="size-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover/f:translate-x-0 group-hover/f:opacity-100"
                        strokeWidth={2}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </nav>

        {/* Oversized wordmark — the sign-off */}
        <div className="relative select-none" aria-hidden>
          <p
            className={cn(
              "font-display leading-[0.78] font-semibold tracking-[-0.055em]",
              "text-[clamp(4rem,17vw,15rem)]",
              "bg-[linear-gradient(180deg,color-mix(in_oklab,var(--foreground)_16%,transparent),transparent_88%)]",
              "bg-clip-text text-transparent",
            )}
          >
            SKITE
          </p>
        </div>

        {/* Legal bar */}
        <div className="flex flex-col-reverse items-start justify-between gap-6 border-t border-border py-8 md:flex-row md:items-center">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <p className="text-xs text-subtle">
              © {new Date().getFullYear()} {siteConfig.company.legalName}. All rights reserved.
            </p>
            <Link href="/soon" className="w-fit">
              <PulseBadge tone="success" className="text-[11px]">
                All systems operational
              </PulseBadge>
            </Link>
          </div>

          <ul className="flex items-center gap-2">
            {SOCIALS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`SKITE on ${social.label}`}
                  className={cn(
                    "grid size-9 place-items-center rounded-md border border-border text-subtle",
                    "transition-all duration-300 hover:-translate-y-0.5 hover:border-electric-400/50 hover:text-foreground",
                  )}
                >
                  <social.icon className="size-4" strokeWidth={1.75} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "done">("idle");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        // Phase 1 is presentation-only; wire this to the mailing provider when
        // the backend lands.
        setStatus("done");
      }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <label htmlFor="footer-email" className="sr-only">
        Email address
      </label>
      <Input
        id="footer-email"
        type="email"
        required
        placeholder="you@studio.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="sm:flex-1"
      />
      <Button type="submit" size="md" magnetic={false} className="sm:w-auto">
        {status === "done" ? "You're in" : "Subscribe"}
      </Button>
    </form>
  );
}

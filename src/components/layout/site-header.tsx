"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { useCommandPalette } from "@/components/interactive/command-palette";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { EASE } from "@/lib/motion";
import { flatNav, primaryNav } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const { setOpen: setPaletteOpen } = useCommandPalette();
  const { scrollY } = useScroll();

  const [condensed, setCondensed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Condense past the fold; hide entirely when scrolling down at speed, so the
  // header never covers content the visitor is actively reading.
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setCondensed(latest > 24);
    setHidden(latest > 420 && latest > previous && latest - previous > 4 && !openGroup);
  });

  // Close every overlay on navigation. Reacting to the committed pathname is
  // the point — the menus must not survive a route change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  // Lock the page while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-[100]"
        animate={{ y: hidden ? "-110%" : "0%" }}
        transition={{ duration: 0.45, ease: EASE.out }}
        onMouseLeave={() => setOpenGroup(null)}
      >
        <div className="container-skite">
          <div
            className={cn(
              "mt-3 flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 lg:px-4",
              "transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500",
              condensed
                ? "glass glass-sheen border-border shadow-card"
                : "border border-transparent bg-transparent",
            )}
          >
            <Link
              href="/"
              className="shrink-0 rounded-sm transition-opacity hover:opacity-80"
              aria-label="SKITE home"
            >
              <Logo />
            </Link>

            {/* Desktop navigation */}
            <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
              {primaryNav.map((group) => (
                <div key={group.label} onMouseEnter={() => setOpenGroup(group.label)}>
                  <button
                    type="button"
                    aria-expanded={openGroup === group.label}
                    onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                    className={cn(
                      "relative rounded-sm px-3.5 py-2 text-sm font-medium transition-colors duration-300",
                      openGroup === group.label ||
                        group.items.some((item) => isActive(item.href))
                        ? "text-foreground"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {group.label}
                  </button>
                </div>
              ))}

              {flatNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setOpenGroup(null)}
                  className={cn(
                    "rounded-sm px-3.5 py-2 text-sm font-medium transition-colors duration-300",
                    isActive(item.href) ? "text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              {/* No aria-label here on purpose: an explicit label of
                  "Search — press Command K" did not contain the visible "⌘K",
                  which trips WCAG 2.5.3 (label in name). The visible word
                  "Search" is the accessible name, and the shortcut hint is
                  decorative, so it is hidden from assistive tech. */}
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className={cn(
                  "hidden items-center gap-2.5 rounded-md border border-border py-2 pr-2 pl-3",
                  "text-sm text-subtle transition-colors duration-300",
                  "hover:border-border-strong hover:text-foreground md:flex",
                )}
              >
                <Search className="size-3.5" strokeWidth={1.75} aria-hidden />
                <span className="pr-6">Search</span>
                <kbd
                  aria-hidden
                  className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]"
                >
                  ⌘K
                </kbd>
              </button>

              <ThemeToggle className="hidden sm:grid" />

              <Button asChild size="sm" className="hidden sm:inline-flex" magnetic={false}>
                <Link href="/soon">
                  Start free
                  <ArrowUpRight className="size-3.5" strokeWidth={2} />
                </Link>
              </Button>

              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="grid size-10 place-items-center rounded-md border border-border text-foreground lg:hidden"
              >
                <Menu className="size-4.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop mega menu */}
        <AnimatePresence>
          {openGroup ? (
            <motion.div
              key={openGroup}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.26, ease: EASE.out }}
              className="container-skite hidden lg:block"
            >
              <div className="glass glass-sheen mt-2 rounded-lg border-border p-2.5 shadow-lift">
                <ul className="grid grid-cols-2 gap-1">
                  {primaryNav
                    .find((group) => group.label === openGroup)
                    ?.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "group/link flex flex-col gap-1 rounded-md p-4 transition-colors duration-300",
                            "hover:bg-[color-mix(in_oklab,var(--color-electric-500)_10%,transparent)]",
                          )}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            {item.label}
                            <ArrowUpRight
                              className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover/link:translate-x-0 group-hover/link:opacity-100"
                              strokeWidth={2}
                            />
                          </span>
                          {item.description ? (
                            <span className="text-[0.8125rem] leading-snug text-subtle">
                              {item.description}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} isActive={isActive} />
    </>
  );
}

function MobileMenu({
  open,
  onClose,
  isActive,
}: {
  open: boolean;
  onClose: () => void;
  isActive: (href: string) => boolean;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[110] flex flex-col bg-background lg:hidden"
        >
          <div className="grid-paper mask-radial-fade absolute inset-0 opacity-60" />

          <div className="relative flex items-center justify-between px-6 py-5">
            <Logo />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="grid size-10 place-items-center rounded-md border border-border"
            >
              <X className="size-4.5" strokeWidth={1.75} />
            </button>
          </div>

          <nav
            aria-label="Mobile"
            className="relative flex-1 overflow-y-auto overscroll-contain px-6 pb-10"
          >
            {primaryNav.map((group, groupIndex) => (
              <motion.div
                key={group.label}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + groupIndex * 0.06, duration: 0.5, ease: EASE.out }}
                className="border-b border-border py-6"
              >
                <p className="mb-3 font-mono text-[10px] tracking-[0.2em] text-subtle uppercase">
                  {group.label}
                </p>
                <ul className="flex flex-col">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center justify-between py-2.5 font-display text-xl font-medium tracking-[-0.02em]",
                          isActive(item.href) ? "text-electric-300" : "text-foreground",
                        )}
                      >
                        {item.label}
                        <ArrowUpRight className="size-4 text-subtle" strokeWidth={1.75} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.5, ease: EASE.out }}
              className="mt-8 flex flex-col gap-3"
            >
              <Button asChild size="lg" magnetic={false}>
                <Link href="/soon" onClick={onClose}>
                  Start free
                  <ArrowUpRight className="size-4" strokeWidth={2} />
                </Link>
              </Button>
              <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                <span className="text-sm text-muted">Appearance</span>
                <ThemeToggle />
              </div>
            </motion.div>
          </nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

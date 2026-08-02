"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { ArrowUpRight, Laptop, Moon, Search, Sparkles, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useMemo } from "react";

import { GithubIcon } from "@/components/brand/social-icons";
import { EASE } from "@/lib/motion";
import { allRoutes, siteConfig } from "@/lib/site";

const GROUP_ORDER = ["Pages", "Product", "Work", "Developers", "Company", "Legal"];

const HEADING_CLASS =
  "mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-subtle [&_[cmdk-group-heading]]:uppercase";

/**
 * The palette body. Split from the provider so cmdk and Radix Dialog are
 * code-split behind next/dynamic — they are dead weight for the large majority
 * of visitors who never press ⌘K.
 */
export default function CommandPaletteDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();

  const run = useCallback(
    (action: () => void) => {
      setOpen(false);
      // Let the close animation start before navigating, otherwise the exit
      // transition is cut off by the route change.
      setTimeout(action, 90);
    },
    [setOpen],
  );

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        items: allRoutes.filter((route) => route.group === group),
      })).filter((entry) => entry.items.length > 0),
    [],
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[150] bg-abyss-950/70 backdrop-blur-md"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: -12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -8 }}
                transition={{ duration: 0.28, ease: EASE.out }}
                className="fixed top-[14vh] left-1/2 z-[151] w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2"
              >
                <Dialog.Title className="sr-only">Search SKITE</Dialog.Title>

                <Command
                  loop
                  className="glass glass-sheen overflow-hidden rounded-xl border border-border-strong shadow-lift"
                >
                  <div className="flex items-center gap-3 border-b border-border px-5">
                    <Search className="size-4 shrink-0 text-subtle" strokeWidth={1.75} />
                    <Command.Input
                      autoFocus
                      placeholder="Search pages, docs and actions…"
                      className="h-14 flex-1 bg-transparent text-[0.9375rem] text-foreground outline-none placeholder:text-subtle"
                    />
                    <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-subtle sm:block">
                      ESC
                    </kbd>
                  </div>

                  <Command.List className="max-h-[min(24rem,50vh)] overflow-y-auto overscroll-contain p-2">
                    <Command.Empty className="px-4 py-10 text-center text-sm text-subtle">
                      Nothing matched. Try “pricing”, “API” or “careers”.
                    </Command.Empty>

                    {grouped.map(({ group, items }) => (
                      <Command.Group key={group} heading={group} className={HEADING_CLASS}>
                        {items.map((route) => (
                          <CommandRow
                            key={route.href}
                            value={`${route.label} ${route.keywords ?? ""}`}
                            onSelect={() => run(() => router.push(route.href))}
                          >
                            <span>{route.label}</span>
                            <span className="ml-auto font-mono text-[11px] text-subtle">
                              {route.href}
                            </span>
                          </CommandRow>
                        ))}
                      </Command.Group>
                    ))}

                    <Command.Group heading="Actions" className={HEADING_CLASS}>
                      <CommandRow
                        value="start redraw upload sketch get started"
                        onSelect={() => run(() => router.push("/soon"))}
                      >
                        <Sparkles className="size-4 text-electric-400" strokeWidth={1.75} />
                        Start a redraw
                      </CommandRow>
                      <CommandRow value="theme dark night" onSelect={() => run(() => setTheme("dark"))}>
                        <Moon className="size-4 text-subtle" strokeWidth={1.75} />
                        Dark theme
                      </CommandRow>
                      <CommandRow value="theme light day" onSelect={() => run(() => setTheme("light"))}>
                        <Sun className="size-4 text-subtle" strokeWidth={1.75} />
                        Light theme
                      </CommandRow>
                      <CommandRow value="theme system auto" onSelect={() => run(() => setTheme("system"))}>
                        <Laptop className="size-4 text-subtle" strokeWidth={1.75} />
                        Match system theme
                      </CommandRow>
                      <CommandRow
                        value="github source repository"
                        onSelect={() => run(() => window.open(siteConfig.links.github, "_blank"))}
                      >
                        <GithubIcon className="size-4 text-subtle" />
                        Open GitHub
                        <ArrowUpRight className="ml-auto size-3.5 text-subtle" strokeWidth={1.75} />
                      </CommandRow>
                    </Command.Group>
                  </Command.List>
                </Command>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function CommandRow({
  children,
  value,
  onSelect,
}: {
  children: React.ReactNode;
  value: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-muted transition-colors data-[selected=true]:bg-[color-mix(in_oklab,var(--color-electric-500)_14%,transparent)] data-[selected=true]:text-foreground"
    >
      {children}
    </Command.Item>
  );
}

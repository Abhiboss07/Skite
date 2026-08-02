import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { Aurora } from "@/components/backdrop/aurora";
import { LineRise, Rise } from "@/components/motion/rise";
import { Eyebrow } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href: string };

/**
 * Shared header for every non-home page.
 *
 * Using one component for all 18 pages is what keeps the site feeling like a
 * single product: identical rhythm, identical entrance, identical backdrop
 * weight. Pages differ in content, never in chrome.
 *
 * A server component: every entrance here is CSS, so the headline and lead are
 * present and painting in the server HTML. These are the LCP elements on most
 * routes, and animating them with JS delayed them until after hydration.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs,
  children,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  crumbs?: Crumb[];
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border pt-36 pb-16 lg:pt-44 lg:pb-24",
        className,
      )}
    >
      <div className="grid-paper mask-radial-fade absolute inset-0" />
      <Aurora intensity={0.55} />

      <div className="container-skite relative">
        <div
          className={cn(
            "flex flex-col gap-6",
            align === "center" && "mx-auto max-w-3xl items-center text-center",
          )}
        >
          {crumbs?.length ? (
            <Rise>
              <nav aria-label="Breadcrumb">
                <ol className="flex flex-wrap items-center gap-1 text-[0.8125rem] text-subtle">
                  <li>
                    <Link href="/" className="transition-colors hover:text-foreground">
                      Home
                    </Link>
                  </li>
                  {crumbs.map((crumb, index) => (
                    <li key={crumb.href} className="flex items-center gap-1">
                      <ChevronRight className="size-3.5 opacity-50" strokeWidth={2} />
                      {index === crumbs.length - 1 ? (
                        <span aria-current="page" className="text-foreground">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link href={crumb.href} className="transition-colors hover:text-foreground">
                          {crumb.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </Rise>
          ) : null}

          {eyebrow ? (
            <Rise delay={40}>
              <Eyebrow align={align}>{eyebrow}</Eyebrow>
            </Rise>
          ) : null}

          <h1 className={cn("text-display", align === "center" && "text-balance")}>
            <LineRise delay={90}>{title}</LineRise>
          </h1>

          {lead ? (
            <Rise delay={170}>
              <p className={cn("text-lead text-muted", align === "left" && "max-w-2xl")}>{lead}</p>
            </Rise>
          ) : null}

          {children ? <Rise delay={240}>{children}</Rise> : null}
        </div>
      </div>
    </section>
  );
}

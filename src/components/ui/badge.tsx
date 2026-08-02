import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)] text-muted",
        accent:
          "border-electric-400/30 bg-[color-mix(in_oklab,var(--color-electric-500)_14%,transparent)] text-electric-300",
        aqua: "border-aqua-400/30 bg-[color-mix(in_oklab,var(--color-aqua-400)_14%,transparent)] text-aqua-300",
        violet:
          "border-violet-400/30 bg-[color-mix(in_oklab,var(--color-violet-500)_16%,transparent)] text-violet-300",
        success:
          "border-success-400/30 bg-[color-mix(in_oklab,var(--color-success-500)_14%,transparent)] text-success-400",
        warning:
          "border-warning-400/30 bg-[color-mix(in_oklab,var(--color-warning-500)_14%,transparent)] text-warning-400",
        outline: "border-border-strong text-foreground",
      },
      size: {
        sm: "px-2.5 py-0.5 text-[0.6875rem]",
        md: "px-3 py-1 text-xs",
        lg: "px-3.5 py-1.5 text-[0.8125rem]",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

/**
 * Small status pill with a live pulsing dot. Used for "in beta", "hiring",
 * "operational" style signals where the motion carries the meaning.
 */
export function PulseBadge({
  children,
  className,
  tone = "accent",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "accent" | "success" | "warning";
}) {
  const dot = {
    accent: "bg-electric-400",
    success: "bg-success-400",
    warning: "bg-warning-400",
  }[tone];

  return (
    <Badge variant={tone === "accent" ? "accent" : tone} className={cn("pl-2.5", className)}>
      <span className="relative flex h-1.5 w-1.5">
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-70", dot)} />
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dot)} />
      </span>
      {children}
    </Badge>
  );
}

export { badgeVariants };

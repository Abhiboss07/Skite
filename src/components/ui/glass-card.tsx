import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva("relative overflow-hidden transition-colors duration-500", {
  variants: {
    variant: {
      /** Default frosted pane. */
      glass: "glass glass-sheen",
      /** Opaque panel for dense content where blur would hurt legibility. */
      solid: "border border-border bg-surface shadow-card",
      /** Barely-there container for grouping without adding visual weight. */
      subtle: "border border-border bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)]",
      /** Gradient-edged card reserved for the single most important item. */
      accent: cn(
        "glass glass-sheen",
        "before:!bg-[linear-gradient(140deg,rgba(34,211,238,0.55),rgba(77,124,255,0.35)_40%,rgba(139,92,246,0.5))]",
      ),
    },
    radius: {
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
    },
    padding: {
      none: "",
      sm: "p-5",
      md: "p-7",
      lg: "p-9",
    },
  },
  defaultVariants: { variant: "glass", radius: "lg", padding: "md" },
});

export type GlassCardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

export function GlassCard({ className, variant, radius, padding, ...props }: GlassCardProps) {
  return <div className={cn(cardVariants({ variant, radius, padding }), className)} {...props} />;
}

export { cardVariants };

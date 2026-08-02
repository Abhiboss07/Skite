"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { Magnetic } from "@/components/motion/magnetic";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden",
    "font-medium whitespace-nowrap select-none",
    "transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
    "active:scale-[0.975] disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
  ),
  {
    variants: {
      variant: {
        /** The one true call to action. Gradient fill, lit from within. */
        primary: cn(
          "text-white",
          "bg-[linear-gradient(100deg,var(--color-aqua-500),var(--color-electric-600)_48%,var(--color-violet-600))]",
          "shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_8px_28px_-8px_rgba(46,107,255,0.65)]",
          "hover:shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_16px_44px_-10px_rgba(46,107,255,0.85)]",
          "hover:-translate-y-0.5",
        ),
        /** Frosted secondary action that sits on top of imagery. */
        glass: cn(
          "glass glass-sheen text-foreground",
          "hover:-translate-y-0.5 hover:border-border-strong",
          "hover:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)]",
        ),
        outline: cn(
          "border border-border-strong text-foreground",
          "hover:-translate-y-0.5 hover:border-electric-400/60",
          "hover:bg-[color-mix(in_oklab,var(--color-electric-500)_10%,transparent)]",
        ),
        ghost: "text-muted hover:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] hover:text-foreground",
        /** Inverted solid — used sparingly, on gradient-heavy backgrounds. */
        solid: "bg-foreground text-background hover:-translate-y-0.5 hover:opacity-90",
        link: "h-auto p-0 text-foreground underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 rounded-sm px-4 text-[0.8125rem]",
        md: "h-11 rounded-md px-5 text-sm",
        lg: "h-13 rounded-md px-7 text-[0.9375rem]",
        xl: "h-15 rounded-lg px-9 text-base",
        icon: "h-10 w-10 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Lean toward the cursor on approach. On by default for primary CTAs. */
    magnetic?: boolean;
    /** Light sweep across the surface on hover. */
    shimmer?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, magnetic, shimmer = true, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const isPrimary = variant === "primary" || variant == null;
  const useMagnetic = magnetic ?? isPrimary;
  const sweep = shimmer && variant !== "link" && variant !== "ghost";

  const button = (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), sweep && "btn-sweep", className)}
      {...props}
    >
      {children}
    </Comp>
  );

  if (!useMagnetic) return button;

  return <Magnetic strength={0.28} radius={64}>{button}</Magnetic>;
});

export { buttonVariants };

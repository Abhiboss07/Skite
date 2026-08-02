"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = forwardRef<
  ElementRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...props }, ref) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn(
        "group/item relative border-b border-border transition-colors",
        "data-[state=open]:border-electric-400/25",
        className,
      )}
      {...props}
    />
  );
});

const AccordionTrigger = forwardRef<
  ElementRef<typeof AccordionPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          "group/trigger flex flex-1 items-start justify-between gap-6 py-6 text-left",
          "font-display text-[1.0625rem] font-medium tracking-[-0.015em] md:text-lg",
          "transition-colors duration-300 hover:text-electric-300",
          "data-[state=open]:text-foreground",
          className,
        )}
        {...props}
      >
        <span className="pt-0.5">{children}</span>
        <span
          aria-hidden
          className={cn(
            "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-border",
            "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "group-hover/trigger:border-electric-400/50",
            "group-data-[state=open]/item:rotate-135 group-data-[state=open]/item:border-electric-400/60",
            "group-data-[state=open]/item:bg-[color-mix(in_oklab,var(--color-electric-500)_16%,transparent)]",
          )}
        >
          <Plus className="size-4" strokeWidth={1.75} />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});

const AccordionContent = forwardRef<
  ElementRef<typeof AccordionPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      className={cn(
        "overflow-hidden",
        // Radix measures the panel and exposes it as a CSS var; animating to it
        // gives a real height transition without any JS measurement of our own.
        "data-[state=closed]:animate-[acc-up_0.4s_cubic-bezier(0.87,0,0.13,1)]",
        "data-[state=open]:animate-[acc-down_0.4s_cubic-bezier(0.16,1,0.3,1)]",
      )}
      {...props}
    >
      <div className={cn("max-w-2xl pr-12 pb-7 text-[0.9375rem] leading-relaxed text-muted", className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
});

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };

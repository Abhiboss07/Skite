"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";
import { createContext, forwardRef, useContext, useId, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Tabs with a shared, animated active indicator.
 *
 * The indicator is a single motion element with a `layoutId`, so it physically
 * travels between tabs instead of cross-fading — that continuity is what makes
 * the control feel engineered rather than assembled.
 */
const LayoutGroupContext = createContext<string>("tabs");

function Tabs({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  const id = useId();
  return (
    <LayoutGroupContext.Provider value={id}>
      <TabsPrimitive.Root className={cn("flex flex-col gap-7", className)} {...props} />
    </LayoutGroupContext.Provider>
  );
}

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "glass inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full p-1.5",
        className,
      )}
      {...props}
    />
  );
});

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, children, ...props }, ref) {
  const layoutId = useContext(LayoutGroupContext);

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "group/tab relative shrink-0 rounded-full px-4 py-2 text-[0.8125rem] font-medium whitespace-nowrap",
        "text-muted transition-colors duration-300 hover:text-foreground",
        "data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 hidden group-data-[state=active]/tab:block">
        <motion.span
          layoutId={`tab-indicator-${layoutId}`}
          className={cn(
            "absolute inset-0 rounded-full border border-electric-400/30",
            "bg-[color-mix(in_oklab,var(--color-electric-500)_16%,transparent)]",
            "shadow-[0_4px_18px_-6px_rgba(46,107,255,0.6)]",
          )}
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
        />
      </span>
    </TabsPrimitive.Trigger>
  );
});

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "focus-visible:outline-none",
        "data-[state=active]:animate-[fade-up_0.5s_cubic-bezier(0.16,1,0.3,1)]",
        className,
      )}
      {...props}
    />
  );
});

export { Tabs, TabsList, TabsTrigger, TabsContent };

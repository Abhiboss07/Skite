import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const fieldStyles = cn(
  "w-full rounded-md border border-border bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)]",
  "px-4 text-[0.9375rem] text-foreground placeholder:text-subtle",
  "transition-[border-color,box-shadow,background-color] duration-300",
  "hover:border-border-strong",
  "focus:border-electric-400/60 focus:bg-[color-mix(in_oklab,var(--color-electric-500)_6%,transparent)]",
  "focus:outline-none focus:ring-4 focus:ring-electric-500/12",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldStyles, "h-12", className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea ref={ref} className={cn(fieldStyles, "min-h-32 resize-y py-3.5", className)} {...props} />
    );
  },
);

export function Label({
  className,
  children,
  htmlFor,
  hint,
}: {
  className?: string;
  children: React.ReactNode;
  htmlFor: string;
  hint?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("flex items-baseline justify-between gap-3 text-sm font-medium", className)}
    >
      <span>{children}</span>
      {hint ? <span className="text-xs font-normal text-subtle">{hint}</span> : null}
    </label>
  );
}

export function Field({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

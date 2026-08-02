"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Static code sample with copy-to-clipboard.
 *
 * Deliberately unhighlighted: shipping a syntax highlighter for a handful of
 * marketing snippets costs more bundle than the snippets are worth. Structure
 * is carried by the label bar and monospaced rhythm instead.
 */
export function CodeBlock({
  code,
  language = "bash",
  filename,
  className,
}: {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked by permissions; failing silently is correct
      // here — the code is still visible and selectable.
    }
  };

  return (
    <div
      className={cn(
        "group/code glass overflow-hidden rounded-lg border-border",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5">
        <span className="font-mono text-[11px] text-subtle">{filename ?? language}</span>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xs px-2 py-1 font-mono text-[10px] tracking-wide uppercase",
            "text-subtle transition-colors duration-300 hover:text-foreground",
          )}
        >
          {copied ? (
            <>
              <Check className="size-3" strokeWidth={2.5} />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3" strokeWidth={2} />
              Copy
            </>
          )}
        </button>
      </div>

      <pre className="overflow-x-auto px-4 py-4 text-[0.8125rem] leading-relaxed">
        <code className="font-mono text-foreground/85">{code}</code>
      </pre>
    </div>
  );
}

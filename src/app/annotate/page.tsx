import { Annotator } from "@/components/annotate/annotator";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Annotate",
  description:
    "Label your own sketches to build the SKITE benchmark: draw regions, assign roles, and export ground truth the evaluation harness can read.",
  path: "/annotate",
});

export default function AnnotatePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10 md:py-24">
      <header className="mb-10 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Phase 2B · benchmark</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Annotate
        </h1>
        <p className="mt-4 text-pretty text-foreground-subtle">
          Ground truth for the real-world benchmark. Draw a region, give it a role, and the nesting
          is derived for you — by the same containment rule the pipeline uses, so the labels and the
          thing being measured agree on what nesting means.
        </p>
      </header>

      <Annotator />
    </main>
  );
}

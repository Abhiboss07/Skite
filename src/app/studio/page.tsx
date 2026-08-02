import { Studio } from "@/components/studio/studio";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Studio",
  description:
    "Upload a wireframe and inspect every stage of the SKITE pipeline — preprocessing, detection, layout inference, the IR, the prompt, the generated component and a live preview.",
  path: "/studio",
  keywords: ["sketch to code", "wireframe to website", "pipeline inspector"],
});

export default function StudioPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10 md:py-24">
      <header className="mb-10 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">MVP · vertical slice</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Studio
        </h1>
        <p className="mt-4 text-pretty text-foreground-subtle">
          Upload a homepage wireframe and watch it become a working component. Every intermediate the
          pipeline produces is shown, in order, so a wrong result can be traced to the stage that
          caused it rather than guessed at.
        </p>
      </header>

      <Studio />
    </main>
  );
}

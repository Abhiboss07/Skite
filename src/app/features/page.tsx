import { Cta } from "@/components/sections/cta";
import { Features } from "@/components/sections/features";
import { LiveDemo } from "@/components/sections/live-demo";
import { PageHero } from "@/components/layout/page-hero";
import { Accent } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Features",
  description:
    "Layout fidelity, any input format, production-grade output, photoreal render mode, design-system binding and plain-language iteration — everything inside the SKITE redraw engine.",
  path: "/features",
  keywords: ["sketch to code features", "wireframe converter capabilities"],
});

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        crumbs={[{ label: "Features", href: "/features" }]}
        title={
          <>
            Everything inside the <Accent>redraw engine</Accent>.
          </>
        }
        lead="SKITE is not a prompt with a nice interface. It is a five-pass pipeline built around one stubborn commitment: the layout you drew is the layout you get."
      />

      <Features />
      <LiveDemo />
      <Cta />
    </>
  );
}

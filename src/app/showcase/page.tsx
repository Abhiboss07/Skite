import { Cta } from "@/components/sections/cta";
import { Showcase } from "@/components/sections/showcase";
import { PageHero } from "@/components/layout/page-hero";
import { Accent } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Showcase",
  description:
    "Real sketches, real shipped sites. Fintech dashboards, editorial magazines, logistics tools and studio portfolios — every one of them started as something drawn by hand.",
  path: "/showcase",
  keywords: ["sketch to website examples", "AI generated website gallery"],
});

export default function ShowcasePage() {
  return (
    <>
      <PageHero
        eyebrow="Showcase"
        crumbs={[{ label: "Showcase", href: "/showcase" }]}
        title={
          <>
            Every one of these began as <Accent>a drawing</Accent>.
          </>
        }
        lead="Hover any tile to see the sketch it came from. No cherry-picking — these are ordinary inputs from ordinary meetings."
      />

      <Showcase />
      <Cta />
    </>
  );
}

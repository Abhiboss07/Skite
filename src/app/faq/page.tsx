import { Cta } from "@/components/sections/cta";
import { Faq } from "@/components/sections/faq";
import { PageHero } from "@/components/layout/page-hero";
import { Accent } from "@/components/ui/section-heading";
import { createMetadata, faqJsonLd } from "@/lib/metadata";
import { faqs } from "@/lib/content";

export const metadata = createMetadata({
  title: "FAQ",
  description:
    "Answers about layout fidelity, accepted input formats, what SKITE returns, design-system binding, data privacy, iteration and API access.",
  path: "/faq",
  keywords: ["SKITE FAQ", "sketch to code questions"],
});

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />

      <PageHero
        eyebrow="FAQ"
        crumbs={[{ label: "FAQ", href: "/faq" }]}
        title={
          <>
            The things people ask <Accent>before they trust it</Accent>.
          </>
        }
        lead="Every question we get more than twice ends up here. If yours is not, tell us and it will be."
      />

      <Faq />
      <Cta />
    </>
  );
}

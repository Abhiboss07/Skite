import { Cta } from "@/components/sections/cta";
import { Faq } from "@/components/sections/faq";
import { Features } from "@/components/sections/features";
import { Hero } from "@/components/sections/hero";
import { LiveDemo } from "@/components/sections/live-demo";
import { Pricing } from "@/components/sections/pricing";
import { Problem } from "@/components/sections/problem";
import { Showcase } from "@/components/sections/showcase";
import { Technology } from "@/components/sections/technology";
import { Testimonials } from "@/components/sections/testimonials";
import { TrustedBy } from "@/components/sections/trusted-by";
import { faqJsonLd } from "@/lib/metadata";
import { faqs } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs.slice(0, 6))) }}
      />

      <Hero />
      <TrustedBy />
      <Problem />
      <Features />
      <LiveDemo />
      <Technology />
      <Showcase limit={6} />
      <Testimonials />
      <Pricing />
      <Faq limit={6} />
      <Cta />
    </>
  );
}

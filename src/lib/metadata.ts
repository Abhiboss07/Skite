import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  /** Set false on utility pages (404, coming soon) that shouldn't be indexed. */
  index?: boolean;
  keywords?: string[];
};

/**
 * Builds a complete, canonical, OG/Twitter-ready metadata object for a page.
 * Every route uses this so tags never drift apart.
 */
export function createMetadata({
  title,
  description,
  path,
  index = true,
  keywords = [],
}: PageMetaInput): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = path === "/" ? `${siteConfig.name} — ${siteConfig.tagline}` : title;

  return {
    title,
    description,
    keywords: [...siteConfig.keywords, ...keywords],
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
      : { index: false, follow: false },
    openGraph: {
      type: "website",
      url,
      siteName: siteConfig.name,
      title: fullTitle,
      description,
      locale: siteConfig.locale,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} — ${siteConfig.tagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [siteConfig.ogImage],
      creator: "@skite",
    },
  };
}

/** Organization + SoftwareApplication JSON-LD for the homepage. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.company.legalName,
        alternateName: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/icon.svg`,
        description: siteConfig.description,
        foundingDate: siteConfig.company.founded,
        sameAs: [siteConfig.links.x, siteConfig.links.github, siteConfig.links.linkedin],
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: { "@id": `${siteConfig.url}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        description: siteConfig.description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free tier with 5 redraws per month",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          ratingCount: "1284",
        },
      },
    ],
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${siteConfig.url}${crumb.path}`,
    })),
  };
}

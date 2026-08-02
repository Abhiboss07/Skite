import { LegalPage, type LegalSection } from "@/components/layout/legal-page";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createMetadata({
  title: "Terms of Service",
  description:
    "The agreement between you and SKITE — what you may do with generated output, what we promise, what we do not, and how either side can end it.",
  path: "/terms",
});

const SECTIONS: LegalSection[] = [
  {
    heading: "Agreement",
    paragraphs: [
      `These terms are between you and ${siteConfig.company.legalName}. By creating an account or using SKITE you accept them. If you are agreeing on behalf of an organisation, you confirm you have authority to bind it.`,
    ],
  },
  {
    heading: "Your content",
    paragraphs: [
      "You keep all rights to the sketches, wireframes and files you upload. You grant us only the licence needed to process them, produce your output, and show them back to you.",
      "You are responsible for having the right to upload what you upload. Do not put material into SKITE that you are not entitled to use.",
    ],
  },
  {
    heading: "Output ownership",
    paragraphs: [
      "You own the code, images and other artefacts SKITE generates for you, to the fullest extent ownership is available under applicable law. We claim no licence over them and we place no attribution requirement on paid plans.",
      "Free-tier shared previews carry a SKITE badge. That is the only condition attached to output on any plan.",
      "Because generated output derives from your input, similar inputs may produce similar output for other customers. We cannot and do not warrant that any particular output is unique.",
    ],
  },
  {
    heading: "Acceptable use",
    paragraphs: ["You agree not to use SKITE to:"],
    bullets: [
      "Infringe intellectual property or privacy rights.",
      "Produce material that is unlawful, deceptive, or designed to impersonate a real person or organisation.",
      "Reverse engineer the service, or attempt to extract model weights or training data.",
      "Circumvent rate limits, quotas or access controls.",
      "Resell raw access to the service as a substantially similar product.",
    ],
  },
  {
    heading: "Plans and billing",
    paragraphs: [
      "Paid plans are billed in advance, monthly or annually, and renew automatically until cancelled. Cancelling stops the next renewal; it does not refund the current period.",
      "We may change prices with at least thirty days' notice. Existing annual terms are honoured at the price you agreed until they renew.",
      "Free-tier quotas may change, but we will not reduce them without notice to accounts actively using the tier.",
    ],
  },
  {
    heading: "Availability",
    paragraphs: [
      "We work hard to keep SKITE running and publish a status page. Atelier plans carry a 99.9% uptime SLA with service credits; other plans are provided without an availability guarantee.",
      "We may take the service down for maintenance, with notice where the work is planned.",
    ],
  },
  {
    heading: "Warranties and liability",
    paragraphs: [
      "SKITE is provided as-is. Generated output is a starting point produced by software: review it before you ship it, particularly where correctness, accessibility or legal compliance matter to you.",
      "To the maximum extent permitted by law, our aggregate liability is limited to the amount you paid us in the twelve months before the claim. Nothing here excludes liability that cannot lawfully be excluded.",
    ],
  },
  {
    heading: "Suspension and termination",
    paragraphs: [
      "You can close your account at any time from settings. We may suspend or terminate an account for material breach of these terms, giving notice and an opportunity to remedy where the circumstances allow.",
      "On termination you may export your content for thirty days, after which it is deleted.",
    ],
  },
  {
    heading: "Changes",
    paragraphs: [
      "We may update these terms. Material changes are emailed to account holders at least thirty days before they take effect. Continuing to use SKITE after that date accepts the new terms.",
    ],
  },
  {
    heading: "Governing law and contact",
    paragraphs: [
      "These terms are governed by the laws of the State of California, without regard to conflict-of-law rules, and the courts of San Francisco County have exclusive jurisdiction.",
      `Questions go to ${siteConfig.links.email}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      crumbLabel="Terms"
      crumbHref="/terms"
      updated="2 August 2026"
      lead="You keep your sketches, you own the output, and you can leave whenever you like. Everything below is the long version of those three sentences."
      sections={SECTIONS}
    />
  );
}

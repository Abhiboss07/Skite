import { LegalPage, type LegalSection } from "@/components/layout/legal-page";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createMetadata({
  title: "Privacy Policy",
  description:
    "How SKITE handles your sketches, generated output and account data — including our commitment that customer content is never used for model training.",
  path: "/privacy",
});

const SECTIONS: LegalSection[] = [
  {
    heading: "What we collect",
    paragraphs: [
      "We collect the minimum needed to run the service and to bill you correctly. There is no advertising business here, so there is no incentive to gather anything else.",
    ],
    bullets: [
      "Account data: name, email address, and organisation if you provide one.",
      "Content you upload: sketches, wireframes, photographs and linked design files.",
      "Generated artefacts: the constraint graphs, code and images we produce for you.",
      "Usage telemetry: redraw counts, latency and error rates, tied to your account.",
      "Billing data, held by our payment processor. We never see full card numbers.",
    ],
  },
  {
    heading: "How we use it",
    paragraphs: [
      "Your content is processed to produce the output you asked for, and to show you your own history. Telemetry is used to keep the service fast and to find bugs.",
      "We do not sell personal data. We do not share it with advertisers. We do not build profiles of you.",
    ],
  },
  {
    heading: "Model training",
    paragraphs: [
      "Customer content is never used to train, fine-tune or evaluate our models. This applies to every plan, including the free tier, and it is not something you have to opt out of.",
      "Our evaluation sets are built from material we created or licensed for that purpose, with the rights to use it that way.",
    ],
  },
  {
    heading: "Retention and deletion",
    paragraphs: [
      "Uploads and generated artefacts are retained while the project exists so you can return to your history. Deleting a project removes its content and derived artefacts from primary storage immediately and from backups within thirty days.",
      "Closing your account deletes everything associated with it on the same schedule. We keep only what tax and accounting law requires us to keep.",
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "Content is encrypted in transit with TLS and at rest with AES-256. Access to production systems requires hardware-backed multi-factor authentication and is logged.",
      "Staff access to customer content is restricted to named engineers, requires a documented reason, and is auditable. We will tell you if your content was accessed for a support issue.",
    ],
  },
  {
    heading: "Sub-processors",
    paragraphs: [
      "We use a small number of infrastructure providers for hosting, storage, payments and email delivery. The current list, with the data each receives, is available on request and we give thirty days' notice before adding a new one.",
    ],
  },
  {
    heading: "Your rights",
    paragraphs: [
      "Depending on where you live you may have rights to access, correct, export or delete your personal data, and to object to certain processing. You can exercise most of these directly in settings.",
      `For anything else, write to ${siteConfig.links.email} and we will respond within thirty days.`,
    ],
  },
  {
    heading: "International transfers",
    paragraphs: [
      "Our infrastructure is primarily in the United States and the European Union. Where personal data moves between jurisdictions we rely on standard contractual clauses or an equivalent lawful mechanism.",
    ],
  },
  {
    heading: "Children",
    paragraphs: [
      "SKITE is not directed at children under 16 and we do not knowingly collect their personal data. If you believe a child has created an account, contact us and we will remove it.",
    ],
  },
  {
    heading: "Changes and contact",
    paragraphs: [
      "If we change this policy materially we will email account holders before it takes effect, not after.",
      `Questions go to ${siteConfig.links.email}, or by post to ${siteConfig.company.legalName}, ${siteConfig.company.location}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      crumbLabel="Privacy"
      crumbHref="/privacy"
      updated="2 August 2026"
      lead="We collect the minimum required to run SKITE, we never train on your content, and you can delete everything permanently at any time."
      sections={SECTIONS}
    />
  );
}

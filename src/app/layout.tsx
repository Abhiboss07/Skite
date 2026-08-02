import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";

import { GrainOverlay } from "@/components/interactive/grain-overlay";
import { CommandPaletteProvider } from "@/components/interactive/command-palette";
import { CursorMount } from "@/components/interactive/cursor-mount";
import { Preloader } from "@/components/interactive/preloader";
import { ScrollProgress } from "@/components/interactive/scroll-progress";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { organizationJsonLd } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

import "./globals.css";

/* Display face for headlines.
   The optical-size axis was dropped: carrying it made the variable file ~40%
   larger, and all four families are preloaded on the critical path where they
   compete with HTML and CSS for bandwidth. At the sizes actually used here the
   optical refinement was not visible; the bytes were. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

/* Body copy — and the LCP element on most pages, so this one stays preloaded. */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

/* Only used for small eyebrow labels and code, none of which are LCP
   candidates. Not preloaded, so it never competes with the headline. */
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jet",
  display: "swap",
  preload: false,
});

/* The accent voice — one italic serif word inside a grotesque headline is the
   SKITE typographic signature. Italic only: every use of this face is italic,
   so shipping the roman would be a wasted font request. */
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.company.legalName, url: siteConfig.url }],
  creator: siteConfig.company.legalName,
  publisher: siteConfig.company.legalName,
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    locale: siteConfig.locale,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.tagline }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@skite",
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050816" },
    { media: "(prefers-color-scheme: light)", color: "#f7f8fb" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // next-themes writes the theme class before paint; React would otherwise
      // flag the server/client mismatch on <html>.
      suppressHydrationWarning
      className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable} ${instrument.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          // Structured data is static and author-controlled, not user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />

        <ThemeProvider>
          <CommandPaletteProvider>
            <SmoothScroll>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[300] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-background"
              >
                Skip to content
              </a>

              <Preloader />
              <ScrollProgress />
              <CursorMount />
              <GrainOverlay />

              <SiteHeader />
              <main id="main" className="flex-1">
                {children}
              </main>
              <SiteFooter />
            </SmoothScroll>
          </CommandPaletteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

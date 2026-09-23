import type { Metadata, Viewport } from "next";
import { Anybody, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "@genlayer/transaction-kit-react/styles.css";
import "./globals.css";
import { canonicalUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteStructuredData } from "@/lib/seo";
import { Providers } from "./providers";

// Anybody's width axis drives the condensed and extra-wide display type.
const display = Anybody({ subsets: ["latin"], axes: ["wdth"], variable: "--font-anybody", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(canonicalUrl("/")),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: canonicalUrl("/"),
    siteName: SITE_NAME,
    type: "website",
    locale: "en",
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData()) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

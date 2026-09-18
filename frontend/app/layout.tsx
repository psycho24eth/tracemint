import type { Metadata, Viewport } from "next";
import { Anybody, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "@genlayer/transaction-kit-react/styles.css";
import "./globals.css";
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
  title: "TraceMint",
  description: "An AI agent finds copies of your art, GenLayer validators judge them, and site owners settle with an on-chain license.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

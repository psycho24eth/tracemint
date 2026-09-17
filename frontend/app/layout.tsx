import type { Metadata, Viewport } from "next";
import { Unbounded } from "next/font/google";
import "@genlayer/transaction-kit-react/styles.css";
import "./globals.css";
import { Providers } from "./providers";

const heading = Unbounded({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-heading", display: "swap" });

export const metadata: Metadata = {
  title: "TraceMint",
  description: "GenLayer validators judge copied images; site owners settle with a license.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={heading.variable}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

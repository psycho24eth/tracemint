import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/PageShell";
import { Reveal } from "@/components/hero/Reveal";
import {
  PROMINENCE_BPS,
  PROMINENCE_LABELS,
  USAGE_BPS,
  USAGE_LABELS,
  multiplierText,
  type Prominence,
  type Usage,
} from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Registering a work and scanning for copies is free. TraceMint takes 3% of a licence fee it collects; the creator keeps 97%. The fee itself is the creator's own price, multiplied by how the copy was used.",
  path: "/pricing",
});

const SIDES = [
  {
    who: "Creators",
    cost: "Free",
    detail:
      "Register a work, publish your terms, list the pages you want watched, and run scans as often as you like. You pay network fees on GenLayer and nothing else.",
    then: "When a site owner pays, 97% of the fee lands in the contract under your address. You withdraw it yourself.",
    tone: "chip-mint",
  },
  {
    who: "Site owners",
    cost: "The licence fee",
    detail:
      "You only pay if validators agree the copy on your page is unlicensed. The notice shows the work, the page, the reasoning and the exact amount before you decide.",
    then: "Paying records an on-chain licence for that use. Disputing is free, and a dispute is judged the same way the claim was.",
    tone: "chip-signal",
  },
] as const;

const USAGE_ORDER: Usage[] = ["PERSONAL", "EDITORIAL", "COMMERCIAL", "ADS_MERCH"];
const PROMINENCE_ORDER: Prominence[] = ["INCIDENTAL", "FEATURED", "PRIMARY"];

const USAGE_MEANING: Record<Usage, string> = {
  PERSONAL: "A personal page or hobby project that earns nothing.",
  EDITORIAL: "An article, a review, a news post.",
  COMMERCIAL: "A page that sells something, or markets a business.",
  ADS_MERCH: "A paid advert, or the art printed on a product.",
};

const PROMINENCE_MEANING: Record<Prominence, string> = {
  INCIDENTAL: "In the background, or one of many thumbnails.",
  FEATURED: "Shown clearly as part of the page.",
  PRIMARY: "The hero image the page is built around.",
};

/** A worked example beats a formula. 10 GEN is the base price used across the demo work. */
const EXAMPLE = { base: 10, usage: "COMMERCIAL" as Usage, prominence: "PRIMARY" as Prominence };

/** Trims the float dust a percentage split leaves behind, so 0.9 never prints as 0.8999999999999986. */
const gen = (amount: number) => `${Number(amount.toFixed(2))} GEN`;

const EXAMPLE_FEE =
  (EXAMPLE.base * Number(USAGE_BPS[EXAMPLE.usage]) * Number(PROMINENCE_BPS[EXAMPLE.prominence])) / 100_000_000;
const EXAMPLE_CREATOR = (EXAMPLE_FEE * 97) / 100;
const EXAMPLE_PROTOCOL = (EXAMPLE_FEE * 3) / 100;
const EXAMPLE_LOW = (EXAMPLE.base * Number(USAGE_BPS.PERSONAL) * Number(PROMINENCE_BPS.INCIDENTAL)) / 100_000_000;

function priceStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "TraceMint licence settlement",
    serviceType: "Image licensing and copy detection",
    description:
      "Registering artwork and scanning for copies is free. TraceMint takes a 3% commission on a licence fee collected from a site owner; the creator receives 97%.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to register and scan. 3% commission on a collected licence fee.",
    },
  };
}

export default function PricingPage() {
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(priceStructuredData()) }} />

      <header className="mb-14 space-y-6">
        <p className="t-label">
          <span className="t-index mr-2">00</span>
          Pricing
        </p>
        <h1 className="display-condensed max-w-4xl text-6xl md:text-8xl">
          Free until you
          <br />
          get paid
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          TraceMint earns nothing until a creator does. Registering a work, watching pages and running scans cost
          nothing beyond network fees. When a site owner settles a notice, the protocol keeps 3% of that fee and the
          creator keeps 97%. There is no subscription and no per-scan charge.
        </p>
      </header>

      <section aria-labelledby="who-pays" className="mb-16">
        <h2 id="who-pays" className="t-label mb-5 text-foreground">
          <span className="t-index mr-2">01</span>
          Who pays what
        </h2>
        <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
          {SIDES.map((side, index) => (
            <Reveal key={side.who} delay={index * 80}>
              <div className="flex h-full flex-col gap-4 bg-background p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="display-wide text-lg">{side.who}</h3>
                  <span className={`chip ${side.tone}`}>{side.cost}</span>
                </div>
                <p className="text-sm text-muted-foreground">{side.detail}</p>
                <p className="mt-auto border-t border-line pt-4 text-sm text-muted-foreground">{side.then}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="the-split" className="mb-16">
        <h2 id="the-split" className="t-label mb-5 text-foreground">
          <span className="t-index mr-2">02</span>
          The split
        </h2>
        <div className="panel">
          <div className="panel-head">
            <span className="t-label">Every licence fee collected</span>
            <span className="t-label">Set in the contract</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex h-10 overflow-hidden border border-[var(--line-strong)]" aria-hidden="true">
              <div className="flex w-[97%] items-center bg-mint/15 px-3">
                <span className="font-mono text-xs tracking-[0.12em] text-mint">97% CREATOR</span>
              </div>
              <div className="w-[3%] bg-signal" />
            </div>
            <dl className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="font-mono text-sm text-mint">97% — the creator</dt>
                <dd className="text-sm text-muted-foreground">
                  Credited to their address the moment the payment is accepted, and withdrawable without asking anyone.
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="font-mono text-sm text-signal">3% — the protocol</dt>
                <dd className="text-sm text-muted-foreground">
                  Pays for the validator work each scan and each verdict costs, and for running the service. Written
                  into the contract, so neither side has to trust a price list.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="the-fee" className="mb-16">
        <h2 id="the-fee" className="t-label mb-5 text-foreground">
          <span className="t-index mr-2">03</span>
          How the fee is worked out
        </h2>
        <p className="mb-8 max-w-2xl text-muted-foreground">
          You set one base price per work. Validators decide how the copy was actually used, and the contract multiplies
          your price by those two answers. Nobody negotiates, and the same page gets the same number every time.
        </p>

        <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
          <div className="bg-background p-6">
            <h3 className="t-label mb-4 text-foreground">What the page is for</h3>
            <dl className="space-y-3">
              {USAGE_ORDER.map((usage) => (
                <div key={usage} className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                  <div>
                    <dt className="text-sm">{USAGE_LABELS[usage]}</dt>
                    <dd className="text-xs text-muted-foreground">{USAGE_MEANING[usage]}</dd>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-signal">{multiplierText(USAGE_BPS[usage])}</span>
                </div>
              ))}
            </dl>
          </div>
          <div className="bg-background p-6">
            <h3 className="t-label mb-4 text-foreground">How prominent the copy is</h3>
            <dl className="space-y-3">
              {PROMINENCE_ORDER.map((prominence) => (
                <div key={prominence} className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                  <div>
                    <dt className="text-sm">{PROMINENCE_LABELS[prominence]}</dt>
                    <dd className="text-xs text-muted-foreground">{PROMINENCE_MEANING[prominence]}</dd>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-signal">
                    {multiplierText(PROMINENCE_BPS[prominence])}
                  </span>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-px bg-[var(--line)] p-px">
          <div className="bg-background p-6">
            <h3 className="t-label mb-4 text-foreground">Worked example</h3>
            <p className="font-mono text-sm leading-relaxed">
              <span className="text-muted-foreground">base</span> {EXAMPLE.base} GEN
              <span className="mx-2 text-muted-foreground">×</span>
              <span className="text-muted-foreground">{USAGE_LABELS[EXAMPLE.usage].toLowerCase()}</span>{" "}
              {multiplierText(USAGE_BPS[EXAMPLE.usage]).replace("× ", "")}
              <span className="mx-2 text-muted-foreground">×</span>
              <span className="text-muted-foreground">{PROMINENCE_LABELS[EXAMPLE.prominence].toLowerCase()}</span>{" "}
              {multiplierText(PROMINENCE_BPS[EXAMPLE.prominence]).replace("× ", "")}
              <span className="mx-2 text-muted-foreground">=</span>
              <span className="text-signal">{gen(EXAMPLE_FEE)}</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              The site owner pays {gen(EXAMPLE_FEE)}. The creator receives {gen(EXAMPLE_CREATOR)} and the protocol
              keeps {gen(EXAMPLE_PROTOCOL)}. A personal blog using the same work in the background would owe{" "}
              {gen(EXAMPLE_LOW)} instead — the range runs from a quarter of your price to four and a half times it.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="try-it" className="border-t border-line pt-10">
        <h2 id="try-it" className="display-wide mb-3 text-2xl">
          Test GEN is free
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          TraceMint runs on GenLayer Studio Next, and the faucet in the app hands you test GEN for network fees. You can
          register a work, find a copy and settle a licence end to end without buying anything. The{" "}
          <Link href="/judges" className="t-link">
            five-minute walkthrough
          </Link>{" "}
          does exactly that, or read the{" "}
          <Link href="/faq" className="t-link">
            questions and answers
          </Link>{" "}
          first.
        </p>
      </section>
    </PageShell>
  );
}

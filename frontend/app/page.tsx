import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { HeroVisual } from "@/components/hero/HeroVisual";
import { Reveal } from "@/components/hero/Reveal";
import { CollectionPreview } from "@/components/landing/CollectionPreview";
import { HeroStage } from "@/components/landing/HeroStage";
import { LiveStats } from "@/components/landing/LiveStats";
import { LiveTicker } from "@/components/landing/LiveTicker";
import { PageShell } from "@/components/PageShell";
import { SectionHeading } from "@/components/SectionHeading";

const STEPS = [
  {
    title: "Scan",
    text: "The agent checks the sites you watch every 30 minutes, plus the open web when image search is on.",
  },
  {
    title: "Notice",
    text: "GenLayer validators compare the images, agree on the match, and the contract issues an on-chain, time-stamped notice with a pay link.",
  },
  {
    title: "License",
    text: "The site owner pays a micro-license sized to how the image is used and clears it in a single transaction.",
  },
  {
    title: "Withdraw",
    text: "Creators keep 97% of every license and withdraw earnings any time, with no upfront cost.",
  },
];

const PRINCIPLES = [
  {
    title: "Consensus, not one judge",
    text: "Validators independently compare the original and the copy, and must agree before a notice ever goes out.",
  },
  {
    title: "No single party decides",
    text: "No platform, moderator, or single model owns the call. The contract only acts once validators converge.",
  },
  {
    title: "A public, time-stamped record",
    text: "Every notice and fee is written on-chain with a timestamp, so the finding and the pay link are verifiable by anyone.",
  },
];

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

export default function LandingPage() {
  return (
    <PageShell bleed>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[75%] [mask-image:linear-gradient(90deg,transparent,#000_35%)]">
          <HeroVisual />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-10 md:px-6 lg:grid-cols-12 lg:gap-8 lg:pb-16 lg:pt-14">
          <div className="flex flex-col lg:col-span-5">
            <p className="t-label rise">Provenance protocol · GenLayer Studio Next</p>
            <h1 className="display-condensed mt-5 flex flex-col text-[24vw] lg:text-[8.5rem] xl:text-[10.5rem]">
              <span className="rise" style={delay(80)}>
                Trace.
              </span>{" "}
              <span
                className="rise display-wide text-[14vw] leading-[0.98] text-signal lg:text-[4.2rem] xl:text-[5.2rem]"
                style={delay(160)}
              >
                Judge.
              </span>{" "}
              <span className="rise" style={delay(240)}>
                Mint.
              </span>
            </h1>
            <p className="rise mt-7 max-w-md text-muted-foreground" style={delay(320)}>
              Turn IP infringement into instant licensing. An agent finds copies of your art, GenLayer validators judge
              each one with vision, and the site owner settles with a 12-month license.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-4" style={delay(400)}>
              <Link href="/judges" className="btn-signal">
                Try the demo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className="btn-line">
                How it works
              </a>
            </div>
          </div>

          <div className="rise lg:col-span-7" style={delay(200)}>
            <HeroStage />
          </div>

          <div className="rise lg:col-span-12" style={delay(480)}>
            <LiveStats />
          </div>
        </div>
      </section>

      <LiveTicker />

      <div className="mx-auto max-w-7xl space-y-28 px-4 py-20 md:px-6 md:py-28">
        <section id="how-it-works" aria-label="How it works" className="scroll-mt-24">
          <SectionHeading index="01" kicker="How it works" title="From a quiet scan to a paid creator.">
            Four on-chain steps. The agent only files claims; validators decide, and the contract moves the money.
          </SectionHeading>
          <ol className="mt-12 grid gap-px border border-line bg-[var(--line-strong)] sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ title, text }, index) => (
              <li key={title} className="bg-background">
                <Reveal delay={index * 80} className="flex h-full flex-col gap-4 p-6">
                  <span className="display-wide text-4xl text-signal">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="display-condensed text-4xl">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="The collection">
          <SectionHeading index="02" kicker="The collection" title="Every work is a card.">
            Registered works, the notices validators issue for their copies, and the licenses site owners buy all live
            on-chain, and each one looks like it.
          </SectionHeading>
          <div className="mt-12">
            <CollectionPreview />
          </div>
        </section>

        <section aria-label="Why decentralized judgment">
          <SectionHeading index="03" kicker="Why decentralized judgment" title="No single judge.">
            Whether a page used someone&apos;s work without permission is a judgment call. Here, that call isn&apos;t
            made by one platform or one model.
          </SectionHeading>
          <div className="mt-12 grid gap-px border border-line bg-[var(--line-strong)] md:grid-cols-3">
            {PRINCIPLES.map(({ title, text }, index) => (
              <Reveal key={title} delay={index * 80} className="bg-background p-6">
                <span className="t-index text-sm">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-xl">{title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden border border-signal/60 bg-signal/[0.06] p-8 md:p-14" aria-label="Try the demo">
          <p className="t-label text-signal">Live on Studio Next</p>
          <h2 className="display-condensed mt-4 max-w-4xl text-6xl md:text-8xl">See a notice fire on-chain.</h2>
          <p className="mt-5 max-w-xl text-muted-foreground">
            Follow the judge path: scan a copied artwork, read the validators&apos; verdict, pay the license, and watch
            the creator get paid. Every step is a real transaction.
          </p>
          <Link href="/judges" className="btn-signal mt-8">
            Start the demo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </PageShell>
  );
}

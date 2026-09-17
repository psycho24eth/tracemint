import { ArrowRight, Gavel, Receipt, ScanSearch, Wallet } from "lucide-react";
import Link from "next/link";

import { HeroVisual } from "@/components/hero/HeroVisual";
import { Reveal } from "@/components/hero/Reveal";
import { PageShell } from "@/components/PageShell";

const STEPS = [
  {
    icon: ScanSearch,
    title: "Scan",
    text: "The agent checks the sites you watch every 30 minutes, plus the open web when image search is on.",
  },
  {
    icon: Gavel,
    title: "Notice",
    text: "GenLayer validators compare the images, agree on the match, and the contract issues an on-chain, time-stamped notice with a pay link.",
  },
  {
    icon: Receipt,
    title: "License",
    text: "The site owner pays a micro-license sized to how the image is used and clears it in a single transaction.",
  },
  {
    icon: Wallet,
    title: "Withdraw",
    text: "Creators keep 97% of every license and withdraw earnings any time, with no upfront cost.",
  },
];

const STATS = ["AI validators judge each copy", "Fee computed on-chain", "Creators keep 97%"];

const PRINCIPLES = [
  {
    title: "Consensus, not one judge",
    text: "Validators independently compare the original and the copy, and must agree before a notice ever goes out.",
  },
  {
    title: "No single party decides",
    text: "No platform, moderator, or single model owns the call — the contract only acts once validators converge.",
  },
  {
    title: "A public, time-stamped record",
    text: "Every notice and fee is written on-chain with a timestamp, so the finding and the pay link are verifiable by anyone.",
  },
];

export default function LandingPage() {
  return (
    <PageShell>
      <section className="grid gap-10 py-8 md:py-12 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="order-2 flex flex-col items-start gap-6 lg:order-1">
          <span className="pill-badge">Built on GenLayer &middot; Studio Next</span>

          <h1 className="max-w-xl text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-6xl">
            Turn IP infringement into instant licensing
          </h1>

          <p className="max-w-lg text-lg text-muted-foreground">
            Register the art you own. When a site copies it, GenLayer validators judge the match with vision, and the
            site owner clears it with one micro-license payment.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/judges" className="btn-gradient focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Try the demo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className="btn-outline-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              How it works
            </a>
          </div>

          <div className="flex flex-wrap gap-3">
            {STATS.map((stat) => (
              <span key={stat} className="stat-chip">
                {stat}
              </span>
            ))}
          </div>
        </div>

        <div className="relative order-1 h-[320px] w-full lg:order-2 lg:h-[520px]">
          <HeroVisual />
        </div>
      </section>

      <section id="how-it-works" className="py-16 md:py-20" aria-label="How it works">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">How it works</h2>
          <p className="mt-3 text-muted-foreground">From a quiet scan to money in a creator&apos;s wallet, in four on-chain steps.</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 80} className="glass flex h-full flex-col gap-3 p-5">
              <span className="glow-cyan flex h-10 w-10 items-center justify-center rounded-lg border border-border">
                <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-20" aria-label="Why decentralized judgment">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Why decentralized judgment</h2>
          <p className="mt-3 text-muted-foreground">
            Whether a page used someone&apos;s work without permission is a judgment call. Here, that call isn&apos;t made
            by one platform or one model.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PRINCIPLES.map(({ title, text }, index) => (
            <Reveal key={title} delay={index * 80} className="glass p-6">
              <span className="text-gradient text-sm font-semibold">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="glass relative my-8 flex flex-col items-center gap-4 overflow-hidden p-10 text-center md:my-12 md:p-16">
        <div className="glow-cyan pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl" aria-hidden="true" />
        <h2 className="relative text-2xl font-semibold md:text-3xl">Ready to see a notice fire on-chain?</h2>
        <p className="relative max-w-xl text-muted-foreground">
          Watch the judge flow decide a real case in the demo, from image comparison to a signed, payable notice.
        </p>
        <Link href="/judges" className="btn-gradient relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Start the demo
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </PageShell>
  );
}

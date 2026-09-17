import { ArrowRight, Eye, Gavel, Receipt, ScanSearch, Wallet } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/PageShell";
import { buttonVariants } from "@/components/ui/button";

const STEPS = [
  {
    icon: ScanSearch,
    title: "Scan",
    text: "The agent checks the sites you watch every 30 minutes, plus the open web when image search is on.",
  },
  {
    icon: Eye,
    title: "Judge",
    text: "GenLayer validators each compare your work with the copy and must agree the use is unlicensed.",
  },
  {
    icon: Gavel,
    title: "Notice",
    text: "An on-chain, time-stamped notice with a pay link, addressed to the wallet on the page when there is one.",
  },
  {
    icon: Receipt,
    title: "Settle",
    text: "The site owner pays a fee sized by how the image is used and gets a 12-month license.",
  },
  {
    icon: Wallet,
    title: "Earn",
    text: "Creators keep 97% of every license and withdraw whenever they like. No upfront cost.",
  },
];

export default function LandingPage() {
  return (
    <PageShell>
      <section className="py-12 text-center">
        <p className="text-sm font-medium text-accent">Onchain Justice · GenLayer Studio Next</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Turn IP infringement into instant licensing
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Register an image you own. When a site copies it, GenLayer validators decide whether the use is unlicensed, and
          the site owner can settle with a license in one transaction.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/judges" className={buttonVariants({ variant: "gradient", size: "lg" })}>
            Try the demo
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/notices" className={buttonVariants({ variant: "outline", size: "lg" })}>
            See notices
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5" aria-label="How it works">
        {STEPS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="brand-card p-4">
            <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <section className="brand-card mt-10 p-6">
        <h2 className="text-xl font-semibold">Why decentralized judgment</h2>
        <p className="mt-2 text-muted-foreground">
          Whether a page uses someone&apos;s work without permission is a judgment call. When one platform or one AI makes
          that call, it can be wrong or captured. Here, several validators independently look at both images and must
          agree before anyone is asked to pay, and a site owner who already has permission can dispute with proof.
        </p>
      </section>
    </PageShell>
  );
}

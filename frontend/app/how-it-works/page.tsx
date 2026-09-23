import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/PageShell";
import { Reveal } from "@/components/hero/Reveal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How it works",
  description:
    "The five stages from registering a work to a settled licence, what a GenLayer validator actually reads before it votes, what a notice records, and how a dispute is judged.",
  path: "/how-it-works",
});

type Stage = {
  name: string;
  you: string;
  network: string;
  chain: string;
};

/** Each stage says what the person does, what the network does, and what ends up recorded. */
const STAGES: Stage[] = [
  {
    name: "Register",
    you: "Upload the image, link the portfolio page it lives on, write your licence terms in plain words, set one base price, and list up to ten pages you want watched.",
    network:
      "Before the work is accepted the contract fetches your portfolio page and checks your wallet address appears on it. That is the proof the work is yours to license.",
    chain: "A work record: title, image URL, portfolio URL, base price, terms, watchlist, creator address, timestamp.",
  },
  {
    name: "Scan",
    you: "Press Scan, or let the agent run. You can change the watchlist at any time — nobody else can, because the contract only accepts that call from your address.",
    network:
      "The agent fetches each watched page, pulls out the images, and compares them against your registered work with a perceptual hash. Anything close enough becomes a candidate.",
    chain: "Nothing yet. A scan that finds nothing costs nothing but the fetch.",
  },
  {
    name: "Judge",
    you: "Wait. This is the part that takes a minute or two, and the app shows you which consensus step the network is on while it happens.",
    network:
      "A leader validator fetches both images and the text of the page, then asks a model to decide against your terms. Every other validator repeats the same work independently and votes on whether that answer is reasonable.",
    chain:
      "Only an agreed verdict: one of unlicensed copy, licensed copy, different work, or unclear — with the reasoning, the usage, the prominence, and a fee if there is one.",
  },
  {
    name: "Notice",
    you: "Nothing. You did not write to anybody, and you do not negotiate.",
    network:
      "A verdict of unlicensed copy becomes a notice. The fee is your base price multiplied by what the page is for and how prominent the copy is — a formula that was public before the page was scanned.",
    chain: "A claim marked notice issued, with the page, the image, the reasoning and the exact fee.",
  },
  {
    name: "Settle",
    you: "The site owner opens the notice link, reads the finding, and either pays it or disputes it. You withdraw whenever you like.",
    network:
      "Payment must match the fee exactly. The contract splits it on the spot: 97% credited to you, 3% to the protocol. A licence record is written for that use, valid for a year.",
    chain: "A licence, a claim marked paid, and your withdrawable balance going up.",
  },
];

const READS = [
  {
    what: "Your registered image",
    why: "Fetched fresh from the URL you registered, so the comparison is against the real thing rather than a stored thumbnail.",
  },
  {
    what: "The image found on the page",
    why: "Fetched from the page the agent flagged. Both images go to the model together, so it is comparing, not guessing from a description.",
  },
  {
    what: "The page's text",
    why: "Up to 4,000 characters. This is how usage and prominence get decided — a shop listing reads differently from a review, and a hero image reads differently from a thumbnail.",
  },
  {
    what: "Your terms, as you wrote them",
    why: "The verdict is against your published terms, not a general idea of fair use. If you allow editorial use, editorial use is not a copy.",
  },
  {
    what: "A wallet address printed on the page",
    why: "If the page shows one, the contract records it and then only that wallet may dispute the notice. It stops a stranger arguing about someone else's page.",
  },
];

export default function HowItWorksPage() {
  return (
    <PageShell>
      <header className="mb-14 space-y-6">
        <p className="t-label">
          <span className="t-index mr-2">00</span>
          How it works
        </p>
        <h1 className="display-condensed max-w-4xl text-6xl md:text-8xl">
          Five stages,
          <br />
          one of them
          <br />
          is waiting
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Nobody sends an email at any point. You register a work and set a price; an agent looks at the pages you
          named; validators decide whether what it found is a copy; the contract does the arithmetic and moves the
          money. Below is what actually happens at each stage, and what ends up recorded.
        </p>
      </header>

      <section aria-labelledby="stages" className="mb-20">
        <h2 id="stages" className="t-label mb-6 text-foreground">
          <span className="t-index mr-2">01</span>
          The five stages
        </h2>
        <ol className="grid gap-px bg-[var(--line-strong)] border border-[var(--line-strong)]">
          {STAGES.map((stage, index) => (
            <li key={stage.name} className="bg-background">
              <Reveal delay={index * 60} className="grid gap-5 p-6 md:grid-cols-12 md:gap-8">
                <div className="md:col-span-3">
                  <span className="display-wide text-3xl text-signal">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="display-condensed mt-2 text-4xl">{stage.name}</h3>
                </div>
                <dl className="md:col-span-9 grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <dt className="t-label">You</dt>
                    <dd className="text-sm text-muted-foreground">{stage.you}</dd>
                  </div>
                  <div className="space-y-1.5">
                    <dt className="t-label">The network</dt>
                    <dd className="text-sm text-muted-foreground">{stage.network}</dd>
                  </div>
                  <div className="space-y-1.5">
                    <dt className="t-label text-mint">On chain</dt>
                    <dd className="text-sm text-muted-foreground">{stage.chain}</dd>
                  </div>
                </dl>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="reads" className="mb-20">
        <h2 id="reads" className="t-label mb-6 text-foreground">
          <span className="t-index mr-2">02</span>
          What a validator reads before it votes
        </h2>
        <p className="mb-8 max-w-2xl text-muted-foreground">
          This is the part that makes the verdict worth anything. Each validator does the reading itself — it does not
          take the leader's word for it — and the claim is only recorded if they land in the same place.
        </p>
        <dl className="border-t border-line">
          {READS.map((item) => (
            <div key={item.what} className="grid gap-2 border-b border-line py-5 md:grid-cols-12 md:gap-8">
              <dt className="display-wide text-sm leading-tight md:col-span-4">{item.what}</dt>
              <dd className="text-sm text-muted-foreground md:col-span-8">{item.why}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          If the validators cannot agree, nothing is written and the agent tries again on its next run. An
          inconclusive scan is a normal outcome, not an error — and it is why a notice that does exist means
          something.
        </p>
      </section>

      <section aria-labelledby="notice" className="mb-20">
        <h2 id="notice" className="t-label mb-6 text-foreground">
          <span className="t-index mr-2">03</span>
          If a notice names your page
        </h2>
        <div className="grid gap-px bg-[var(--line-strong)] border border-[var(--line-strong)] md:grid-cols-3">
          <div className="flex flex-col gap-2 bg-background p-6">
            <span className="chip chip-mint">Option one</span>
            <h3 className="display-wide text-base">Pay it</h3>
            <p className="text-sm text-muted-foreground">
              One transaction, the exact amount shown. You get a licence record for that use, on chain, dated, valid
              for a year. No correspondence, and nothing to sign.
            </p>
          </div>
          <div className="flex flex-col gap-2 bg-background p-6">
            <span className="chip chip-signal">Option two</span>
            <h3 className="display-wide text-base">Dispute it</h3>
            <p className="text-sm text-muted-foreground">
              Give a URL that shows the creator's permission — a licence, an email, a credit line, a receipt. The
              dispute is judged the same way the claim was: validators read your proof and vote. Disputing is free.
            </p>
          </div>
          <div className="flex flex-col gap-2 bg-background p-6">
            <span className="chip">What it is not</span>
            <h3 className="display-wide text-base">A legal claim</h3>
            <p className="text-sm text-muted-foreground">
              A notice is an automated finding reached by validator consensus. It carries no jurisdiction and no court
              behind it, and payment is voluntary. It is a cheap way to settle something, not a threat.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="record" className="border-t border-line pt-10">
        <h2 id="record" className="display-wide mb-4 text-2xl">
          Everything above is checkable
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Every claim, verdict, licence and payout is a transaction on GenLayer with a link to the block explorer, so
          you do not have to take our word for any of it. The{" "}
          <Link href="/judges" className="t-link">
            five-minute walkthrough
          </Link>{" "}
          runs the whole flow in front of you on a funded test wallet. If you would rather read the numbers first,
          they are on{" "}
          <Link href="/pricing" className="t-link">
            pricing
          </Link>
          , and the contract interface is in the{" "}
          <Link href="/docs" className="t-link">
            developer docs
          </Link>
          .
        </p>
      </section>
    </PageShell>
  );
}

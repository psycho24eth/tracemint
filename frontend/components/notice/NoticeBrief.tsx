"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { Claim, Work } from "@/lib/contracts/LicenseHunter";
import { addressLink, formatGen, shortAddress } from "@/lib/format";

/**
 * Most people who open a notice have never heard of TraceMint. They arrived from a link, they are
 * looking at a bill, and the first thing they want to know is whether this is real and what happens
 * if they ignore it. Answering that plainly, before the evidence, is the difference between a
 * settlement rail and a page that reads like a shakedown.
 */
export function NoticeBrief({ claim, work }: { claim: Claim; work: Work }) {
  const [showIgnore, setShowIgnore] = useState(false);

  return (
    <section aria-labelledby="brief" className="panel border-l-2 border-l-signal">
      <div className="panel-head">
        <h2 id="brief" className="t-label text-foreground">
          If you are the owner of this page, read this first
        </h2>
        <span className="t-label">Notice #{claim.id}</span>
      </div>

      <div className="space-y-5 p-6">
        <p className="text-sm leading-relaxed">
          An image on your page was matched to a work someone registered here, and independent GenLayer validators
          agreed the match is real and that the creator&apos;s published terms do not cover the way your page uses it.
          You are being offered a licence for <strong className="text-signal">{formatGen(claim.fee)}</strong>, priced
          by a formula that was public before your page was ever scanned.
        </p>

        <dl className="grid gap-4 border-y border-line py-4 text-sm sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="t-label">Who is asking</dt>
            <dd className="text-muted-foreground">
              <a href={addressLink(work.creator)} target="_blank" rel="noreferrer" className="t-link">
                {shortAddress(work.creator)}
              </a>
              , who registered{" "}
              <a href={work.portfolioUrl} target="_blank" rel="noreferrer" className="t-link">
                this work
              </a>{" "}
              and set its price in advance.
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="t-label">Who decided</dt>
            <dd className="text-muted-foreground">
              Not the creator, and not us. A group of validators each read your page and voted. Their reasoning is
              below and the vote is on chain.
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="t-label">What it costs to argue</dt>
            <dd className="text-muted-foreground">
              Nothing. Disputing is free, and a dispute is judged the same way the claim against you was.
            </dd>
          </div>
        </dl>

        <div>
          <button
            type="button"
            onClick={() => setShowIgnore((was) => !was)}
            aria-expanded={showIgnore}
            className="flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-signal"
          >
            <ChevronDown
              className={`size-4 transition-transform duration-200 ${showIgnore ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            What happens if I just ignore this?
          </button>

          {showIgnore && (
            <ul className="mt-3 space-y-2 border-l border-line pl-4 text-sm text-muted-foreground">
              <li>
                No account was created for you, nothing was signed in your name, and no payment method of yours is
                held anywhere. There is nothing to cancel.
              </li>
              <li>
                Nothing is reported to a credit agency and nothing is filed with a court. This system has no such
                mechanism and never did.
              </li>
              <li>The notice stays open on chain, and the image stays on your page unless you take it down.</li>
              <li>
                A notice is an automated finding, not a legal claim. It carries no jurisdiction. Paying it is
                voluntary — it is offered because settling is usually cheaper and quicker for both sides than the
                alternative, not because anything forces you to.
              </li>
              <li>
                The creator keeps whatever rights they already had under copyright law, the same as before this
                notice existed. That route is separate from this one and is not something we act on.
              </li>
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          New to this?{" "}
          <Link href="/how-it-works" className="t-link">
            How it works
          </Link>{" "}
          explains what the validators read before they vote, and{" "}
          <Link href="/faq" className="t-link">
            the FAQ
          </Link>{" "}
          answers the rest. A notice is a commercial settlement offer, not legal advice.
        </p>
      </div>
    </section>
  );
}

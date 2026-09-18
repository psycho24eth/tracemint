"use client";

import Link from "next/link";

import { EvidenceView } from "@/components/cards/EvidenceView";
import { STATUS_CHIPS } from "@/components/ClaimsTable";
import { DisputeForm } from "@/components/DisputeForm";
import { WriteAction } from "@/components/WriteAction";
import type { Claim, License, Work } from "@/lib/contracts/LicenseHunter";
import {
  addressLink,
  feeBreakdown,
  formatDate,
  formatGen,
  multiplierText,
  PROMINENCE_LABELS,
  shortAddress,
  STATUS_LABELS,
  USAGE_LABELS,
  VERDICT_LABELS,
  type Prominence,
  type Usage,
} from "@/lib/format";

export function NoticeView({ claim, work, license }: { claim: Claim; work: Work; license: License | null }) {
  const breakdown = feeBreakdown(work.basePrice, claim.usage, claim.prominence);
  const payable = claim.status === "NOTICE_ISSUED" || claim.status === "DISPUTE_REJECTED";

  return (
    <div className="space-y-10">
      <header className="grid gap-6 border-b border-line pb-8 md:grid-cols-12">
        <div className="md:col-span-8">
          <p className="t-label">
            <span className="t-index mr-2">Notice #{claim.id}</span>
            {work.title}
          </p>
          <h1 className="display-condensed mt-3 text-6xl md:text-8xl">{VERDICT_LABELS[claim.verdict]}</h1>
        </div>
        <div className="flex flex-col items-start gap-3 md:col-span-4 md:items-end md:justify-end">
          <span className={`chip ${STATUS_CHIPS[claim.status]}`}>{STATUS_LABELS[claim.status]}</span>
          <p className="t-label">Filed {formatDate(claim.createdAt)}</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          <section aria-label="Evidence" className="grid gap-4 sm:grid-cols-2">
            <figure className="panel p-3">
              <figcaption className="t-label mb-3">Registered work</figcaption>
              <img src={work.imageUrl} alt="Registered work" className="aspect-[4/3] w-full rounded-md object-cover" />
            </figure>
            <figure className="panel p-3">
              <figcaption className="t-label mb-3">Found on the page</figcaption>
              <EvidenceView pageUrl={claim.pageUrl} found={claim.imageUrl} />
            </figure>
          </section>

          <p className="text-sm text-muted-foreground">
            Page:{" "}
            <a href={claim.pageUrl} target="_blank" rel="noreferrer" className="t-link break-all text-foreground">
              {claim.pageUrl}
            </a>
          </p>

          <blockquote className="panel border-l-2 border-l-signal p-6">
            <p className="t-label mb-3">Validator reasoning, stored on-chain</p>
            <p className="font-serif text-2xl leading-snug">{claim.reasoning}</p>
          </blockquote>

          {claim.status !== "NO_NOTICE" && (
            <div className="panel p-5 text-sm">
              <p className="t-label">Addressed to</p>
              {claim.walletOnPage ? (
                <a href={addressLink(claim.walletOnPage)} target="_blank" rel="noreferrer" className="t-link mt-2 inline-block">
                  {shortAddress(claim.walletOnPage)}
                </a>
              ) : (
                <p className="mt-2 text-muted-foreground">No wallet was found on the page, so any wallet can settle this notice.</p>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:col-span-5">
          {breakdown && (
            <section className="panel" aria-label="Fee breakdown">
              <div className="panel-head">
                <h2 className="t-label text-foreground">Fee breakdown</h2>
                <span className="t-label">Computed on-chain</span>
              </div>
              <dl className="space-y-3 p-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Base price</dt>
                  <dd>{formatGen(breakdown.basePrice)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Usage: {USAGE_LABELS[claim.usage as Usage]}</dt>
                  <dd>{multiplierText(breakdown.usageBps)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Placement: {PROMINENCE_LABELS[claim.prominence as Prominence]}</dt>
                  <dd>{multiplierText(breakdown.prominenceBps)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <dt className="t-label text-foreground">Total fee</dt>
                  <dd className="display-wide text-3xl text-signal">{formatGen(breakdown.fee)}</dd>
                </div>
              </dl>
              <p className="border-t border-line px-5 py-3 text-xs text-muted-foreground">
                The creator receives {formatGen(breakdown.creatorAmount)} and the protocol keeps {formatGen(breakdown.protocolAmount)}.
              </p>
            </section>
          )}

          {payable && (
            <div className="panel p-5">
              <WriteAction method="pay_license" args={[claim.id]} value={claim.fee} label={`Pay ${formatGen(claim.fee)} and get a license`} />
            </div>
          )}

          {claim.status === "NOTICE_ISSUED" && (
            <div className="panel p-5">
              <DisputeForm claim={claim} />
            </div>
          )}

          {claim.status === "PAID" && license && (
            <div className="panel border-mint/40 p-5 text-sm">
              <p className="text-mint">License issued.</p>
              <Link href={`/licenses/${license.id}`} className="btn-line mt-4">
                View license
              </Link>
            </div>
          )}

          {claim.status === "WITHDRAWN" && (
            <p className="panel p-5 text-sm">This notice was withdrawn after the site owner showed permission.</p>
          )}

          {claim.status === "NO_NOTICE" && (
            <p className="panel p-5 text-sm">
              Validators decided this copy is licensed or a different work, so no notice was issued.
            </p>
          )}

          <div className="panel p-5">
            <p className="t-label">License terms</p>
            <p className="mt-2 text-sm">{work.terms}</p>
          </div>

          <p className="text-xs text-muted-foreground">Not legal advice.</p>
        </aside>
      </div>
    </div>
  );
}

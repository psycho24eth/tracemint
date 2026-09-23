"use client";

import Link from "next/link";

import { EvidenceView } from "@/components/cards/EvidenceView";
import { STATUS_CHIPS } from "@/components/ClaimsTable";
import { DisputeForm } from "@/components/DisputeForm";
import { NoticeBrief } from "@/components/notice/NoticeBrief";
import { SendNotice } from "@/components/notice/SendNotice";
import { WriteAction } from "@/components/WriteAction";
import { actingAddress } from "@/lib/actor";
import type { Claim, ClaimStatus, License, Work } from "@/lib/contracts/LicenseHunter";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
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
import { useWallet } from "@/lib/genlayer/wallet";

/**
 * What the page leads with. A stranger arriving from a link should read what is being offered, not
 * a 96px accusation — the verdict is still shown, as a field, where it belongs.
 */
const HEADLINE: Record<ClaimStatus, string> = {
  NOTICE_ISSUED: "A licence for this image",
  DISPUTE_REJECTED: "A licence for this image",
  PAID: "Licensed",
  WITHDRAWN: "Notice withdrawn",
  NO_NOTICE: "No notice issued",
};

export function NoticeView({ claim, work, license }: { claim: Claim; work: Work; license: License | null }) {
  const { role } = useDemoMode();
  const { address } = useWallet();
  const breakdown = feeBreakdown(work.basePrice, claim.usage, claim.prominence);
  const payable = claim.status === "NOTICE_ISSUED" || claim.status === "DISPUTE_REJECTED";

  const actor = actingAddress(role, address);
  const isCreator = actor !== null && actor.toLowerCase() === work.creator.toLowerCase();

  return (
    <div className="space-y-10">
      <header className="grid gap-6 border-b border-line pb-8 md:grid-cols-12">
        <div className="md:col-span-8">
          <p className="t-label">
            <span className="t-index mr-2">Notice #{claim.id}</span>
            {work.title}
          </p>
          <h1 className="display-condensed mt-3 text-5xl md:text-7xl">{HEADLINE[claim.status]}</h1>
          {payable && (
            <p className="mt-4 max-w-xl text-muted-foreground">
              Settle it in one transaction, or dispute it for free. Nothing happens automatically either way.
            </p>
          )}
        </div>
        <div className="flex flex-col items-start gap-3 md:col-span-4 md:items-end md:justify-end">
          <span className={`chip ${STATUS_CHIPS[claim.status]}`}>{STATUS_LABELS[claim.status]}</span>
          {payable && <p className="display-wide text-4xl text-signal">{formatGen(claim.fee)}</p>}
          <p className="t-label">Filed {formatDate(claim.createdAt)}</p>
        </div>
      </header>

      {payable && <NoticeBrief claim={claim} work={work} />}

      {isCreator && payable && <SendNotice claim={claim} work={work} />}

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

          <dl className="panel grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="t-label">Verdict</dt>
              <dd>{VERDICT_LABELS[claim.verdict]}</dd>
            </div>
            <div className="space-y-1">
              <dt className="t-label">Registered by</dt>
              <dd>
                <a href={addressLink(work.creator)} target="_blank" rel="noreferrer" className="t-link">
                  {shortAddress(work.creator)}
                </a>
              </dd>
            </div>
            {claim.status !== "NO_NOTICE" && (
              <div className="space-y-1 sm:col-span-2">
                <dt className="t-label">Addressed to</dt>
                <dd>
                  {claim.walletOnPage ? (
                    <a href={addressLink(claim.walletOnPage)} target="_blank" rel="noreferrer" className="t-link">
                      {shortAddress(claim.walletOnPage)}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">
                      No wallet was found on the page, so any wallet can settle this notice.
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <aside className="space-y-6 lg:col-span-5">
          {payable && (
            <div className="panel p-5">
              <p className="t-label mb-3 text-foreground">Settle it</p>
              <WriteAction method="pay_license" args={[claim.id]} value={claim.fee} label={`Pay ${formatGen(claim.fee)} and get a license`} />
              <p className="mt-3 text-xs text-muted-foreground">
                One transaction for the exact amount shown. You receive an on-chain licence for this use, dated and
                valid for a year.
              </p>
            </div>
          )}

          {claim.status === "NOTICE_ISSUED" && (
            <div className="panel p-5">
              <p className="t-label mb-3 text-foreground">Or dispute it</p>
              <DisputeForm claim={claim} />
            </div>
          )}

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
                The creator receives {formatGen(breakdown.creatorAmount)} and the protocol keeps {formatGen(breakdown.protocolAmount)}.{" "}
                <Link href="/pricing" className="t-link">
                  How this is priced
                </Link>
              </p>
            </section>
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
            <p className="t-label">License terms, as the creator published them</p>
            <p className="mt-2 text-sm">{work.terms}</p>
          </div>

          <p className="text-xs text-muted-foreground">Not legal advice.</p>
        </aside>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { addressLink, feeBreakdown, formatDate, formatGen, multiplierText, shortAddress, STATUS_LABELS, USAGE_LABELS, PROMINENCE_LABELS, VERDICT_LABELS } from "@/lib/format";
import type { Claim, License, Work } from "@/lib/contracts/LicenseHunter";
import { Badge } from "@/components/ui/badge";
import { WriteAction } from "@/components/WriteAction";
import { DisputeForm } from "@/components/DisputeForm";

export function NoticeView({ claim, work, license }: { claim: Claim; work: Work; license: License | null }) {
  const breakdown = feeBreakdown(work.basePrice, claim.usage, claim.prominence);

  return (
    <div className="space-y-8">
      <div className="glass p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{VERDICT_LABELS[claim.verdict]}</h1>
          <Badge>{STATUS_LABELS[claim.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{formatDate(claim.createdAt)}</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <figure className="glass p-6">
          <img src={work.imageUrl} alt="Registered work" className="w-full h-auto rounded-lg mb-3" />
          <figcaption className="text-sm text-muted-foreground">Registered work</figcaption>
        </figure>
        <figure className="glass p-6">
          <img src={claim.imageUrl} alt="Found on the page" className="w-full h-auto rounded-lg mb-3" />
          <figcaption className="text-sm text-muted-foreground">Found on the page</figcaption>
        </figure>
      </div>

      <div className="glass p-6">
        <a href={claim.pageUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline break-all">
          {claim.pageUrl}
        </a>
      </div>

      <div className="glass p-6">
        {claim.walletOnPage ? (
          <p>
            Addressed to{" "}
            <a href={addressLink(claim.walletOnPage)} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {shortAddress(claim.walletOnPage)}
            </a>
          </p>
        ) : (
          <p>No wallet was found on the page, so any wallet can settle this notice.</p>
        )}
      </div>

      <div className="glass p-6 border-l-4 border-accent italic">
        <blockquote>{claim.reasoning}</blockquote>
      </div>

      {breakdown && (
        <div className="glass p-6 space-y-4">
          <h2 className="font-semibold">Fee breakdown</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Base price</span>
              <span>{formatGen(breakdown.basePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span>Usage: {USAGE_LABELS[claim.usage as keyof typeof USAGE_LABELS]}</span>
              <span>{multiplierText(breakdown.usageBps)}</span>
            </div>
            <div className="flex justify-between">
              <span>Prominence: {PROMINENCE_LABELS[claim.prominence as keyof typeof PROMINENCE_LABELS]}</span>
              <span>{multiplierText(breakdown.prominenceBps)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total fee</span>
              <span>{formatGen(breakdown.fee)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The creator receives {formatGen(breakdown.creatorAmount)} and the protocol keeps {formatGen(breakdown.protocolAmount)}.
          </p>
        </div>
      )}

      <div className="glass p-6">
        <p className="text-sm">{work.terms}</p>
      </div>

      <div className="glass p-6">
        <p className="text-xs text-muted-foreground">Not legal advice.</p>
      </div>

      {(claim.status === "NOTICE_ISSUED" || claim.status === "DISPUTE_REJECTED") && (
        <div className="glass p-6">
          <WriteAction
            method="pay_license"
            args={[claim.id]}
            value={claim.fee}
            label={`Pay ${formatGen(claim.fee)} and get a license`}
          />
        </div>
      )}

      {claim.status === "NOTICE_ISSUED" && (
        <div className="glass p-6">
          <DisputeForm claim={claim} />
        </div>
      )}

      {claim.status === "PAID" && license && (
        <div className="glass p-6">
          <p>
            License issued.{" "}
            <Link href={`/licenses/${license.id}`} className="text-accent hover:underline">
              View license
            </Link>
          </p>
        </div>
      )}

      {claim.status === "WITHDRAWN" && (
        <div className="glass p-6">
          <p>This notice was withdrawn after the site owner showed permission.</p>
        </div>
      )}

      {claim.status === "NO_NOTICE" && (
        <div className="glass p-6">
          <p>Validators decided this copy is licensed or a different work, so no notice was issued.</p>
        </div>
      )}
    </div>
  );
}

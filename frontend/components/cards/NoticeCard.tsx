"use client";

import Link from "next/link";

import type { Claim, ClaimStatus, Work } from "@/lib/contracts/LicenseHunter";
import { formatGen, PROMINENCE_LABELS, USAGE_LABELS, VERDICT_LABELS, type Prominence, type Usage } from "@/lib/format";

import { CardFacts, CardTitle, Collectible, TiltCard } from "./Collectible";
import { EvidenceView } from "./EvidenceView";

const BANDS: Record<ClaimStatus, { label: string; className: string }> = {
  NOTICE_ISSUED: { label: "Open", className: "bg-signal text-background" },
  DISPUTE_REJECTED: { label: "Dispute rejected", className: "bg-signal text-background" },
  PAID: { label: "Licensed", className: "bg-mint text-background" },
  WITHDRAWN: { label: "Withdrawn", className: "bg-secondary text-muted-foreground" },
  NO_NOTICE: { label: "No notice", className: "bg-secondary text-muted-foreground" },
};

export function NoticeCard({ claim, work, tilt = true }: { claim: Claim; work?: Work; tilt?: boolean }) {
  const band = BANDS[claim.status];
  const card = (
    <Collectible>
      <div className={`flex items-center justify-between px-4 py-2 text-[0.625rem] font-bold uppercase tracking-[0.16em] ${band.className}`}>
        <span>Notice #{claim.id}</span>
        <span>{band.label}</span>
      </div>
      <div className="relative flex flex-1 flex-col gap-3 p-4">
        <EvidenceView pageUrl={claim.pageUrl} found={claim.imageUrl} original={work?.imageUrl} />
        <CardTitle>{work?.title ?? `Work #${claim.workId}`}</CardTitle>
        <CardFacts
          facts={[
            ["Fee", claim.fee === 0n ? "None" : formatGen(claim.fee)],
            ["Verdict", VERDICT_LABELS[claim.verdict] ?? claim.verdict],
            ["Use", USAGE_LABELS[claim.usage as Usage] ?? "—"],
            ["Placement", PROMINENCE_LABELS[claim.prominence as Prominence] ?? "—"],
          ]}
        />
      </div>
    </Collectible>
  );

  return (
    <Link href={`/notices/${claim.id}`} className="group block h-full" aria-label={`Notice ${claim.id}, ${band.label}`}>
      {tilt ? <TiltCard>{card}</TiltCard> : card}
    </Link>
  );
}

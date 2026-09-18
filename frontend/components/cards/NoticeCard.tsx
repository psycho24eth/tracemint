"use client";

import Link from "next/link";

import type { Claim, ClaimStatus, Work } from "@/lib/contracts/LicenseHunter";
import { formatGen, PROMINENCE_LABELS, USAGE_LABELS, VERDICT_LABELS, type Prominence, type Usage } from "@/lib/format";

import { CardFacts, CardTitle, Collectible, Layer, phaseFor, serial, TiltCard, type CardTone } from "./Collectible";
import { EvidenceView } from "./EvidenceView";

const STATUS: Record<ClaimStatus, { label: string; tone: CardTone; pill: string }> = {
  NOTICE_ISSUED: { label: "Open", tone: "signal", pill: "bg-signal text-background shadow-[0_0_18px_rgb(255_90_31/0.65)]" },
  DISPUTE_REJECTED: {
    label: "Dispute rejected",
    tone: "signal",
    pill: "bg-signal text-background shadow-[0_0_18px_rgb(255_90_31/0.65)]",
  },
  PAID: { label: "Licensed", tone: "mint", pill: "bg-mint text-background shadow-[0_0_18px_rgb(155_240_200/0.55)]" },
  WITHDRAWN: { label: "Withdrawn", tone: "neutral", pill: "bg-white/10 text-muted-foreground" },
  NO_NOTICE: { label: "No notice", tone: "neutral", pill: "bg-white/10 text-muted-foreground" },
};

export function NoticeCard({ claim, work, tilt = true }: { claim: Claim; work?: Work; tilt?: boolean }) {
  const status = STATUS[claim.status];
  const card = (
    <Collectible art={claim.imageUrl} tone={status.tone} phase={phaseFor(claim.id + 3)}>
      <Layer z={12} className="flex items-center justify-between gap-2">
        <span className="text-[0.625rem] uppercase tracking-[0.16em] text-foreground/75">Notice Nº {serial(claim.id)}</span>
        <span className={`rounded-full px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] ${status.pill}`}>
          {status.label}
        </span>
      </Layer>
      <Layer z={26} className="glass-art">
        <EvidenceView pageUrl={claim.pageUrl} found={claim.imageUrl} original={work?.imageUrl} />
      </Layer>
      <Layer z={18}>
        <CardTitle>{work?.title ?? `Work #${claim.workId}`}</CardTitle>
      </Layer>
      <Layer z={10} className="mt-auto">
        <CardFacts
          facts={[
            ["Fee", claim.fee === 0n ? "None" : formatGen(claim.fee)],
            ["Verdict", VERDICT_LABELS[claim.verdict] ?? claim.verdict],
            ["Use", USAGE_LABELS[claim.usage as Usage] ?? "—"],
            ["Placement", PROMINENCE_LABELS[claim.prominence as Prominence] ?? "—"],
          ]}
        />
      </Layer>
    </Collectible>
  );

  return (
    <Link href={`/notices/${claim.id}`} className="group block h-full" aria-label={`Notice ${claim.id}, ${status.label}`}>
      {tilt ? <TiltCard>{card}</TiltCard> : card}
    </Link>
  );
}

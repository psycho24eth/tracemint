"use client";

import { Fragment } from "react";

import type { Claim, Work } from "@/lib/contracts/LicenseHunter";
import { formatGen, pageLabel, VERDICT_LABELS } from "@/lib/format";
import { useNotices, useStats, useWorks } from "@/lib/hooks/useLicenseHunter";

const FALLBACK = ["5 validators judge every copy", "Fees computed on-chain", "97% of every fee to the creator", "GenLayer Studio Next · chain 61997"];

function describe(claim: Claim, works: Work[]): string {
  const title = works.find((work) => work.id === claim.workId)?.title ?? `Work #${claim.workId}`;
  const where = pageLabel(claim.pageUrl).replace(/^[^/]+/, "");
  switch (claim.status) {
    case "PAID":
      return `License paid · ${title} · ${formatGen(claim.fee)}`;
    case "WITHDRAWN":
      return `Notice #${claim.id} withdrawn · ${title}`;
    case "DISPUTE_REJECTED":
      return `Dispute rejected · notice #${claim.id} · ${title}`;
    default:
      return `Notice #${claim.id} · ${title} on ${where || "the web"} · ${VERDICT_LABELS[claim.verdict] ?? claim.verdict} · ${formatGen(claim.fee)}`;
  }
}

/** A running line of real on-chain events: newest notices first, then the protocol totals. */
export function LiveTicker() {
  const notices = useNotices();
  const works = useWorks();
  const stats = useStats();

  const events = notices.data?.length
    ? [...notices.data]
        .reverse()
        .slice(0, 12)
        .map((claim) => describe(claim, works.data ?? []))
    : FALLBACK;
  if (stats.data) {
    events.push(`${stats.data.works} works registered`, `${stats.data.licenses} licenses minted`);
  }

  // Rendered twice so the -50% loop joins seamlessly.
  const run = (
    <>
      {events.map((event, index) => (
        <Fragment key={index}>
          <span className="px-5">{event}</span>
          <span className="text-signal" aria-hidden="true">
            ▲
          </span>
        </Fragment>
      ))}
    </>
  );

  return (
    <div className="ticker border-y border-line bg-background py-3 text-xs uppercase tracking-[0.12em]" aria-label="Recent on-chain activity">
      <div className="ticker-track">
        {run}
        <span aria-hidden="true" className="contents">
          {run}
        </span>
      </div>
    </div>
  );
}

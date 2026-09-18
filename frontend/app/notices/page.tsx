"use client";

import { useState } from "react";

import { CardSkeleton } from "@/components/cards/Collectible";
import { NoticeCard } from "@/components/cards/NoticeCard";
import { PageShell } from "@/components/PageShell";
import { SectionHeading } from "@/components/SectionHeading";
import type { Claim } from "@/lib/contracts/LicenseHunter";
import { useNotices, useWorks } from "@/lib/hooks/useLicenseHunter";

const FILTERS: { id: string; label: string; match: (claim: Claim) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "open", label: "Open", match: (claim) => claim.status === "NOTICE_ISSUED" || claim.status === "DISPUTE_REJECTED" },
  { id: "licensed", label: "Licensed", match: (claim) => claim.status === "PAID" },
  { id: "withdrawn", label: "Withdrawn", match: (claim) => claim.status === "WITHDRAWN" },
];

export default function NoticesPage() {
  const { data: notices, isLoading, error } = useNotices();
  const works = useWorks();
  const [filter, setFilter] = useState("all");

  const workById = new Map((works.data ?? []).map((work) => [work.id, work]));
  const active = FILTERS.find((item) => item.id === filter) ?? FILTERS[0];
  const shown = [...(notices ?? [])].reverse().filter(active.match);

  return (
    <PageShell>
      <SectionHeading as="h1" kicker="On-chain notices" title="Notices">
        Every notice is a validator-approved finding: the copy, the verdict, and the fee to license it.
      </SectionHeading>

      <div className="mt-10 flex flex-wrap gap-2" role="radiogroup" aria-label="Filter notices">
        {FILTERS.map((item) => {
          const count = (notices ?? []).filter(item.match).length;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors ${
                filter === item.id ? "border-signal bg-signal text-background" : "border-line text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label} <span className="opacity-70">{notices ? count : ""}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-8 text-destructive">Error: {error.message}</p>}

      {!isLoading && !error && shown.length === 0 && (
        <p className="mt-8 text-muted-foreground">
          {notices?.length ? "No notices match this filter." : "No notices yet. Register a work and run a scan."}
        </p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && [0, 1, 2].map((index) => <CardSkeleton key={index} label="Notice" />)}
        {shown.map((notice) => (
          <NoticeCard key={notice.id} claim={notice} work={workById.get(notice.workId)} />
        ))}
      </div>
    </PageShell>
  );
}

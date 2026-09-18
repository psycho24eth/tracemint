"use client";

import { useParams } from "next/navigation";

import { NoticeView } from "@/components/NoticeView";
import { PageShell } from "@/components/PageShell";
import { useClaim, useLicenseForClaim, useWork } from "@/lib/hooks/useLicenseHunter";

export default function NoticePage() {
  const params = useParams();
  const id = parseInt(params.id as string, 10);

  const claimQuery = useClaim(id);
  const workQuery = useWork(claimQuery.data?.workId ?? 0);
  const licenseQuery = useLicenseForClaim(id, claimQuery.data?.status === "PAID");

  if (claimQuery.isLoading || workQuery.isLoading) {
    return (
      <PageShell>
        <p className="t-label">Loading notice #{id}…</p>
      </PageShell>
    );
  }

  if (claimQuery.error) {
    return (
      <PageShell>
        <p className="text-destructive">Error: {claimQuery.error.message}</p>
      </PageShell>
    );
  }

  const claim = claimQuery.data;
  const work = workQuery.data;

  if (!claim || !work) {
    return (
      <PageShell>
        <p className="text-muted-foreground">Notice not found.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <NoticeView claim={claim} work={work} license={licenseQuery.data ?? null} />
    </PageShell>
  );
}

"use client";

import { useParams } from "next/navigation";

import { useWork, useClaims } from "@/lib/hooks/useLicenseHunter";
import { formatGen, shortAddress, addressLink, siteUrl } from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import { WatchlistEditor } from "@/components/WatchlistEditor";
import ClaimsTable from "@/components/ClaimsTable";
import ScanNowButton from "@/components/ScanNowButton";

export default function WorkDetailPage() {
  const params = useParams();
  const workId = parseInt(params.id as string, 10);

  const { data: work, isLoading: workLoading, error: workError } = useWork(workId);
  const { data: claims, isLoading: claimsLoading, error: claimsError } = useClaims(workId);

  if (workLoading) return <PageShell><p className="text-muted-foreground">Loading work…</p></PageShell>;
  if (workError) return <PageShell><p className="text-destructive">{workError.message}</p></PageShell>;
  if (!work) return <PageShell><p className="text-destructive">Work not found</p></PageShell>;

  const useRunId = work.watchUrls.every((url) => url.startsWith(siteUrl("/demo/")));

  return (
    <PageShell>
      <div className="space-y-8">
        <div className="glass">
          <img
            src={work.imageUrl}
            alt={work.title}
            className="w-full max-h-96 object-cover rounded mb-6"
          />
          <div className="space-y-3">
            <h1 className="text-3xl font-bold">{work.title}</h1>
            <p className="text-lg font-semibold text-gradient">{formatGen(work.basePrice)}</p>
            <p className="text-sm">
              Creator:{" "}
              <a href={addressLink(work.creator)} target="_blank" rel="noreferrer" className="underline">
                {shortAddress(work.creator)}
              </a>
            </p>
            <p className="text-sm">
              Portfolio:{" "}
              <a href={work.portfolioUrl} target="_blank" rel="noreferrer" className="underline">
                {work.portfolioUrl}
              </a>
            </p>
            <p className="text-sm">Terms: {work.terms}</p>
          </div>
        </div>

        <div className="glass">
          <h2 className="text-xl font-bold mb-4">Scan for copies</h2>
          <ScanNowButton workId={workId} useRunId={useRunId} />
        </div>

        <WatchlistEditor work={work} />

        <div className="glass">
          <h2 className="text-xl font-bold mb-4">Claims</h2>
          {claimsLoading ? (
            <p className="text-muted-foreground">Loading claims…</p>
          ) : claimsError ? (
            <p className="text-destructive">{claimsError.message}</p>
          ) : (
            <ClaimsTable claims={claims ?? []} />
          )}
        </div>
      </div>
    </PageShell>
  );
}

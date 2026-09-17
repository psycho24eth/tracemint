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
        <div className="glass grid gap-6 p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
          <img
            src={work.imageUrl}
            alt={work.title}
            className="aspect-[3/2] w-full rounded-lg bg-black/40 object-contain"
          />
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Registered work #{work.id}</p>
            <h1 className="text-3xl leading-tight md:text-4xl">{work.title}</h1>
            <p className="text-2xl font-semibold text-gradient">{formatGen(work.basePrice)}</p>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Creator</dt>
                <dd>
                  <a href={addressLink(work.creator)} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    {shortAddress(work.creator)}
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Portfolio</dt>
                <dd className="min-w-0 break-all">
                  <a href={work.portfolioUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    {work.portfolioUrl}
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Terms</dt>
                <dd>{work.terms}</dd>
              </div>
            </dl>
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

"use client";

import { useParams } from "next/navigation";

import ClaimsTable from "@/components/ClaimsTable";
import { Collectible, TiltCard } from "@/components/cards/Collectible";
import { PageShell } from "@/components/PageShell";
import ScanNowButton from "@/components/ScanNowButton";
import { WatchlistEditor } from "@/components/WatchlistEditor";
import { addressLink, formatGen, shortAddress, siteUrl } from "@/lib/format";
import { useClaims, useWork } from "@/lib/hooks/useLicenseHunter";

export default function WorkDetailPage() {
  const params = useParams();
  const workId = parseInt(params.id as string, 10);

  const { data: work, isLoading: workLoading, error: workError } = useWork(workId);
  const { data: claims, isLoading: claimsLoading, error: claimsError } = useClaims(workId);

  if (workLoading) return <PageShell><p className="t-label">Loading work #{workId}…</p></PageShell>;
  if (workError) return <PageShell><p className="text-destructive">{workError.message}</p></PageShell>;
  if (!work) return <PageShell><p className="text-destructive">Work not found</p></PageShell>;

  const useRunId = work.watchUrls.every((url) => url.startsWith(siteUrl("/demo/")));
  const judged = claims ?? [];
  const noticeCount = judged.filter((claim) => claim.status !== "NO_NOTICE").length;

  return (
    <PageShell>
      <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-5">
          <TiltCard max={8}>
            <Collectible finish="edge">
              <div className="p-3">
                <img src={work.imageUrl} alt={work.title} className="aspect-[3/2] w-full rounded-md bg-black object-contain" />
              </div>
            </Collectible>
          </TiltCard>
        </div>

        <div className="space-y-6 lg:col-span-7">
          <p className="t-label">
            <span className="t-index mr-2">Work #{work.id}</span>
            Registered
          </p>
          <h1 className="font-serif text-6xl font-normal leading-[0.95] tracking-normal md:text-7xl">{work.title}</h1>
          <p className="display-wide text-3xl text-signal">{formatGen(work.basePrice)}</p>

          <dl className="grid gap-px border border-line bg-[var(--line-strong)] text-sm sm:grid-cols-2">
            <div className="bg-background p-4">
              <dt className="t-label">Creator</dt>
              <dd className="mt-1">
                <a href={addressLink(work.creator)} target="_blank" rel="noreferrer" className="t-link">
                  {shortAddress(work.creator)}
                </a>
              </dd>
            </div>
            <div className="bg-background p-4">
              <dt className="t-label">Terms</dt>
              <dd className="mt-1">{work.terms}</dd>
            </div>
            <div className="bg-background p-4 sm:col-span-2">
              <dt className="t-label">Portfolio</dt>
              <dd className="mt-1 break-all">
                <a href={work.portfolioUrl} target="_blank" rel="noreferrer" className="t-link">
                  {work.portfolioUrl}
                </a>
              </dd>
            </div>
            <div className="bg-background p-4">
              <dt className="t-label">Claims filed</dt>
              <dd className="display-wide mt-1 text-xl">{claims ? judged.length : "—"}</dd>
            </div>
            <div className="bg-background p-4">
              <dt className="t-label">Notices issued</dt>
              <dd className="display-wide mt-1 text-xl">{claims ? noticeCount : "—"}</dd>
            </div>
          </dl>

          <section className="panel" aria-labelledby="scan-heading">
            <div className="panel-head">
              <h2 id="scan-heading" className="t-label text-foreground">
                Scan for copies
              </h2>
              <span className="t-label flex items-center gap-2">
                <span className="live-dot" aria-hidden="true" />
                Agent ready
              </span>
            </div>
            <div className="p-4">
              <ScanNowButton workId={workId} useRunId={useRunId} />
            </div>
          </section>

          <WatchlistEditor work={work} />
        </div>
      </div>

      <section className="panel mt-12" aria-labelledby="claims-heading">
        <div className="panel-head">
          <h2 id="claims-heading" className="t-label text-foreground">
            Claims
          </h2>
          <span className="t-label">Newest first</span>
        </div>
        {claimsLoading ? (
          <p className="p-4 text-muted-foreground">Loading claims…</p>
        ) : claimsError ? (
          <p className="p-4 text-destructive">{claimsError.message}</p>
        ) : (
          <ClaimsTable claims={judged} />
        )}
      </section>
    </PageShell>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { PageShell } from "@/components/PageShell";
import { addressLink, creatorShare, formatDate, formatGen, shortAddress } from "@/lib/format";
import { getContractAddress } from "@/lib/genlayer/client";
import { useLicense, useWork } from "@/lib/hooks/useLicenseHunter";

export default function LicensePage() {
  const params = useParams();
  const licenseId = parseInt(String(params.id), 10);

  const license = useLicense(licenseId);
  const work = useWork(license.data?.workId ?? 0);

  if (license.isLoading) {
    return (
      <PageShell>
        <div className="text-muted-foreground">Loading license…</div>
      </PageShell>
    );
  }

  if (!license.data) {
    return (
      <PageShell>
        <div className="text-destructive">License not found.</div>
      </PageShell>
    );
  }

  const data = license.data;
  const workTitle = work.data?.title ?? "Work";
  const creatorAmount = creatorShare(data.amount);

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <div className="glass rounded-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gradient">License #{data.id}</h1>
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Work</span>
              <span className="font-medium">{workTitle}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Licensed page</span>
              <Link href={data.pageUrl} target="_blank" rel="noreferrer" className="underline hover:text-accent">
                {new URL(data.pageUrl).hostname}
              </Link>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Licensee</span>
              <Link href={addressLink(data.licensee)} target="_blank" rel="noreferrer" className="underline">
                {shortAddress(data.licensee)}
              </Link>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount paid</span>
              <span className="font-medium">{formatGen(data.amount)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Creator's share</span>
              <span className="font-medium">{formatGen(creatorAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Issued</span>
              <span className="font-mono text-sm">{formatDate(data.issuedAt)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span className="font-mono text-sm">{formatDate(data.expiresAt)}</span>
            </div>
          </div>

          <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
            Issued by TraceMint on GenLayer Studio Next.{" "}
            <Link href={addressLink(getContractAddress())} target="_blank" rel="noreferrer" className="underline">
              View contract
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

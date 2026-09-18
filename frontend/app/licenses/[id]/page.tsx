"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { TiltCard } from "@/components/cards/Collectible";
import { LicenseFace } from "@/components/cards/LicenseCard";
import { PageShell } from "@/components/PageShell";
import { addressLink, creatorShare, formatDate, formatGen, pageLabel, shortAddress } from "@/lib/format";
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
        <p className="t-label">Loading license #{licenseId}…</p>
      </PageShell>
    );
  }

  if (!license.data) {
    return (
      <PageShell>
        <p className="text-destructive">License not found.</p>
      </PageShell>
    );
  }

  const data = license.data;
  const rows: [string, ReactNode][] = [
    [
      "Work",
      <Link key="work" href={`/works/${data.workId}`} className="t-link">
        {work.data?.title ?? `Work #${data.workId}`}
      </Link>,
    ],
    [
      "Licensed page",
      <a key="page" href={data.pageUrl} target="_blank" rel="noreferrer" className="t-link break-all">
        {pageLabel(data.pageUrl)}
      </a>,
    ],
    [
      "Licensee",
      <a key="licensee" href={addressLink(data.licensee)} target="_blank" rel="noreferrer" className="t-link">
        {shortAddress(data.licensee)}
      </a>,
    ],
    ["Amount paid", formatGen(data.amount)],
    ["Creator's share", formatGen(creatorShare(data.amount))],
    ["Issued", formatDate(data.issuedAt)],
    ["Expires", formatDate(data.expiresAt)],
    [
      "Notice",
      <Link key="notice" href={`/notices/${data.claimId}`} className="t-link">
        #{data.claimId}
      </Link>,
    ],
  ];

  return (
    <PageShell>
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="mx-auto w-full max-w-sm lg:col-span-5">
          <TiltCard max={16}>
            <LicenseFace license={data} work={work.data} />
          </TiltCard>
          <p className="t-label mt-4 text-center">Move your cursor over the license</p>
        </div>

        <div className="lg:col-span-7">
          <p className="t-label">
            <span className="t-index mr-2">Certificate</span>
            12-month license
          </p>
          <h1 className="display-condensed mt-3 text-7xl md:text-8xl">License #{data.id}</h1>

          <dl className="mt-8 divide-y divide-[var(--line)] border-y border-line text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-6 py-3">
                <dt className="t-label">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-xs text-muted-foreground">
            Issued by TraceMint on GenLayer Studio Next.{" "}
            <a href={addressLink(getContractAddress())} target="_blank" rel="noreferrer" className="t-link">
              View contract
            </a>
          </p>
        </div>
      </div>
    </PageShell>
  );
}

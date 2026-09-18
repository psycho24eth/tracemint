"use client";

import Link from "next/link";

import type { Claim, ClaimStatus } from "@/lib/contracts/LicenseHunter";
import { formatDate, formatGen, pageLabel, STATUS_LABELS, VERDICT_LABELS } from "@/lib/format";

export const STATUS_CHIPS: Record<ClaimStatus, string> = {
  NOTICE_ISSUED: "chip-signal",
  DISPUTE_REJECTED: "chip-signal",
  PAID: "chip-mint",
  WITHDRAWN: "",
  NO_NOTICE: "",
};

export default function ClaimsTable({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">No claims yet. Run a scan to look for copies.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="t-table min-w-[40rem]">
        <thead>
          <tr>
            <th>Found on</th>
            <th>Verdict</th>
            <th>Fee</th>
            <th>Status</th>
            <th>Filed</th>
            <th>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {[...claims].reverse().map((claim) => (
            <tr key={claim.id}>
              <td className="max-w-[16rem]">
                <a href={claim.pageUrl} target="_blank" rel="noreferrer" className="t-link block truncate">
                  {pageLabel(claim.pageUrl)}
                </a>
              </td>
              <td>{VERDICT_LABELS[claim.verdict]}</td>
              <td className="whitespace-nowrap">{claim.fee === 0n ? "—" : formatGen(claim.fee)}</td>
              <td>
                <span className={`chip ${STATUS_CHIPS[claim.status]}`}>{STATUS_LABELS[claim.status]}</span>
              </td>
              <td className="whitespace-nowrap text-muted-foreground">{formatDate(claim.createdAt)}</td>
              <td className="text-right">
                <Link href={`/notices/${claim.id}`} className="t-link uppercase tracking-[0.12em] text-xs">
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

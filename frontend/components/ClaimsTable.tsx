"use client";

import { Badge } from "./ui/badge";
import { formatDate, formatGen, STATUS_LABELS, txLink, VERDICT_LABELS } from "@/lib/format";
import type { Claim } from "@/lib/contracts/LicenseHunter";

export default function ClaimsTable({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) {
    return <p className="text-sm text-muted-foreground">No claims yet. Run a scan to look for copies.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>
            <th className="text-left px-2 py-2">Found on</th>
            <th className="text-left px-2 py-2">Verdict</th>
            <th className="text-left px-2 py-2">Fee</th>
            <th className="text-left px-2 py-2">Status</th>
            <th className="text-left px-2 py-2">Filed</th>
            <th className="text-left px-2 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => (
            <tr key={claim.id} className="border-b border-border hover:bg-muted/50">
              <td className="px-2 py-2">
                <a href={claim.pageUrl} target="_blank" rel="noreferrer" className="underline">
                  {new URL(claim.pageUrl).hostname}
                </a>
              </td>
              <td className="px-2 py-2">{VERDICT_LABELS[claim.verdict]}</td>
              <td className="px-2 py-2">{claim.fee === 0n ? "—" : formatGen(claim.fee)}</td>
              <td className="px-2 py-2">
                <Badge variant="secondary">{STATUS_LABELS[claim.status]}</Badge>
              </td>
              <td className="px-2 py-2">{formatDate(claim.createdAt)}</td>
              <td className="px-2 py-2">
                <a href={`/notices/${claim.id}`} className="underline">
                  Open
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { formatGen } from "@/lib/format";
import { useStats } from "@/lib/hooks/useLicenseHunter";

/** Live protocol totals from the contract's get_stats view. */
export function LiveStats() {
  const { data } = useStats();
  const items: [string, string][] = [
    ["Works", data ? String(data.works) : "—"],
    ["Copies judged", data ? String(data.claims) : "—"],
    ["Licenses", data ? String(data.licenses) : "—"],
    ["Paid to date", data ? formatGen(data.totalLicenseRevenue, 2) : "—"],
  ];

  return (
    <dl className="grid grid-cols-2 gap-px border border-line bg-[var(--line-strong)] sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="bg-background px-4 py-3">
          <dt className="t-label">{label}</dt>
          <dd className="display-wide mt-1 truncate text-lg md:text-xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

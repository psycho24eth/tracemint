import type { Claim } from "@/lib/contracts/LicenseHunter";

/** The page a copy was found on, without the ?run= id that demo scans add to force a fresh claim. */
export function copyPage(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    url.searchParams.delete("run");
    return url.toString();
  } catch {
    return pageUrl;
  }
}

/**
 * Each demo scan files a new notice for the same copy, so galleries keep only the newest notice per
 * work, page, image and status. The others stay on-chain and on each work's claims table.
 */
export function latestPerCopy(claims: Claim[]): Claim[] {
  const keyOf = (claim: Claim) => [claim.workId, copyPage(claim.pageUrl), claim.imageUrl, claim.status].join("|");
  const newest = new Map<string, Claim>();
  for (const claim of claims) {
    const kept = newest.get(keyOf(claim));
    if (!kept || claim.id > kept.id) newest.set(keyOf(claim), claim);
  }
  return claims.filter((claim) => newest.get(keyOf(claim)) === claim);
}

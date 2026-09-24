import { findCandidates, type DiscoveryOptions } from "./candidates";
import type { LicenseHunterClient, ScanSummary } from "./types";

export const MAX_CLAIMS_PER_RUN = 5;

export type ScanOptions = DiscoveryOptions & { maxClaims?: number; wait?: boolean; workIds?: number[] };

export function claimKey(workId: number, pageUrl: string, imageUrl: string): string {
  return `${workId}|${pageUrl}|${imageUrl}`;
}

export async function runScan(client: LicenseHunterClient, options: ScanOptions = {}): Promise<ScanSummary> {
  const maxClaims = options.maxClaims ?? MAX_CLAIMS_PER_RUN;
  const wait = options.wait ?? true;
  const summary: ScanSummary = {
    worksScanned: 0,
    candidates: [],
    filed: [],
    skipped: [],
    errors: [],
    examined: 0,
    pagesRead: 0,
  };

  const works = (await client.listWorks()).filter((work) => !options.workIds || options.workIds.includes(work.id));
  for (const work of works) {
    summary.worksScanned += 1;
    const known = new Set(
      (await client.listClaims(work.id)).map((claim) => claimKey(claim.workId, claim.pageUrl, claim.imageUrl)),
    );
    const { candidates, errors, examined, pagesRead } = await findCandidates(work, options);
    summary.errors.push(...errors);
    summary.examined += examined;
    summary.pagesRead += pagesRead;

    for (const candidate of candidates) {
      summary.candidates.push(candidate);
      const key = claimKey(candidate.workId, candidate.pageUrl, candidate.imageUrl);
      if (known.has(key) || summary.filed.length >= maxClaims) {
        summary.skipped.push(candidate);
        continue;
      }
      known.add(key);
      try {
        const result = await client.fileClaim(candidate.workId, candidate.pageUrl, candidate.imageUrl, { wait });
        summary.filed.push({ ...candidate, ...result });
      } catch (error) {
        summary.errors.push(`work ${work.id}: filing ${candidate.imageUrl}: ${(error as Error).message}`);
      }
    }
  }

  return summary;
}

import { extractImageUrls } from "./html";
import { fetchImage, fetchText } from "./http";
import { differenceHash, hammingDistance, MATCH_THRESHOLD } from "./phash";
import type { Candidate, FetchLike, Work } from "./types";
import { toHttps, withRunId } from "./urls";

export type DiscoveryOptions = { fetchFn?: FetchLike; runId?: string; threshold?: number };
export type DiscoveryResult = {
  candidates: Candidate[];
  errors: string[];
  /** Images fetched and compared. A scan that matches nothing still did this much work. */
  examined: number;
  /** Watched pages whose HTML was read. Fewer than the watchlist means some could not be loaded. */
  pagesRead: number;
};

export async function findCandidates(work: Work, options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const threshold = options.threshold ?? MATCH_THRESHOLD;
  const candidates: Candidate[] = [];
  const errors: string[] = [];
  let examined = 0;
  let pagesRead = 0;
  const fail = (message: string) => errors.push(`work ${work.id}: ${message}`);

  let referenceHash: bigint;
  try {
    referenceHash = await differenceHash(await fetchImage(toHttps(work.imageUrl), fetchFn));
  } catch (error) {
    fail(`reference image: ${(error as Error).message}`);
    return { candidates, errors, examined, pagesRead };
  }

  const checkImage = async (pageUrl: string, imageUrl: string) => {
    try {
      const distance = hammingDistance(referenceHash, await differenceHash(await fetchImage(imageUrl, fetchFn)));
      // Counted only once a distance exists: an image we could not load was not examined, it failed.
      examined += 1;
      if (distance <= threshold) candidates.push({ workId: work.id, pageUrl, imageUrl, distance });
    } catch (error) {
      fail((error as Error).message);
    }
  };

  for (const watchUrl of work.watchUrls) {
    const pageUrl = withRunId(toHttps(watchUrl), options.runId);
    let imageUrls: string[];
    try {
      imageUrls = extractImageUrls(await fetchText(pageUrl, fetchFn), pageUrl);
      pagesRead += 1;
    } catch (error) {
      fail((error as Error).message);
      continue;
    }
    for (const imageUrl of imageUrls) {
      await checkImage(pageUrl, imageUrl);
    }
  }

  return { candidates, errors, examined, pagesRead };
}

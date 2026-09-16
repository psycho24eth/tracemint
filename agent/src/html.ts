import { load } from "cheerio";

import { resolveUrl } from "./urls";

export const MAX_IMAGES_PER_PAGE = 50;

const META_IMAGE_SELECTOR = [
  'meta[property="og:image"]',
  'meta[name="og:image"]',
  'meta[name="twitter:image"]',
  'meta[property="twitter:image"]',
].join(", ");

function largestSrcsetCandidate(srcset: string | undefined): string | undefined {
  if (!srcset) return undefined;
  let best: { url: string; size: number } | undefined;
  for (const entry of srcset.split(",")) {
    const [url, descriptor = "1x"] = entry.trim().split(/\s+/);
    if (!url) continue;
    const size = Number.parseFloat(descriptor) || 1;
    if (!best || size > best.size) best = { url, size };
  }
  return best?.url;
}

export function extractImageUrls(html: string, pageUrl: string, limit = MAX_IMAGES_PER_PAGE): string[] {
  const $ = load(html);
  const found: string[] = [];
  const add = (reference: string | undefined) => {
    if (!reference) return;
    const resolved = resolveUrl(pageUrl, reference);
    if (resolved && !found.includes(resolved)) found.push(resolved);
  };

  $(META_IMAGE_SELECTOR).each((_, element) => add($(element).attr("content")));
  $("img").each((_, element) => {
    add(largestSrcsetCandidate($(element).attr("srcset")));
    add($(element).attr("src"));
  });
  $("source[srcset]").each((_, element) => add(largestSrcsetCandidate($(element).attr("srcset"))));

  return found.slice(0, limit);
}

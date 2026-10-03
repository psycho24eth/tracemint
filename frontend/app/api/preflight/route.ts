import {
  imageCheck,
  MAX_IMAGE_BYTES,
  portfolioCheck,
  visibleText,
  type Check,
  type PreflightResult,
} from "@/lib/preflight";
import { createKeyedRateLimiter } from "@/lib/server/rate-limit";
import { fetchPublicUrl, type FetchFailure, type FetchSuccess } from "@/lib/server/safe-fetch";

/** node:dns is needed to keep a user-supplied URL off the private network. */
export const runtime = "nodejs";

// Enough HTML to hold the 50,000 characters of rendered text the contract reads.
const PORTFOLIO_FETCH_BYTES = 600_000;

// The register form re-checks the ownership page every 10 seconds while someone edits it, so a visitor
// needs room for that and a few presses of Check now. Each check fetches a page, so it is still capped.
const tryCheck = createKeyedRateLimiter(30, 60_000);

type Body = { address?: unknown; portfolioUrl?: unknown; imageUrl?: unknown };

const isAddress = (value: unknown): value is string => typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
const isUrl = (value: unknown): value is string => typeof value === "string" && value.startsWith("https://");
const given = (value: unknown) => value !== undefined && value !== null && value !== "";

/** The first hop is the visitor: Vercel sets this header itself, so it cannot be spoofed from outside. */
const visitor = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

export async function POST(request: Request) {
  if (!tryCheck(visitor(request))) {
    return Response.json({ error: "That is a lot of checks in a minute. Wait a moment, then check again." }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  // Either check can run alone: the ownership page is checked live while someone edits it, the image when they ask.
  const { address, portfolioUrl, imageUrl } = body;
  const wantsOwnership = given(portfolioUrl);
  const wantsImage = given(imageUrl);
  if (!wantsOwnership && !wantsImage) {
    return Response.json({ error: "Send a page to check for your address, an image URL, or both." }, { status: 400 });
  }
  if (wantsOwnership && !isAddress(address)) {
    return Response.json({ error: "A wallet address is needed to check the portfolio page." }, { status: 400 });
  }
  if (wantsOwnership && !isUrl(portfolioUrl)) {
    return Response.json({ error: "The portfolio URL must start with https://." }, { status: 400 });
  }
  if (wantsImage && !isUrl(imageUrl)) {
    return Response.json({ error: "The image URL must start with https://." }, { status: 400 });
  }

  const [portfolio, image] = await Promise.all([
    wantsOwnership ? fetchPublicUrl(portfolioUrl as string, PORTFOLIO_FETCH_BYTES) : null,
    // One byte over the contract's ceiling is enough to know the file is too big.
    wantsImage ? fetchPublicUrl(imageUrl as string, MAX_IMAGE_BYTES + 1) : null,
  ]);

  const checks: Check[] = [];
  if (portfolio) checks.push(ownershipVerdict(portfolio, address as string));
  if (image) checks.push(imageVerdict(image));

  const result: PreflightResult = { checks };
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

function ownershipVerdict(portfolio: FetchSuccess | FetchFailure, address: string): Check {
  if (!portfolio.ok) {
    return {
      name: "Ownership proof",
      verdict: "fail",
      detail: portfolio.reason,
      fix: "The contract has to load this page to find your address on it, so it must be reachable without signing in.",
    };
  }
  if (portfolio.status >= 400) {
    return {
      name: "Ownership proof",
      verdict: "fail",
      detail: `The portfolio page answered ${portfolio.status}.`,
      fix: "Use a page that opens for anyone, with nothing signed in.",
    };
  }
  return portfolioCheck({ text: visibleText(portfolio.body), address, truncated: portfolio.truncated });
}

function imageVerdict(image: FetchSuccess | FetchFailure): Check {
  if (!image.ok) {
    return {
      name: "Image URL",
      verdict: "fail",
      detail: image.reason,
      fix: "Validators load this URL themselves, so it has to be reachable without signing in.",
    };
  }
  return imageCheck({ status: image.status, contentType: image.contentType, bytes: image.bytes, truncated: image.truncated });
}

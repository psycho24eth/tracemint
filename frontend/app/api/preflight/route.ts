import {
  imageCheck,
  MAX_IMAGE_BYTES,
  portfolioCheck,
  visibleText,
  type Check,
  type PreflightResult,
} from "@/lib/preflight";
import { fetchPublicUrl } from "@/lib/server/safe-fetch";

/** node:dns is needed to keep a user-supplied URL off the private network. */
export const runtime = "nodejs";

// Enough HTML to hold the 50,000 characters of rendered text the contract reads.
const PORTFOLIO_FETCH_BYTES = 600_000;

type Body = { address?: unknown; portfolioUrl?: unknown; imageUrl?: unknown };

const isAddress = (value: unknown): value is string => typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
const isUrl = (value: unknown): value is string => typeof value === "string" && value.startsWith("https://");

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  const { address, portfolioUrl, imageUrl } = body;
  if (!isAddress(address)) {
    return Response.json({ error: "A wallet address is needed to check the portfolio page." }, { status: 400 });
  }
  if (!isUrl(portfolioUrl)) {
    return Response.json({ error: "The portfolio URL must start with https://." }, { status: 400 });
  }
  if (!isUrl(imageUrl)) {
    return Response.json({ error: "The image URL must start with https://." }, { status: 400 });
  }

  const [portfolio, image] = await Promise.all([
    fetchPublicUrl(portfolioUrl, PORTFOLIO_FETCH_BYTES),
    // One byte over the contract's ceiling is enough to know the file is too big.
    fetchPublicUrl(imageUrl, MAX_IMAGE_BYTES + 1),
  ]);

  const checks: Check[] = [];

  if (!portfolio.ok) {
    checks.push({
      name: "Ownership proof",
      verdict: "fail",
      detail: portfolio.reason,
      fix: "The contract has to load this page to find your address on it, so it must be reachable without signing in.",
    });
  } else if (portfolio.status >= 400) {
    checks.push({
      name: "Ownership proof",
      verdict: "fail",
      detail: `The portfolio page answered ${portfolio.status}.`,
      fix: "Use a page that opens for anyone, with nothing signed in.",
    });
  } else {
    checks.push(
      portfolioCheck({
        text: visibleText(portfolio.body),
        address,
        truncated: portfolio.truncated,
      }),
    );
  }

  if (!image.ok) {
    checks.push({
      name: "Image URL",
      verdict: "fail",
      detail: image.reason,
      fix: "Validators load this URL themselves, so it has to be reachable without signing in.",
    });
  } else {
    checks.push(
      imageCheck({
        status: image.status,
        contentType: image.contentType,
        bytes: image.bytes,
        truncated: image.truncated,
      }),
    );
  }

  const result: PreflightResult = { checks };
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

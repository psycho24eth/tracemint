/**
 * The two things register_work checks before it will accept a work, mirrored so the answer arrives
 * before the fee does. The contract's own gate is `_verify_portfolio`, which renders the portfolio
 * page to text and requires the creator's lowercase address to appear in the first
 * MAX_PORTFOLIO_CHARS of it.
 */

/** contracts/license_hunter.py: MAX_PORTFOLIO_CHARS */
export const PORTFOLIO_TEXT_LIMIT = 50_000;
/** contracts/license_hunter.py: MAX_IMAGE_BYTES */
export const MAX_IMAGE_BYTES = 5_000_000;

export type CheckVerdict = "pass" | "fail" | "warn";

export type Check = {
  name: string;
  verdict: CheckVerdict;
  detail: string;
  /** What to change, when there is something to change. */
  fix?: string;
};

export type PreflightResult = { checks: Check[] };

/**
 * Approximates `gl.nondet.web.render(url, mode="text")`. The contract sees what a browser would
 * paint, so script, style and markup are dropped rather than searched — an address hidden in an
 * HTML attribute does not count for the contract and must not count here either.
 */
export function visibleText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

/** The contract's test, character for character: lowercase needle in the lowercased rendered text. */
export function addressAppears(text: string, address: string): boolean {
  return text.toLowerCase().includes(address.toLowerCase());
}

export function portfolioCheck(options: { text: string; address: string; truncated: boolean }): Check {
  const found = addressAppears(options.text.slice(0, PORTFOLIO_TEXT_LIMIT), options.address);
  if (found) {
    return {
      name: "Ownership proof",
      verdict: "pass",
      detail: "Your wallet address is in the text of this page, so the contract's ownership check will pass.",
    };
  }
  return {
    name: "Ownership proof",
    verdict: "fail",
    detail: options.truncated
      ? `Your wallet address is not in the first ${PORTFOLIO_TEXT_LIMIT.toLocaleString()} characters of this page, which is all the contract reads.`
      : "Your wallet address does not appear anywhere in the text of this page.",
    fix: "Paste the address into text a visitor can actually see — a bio line, a caption, a footer. It has to be a page you can edit, so someone else's gallery or stock-photo listing will not work.",
  };
}

export function imageCheck(options: { status: number; contentType: string; bytes: number; truncated: boolean }): Check {
  const { status, contentType, bytes, truncated } = options;

  if (status >= 400) {
    return {
      name: "Image URL",
      verdict: "fail",
      detail: `The image URL answered ${status}, so validators will not be able to load it.`,
      fix: "Use a link that opens the image directly in a browser with nothing signed in.",
    };
  }

  if (bytes === 0) {
    return {
      name: "Image URL",
      verdict: "fail",
      detail: "The image URL returned an empty response.",
      fix: "Check the link opens the image on its own.",
    };
  }

  // The caller reads one byte past the ceiling, so a truncated read means the file is over it —
  // guarding this on `!truncated` let an oversized file pass here and fail on chain instead.
  if (truncated || bytes > MAX_IMAGE_BYTES) {
    return {
      name: "Image URL",
      verdict: "fail",
      detail: truncated
        ? `The file is larger than the ${MAX_IMAGE_BYTES / 1_000_000} MB the contract accepts.`
        : `The file is ${(bytes / 1_000_000).toFixed(1)} MB, over the ${MAX_IMAGE_BYTES / 1_000_000} MB the contract accepts.`,
      fix: "Link a smaller copy of the same image.",
    };
  }

  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type.startsWith("image/")) {
    return { name: "Image URL", verdict: "pass", detail: `Serves an image (${type}).` };
  }

  // The contract screenshots whatever the URL renders, so a page still registers — it just
  // compares badly, because the screenshot is the whole page rather than the artwork.
  return {
    name: "Image URL",
    verdict: "warn",
    detail: `This serves ${type || "something that is not an image"}, so it looks like a web page rather than an image file. Registration will still work, but validators compare a screenshot of the whole page, which makes a match much less reliable.`,
    fix: "Right-click the artwork, copy the image address, and use that instead of the page it sits on.",
  };
}

/** Registration is only blocked by a real failure; a warning is the creator's call. */
export function blocking(checks: Check[]): Check[] {
  return checks.filter((check) => check.verdict === "fail");
}

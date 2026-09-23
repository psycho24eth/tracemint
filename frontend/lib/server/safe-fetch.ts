import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetching a URL a visitor typed means our server will connect wherever they point it, so every
 * request goes through here: https only, public addresses only, capped and timed out. Without the
 * address check a form field becomes a way to probe the metadata service and anything else on the
 * private network.
 */

export type FetchFailure = { ok: false; reason: string };
export type FetchSuccess = {
  ok: true;
  status: number;
  contentType: string;
  bytes: number;
  body: string;
  truncated: boolean;
};

const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/** Ranges that must never be reachable from a user-supplied URL. */
function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    // Unique-local (fc00::/7) and link-local (fe80::/10).
    if (/^f[cd]/.test(lower) || /^fe[89ab]/.test(lower)) return true;
    // IPv4 mapped into IPv6, e.g. ::ffff:169.254.169.254.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, which is where cloud metadata lives
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast and reserved
  return false;
}

async function resolvesToPublicAddress(host: string): Promise<boolean> {
  // URL.hostname keeps the brackets on an IPv6 literal, which isIP does not recognise.
  const hostname = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (isIP(hostname)) return !isPrivateAddress(hostname);
  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    // Every answer must be public: one private hop is enough to reach the private network.
    return addresses.length > 0 && addresses.every((entry) => !isPrivateAddress(entry.address));
  } catch {
    return false;
  }
}

function parseHttpsUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  return url.protocol === "https:" ? url : null;
}

/**
 * Fetches a public https URL and returns at most `maxBytes` of it as text. Redirects are followed
 * by hand so each hop's host is checked too — otherwise a public URL could redirect inward.
 */
export async function fetchPublicUrl(raw: string, maxBytes: number): Promise<FetchSuccess | FetchFailure> {
  let target = parseHttpsUrl(raw);
  if (!target) return { ok: false, reason: "The URL must be a valid https:// address." };

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!(await resolvesToPublicAddress(target.hostname))) {
      return { ok: false, reason: `${target.hostname} is not a public address we can reach.` };
    }

    let response: Response;
    try {
      response = await fetch(target.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          // Some hosts serve a different page, or none, to an unknown client.
          "User-Agent": "TraceMint-Preflight/1.0 (+https://tracemint.vercel.app)",
          Accept: "text/html,application/xhtml+xml,image/*;q=0.8,*/*;q=0.5",
        },
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return { ok: false, reason: timedOut ? "The page took too long to answer." : "The page could not be reached." };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { ok: false, reason: `The page answered ${response.status} with nowhere to go.` };
      const next = parseHttpsUrl(new URL(location, target).toString());
      if (!next) return { ok: false, reason: "The page redirected somewhere that is not https." };
      target = next;
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const { text, bytes, truncated } = await readCapped(response, maxBytes);
    return { ok: true, status: response.status, contentType, bytes, body: text, truncated };
  }

  return { ok: false, reason: "The page redirected too many times." };
}

/** Reads the body up to a cap, so a huge or endless response cannot exhaust the function. */
async function readCapped(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) return { text: "", bytes: 0, truncated: false };

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;

  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    bytes += value.byteLength;
    chunks.push(value);
    if (bytes >= maxBytes) {
      truncated = true;
      break;
    }
  }
  await reader.cancel().catch(() => {});

  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(joined), bytes, truncated };
}

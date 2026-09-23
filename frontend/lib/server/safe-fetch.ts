import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

/**
 * Fetching a URL a visitor typed means our server will connect wherever they point it, so every
 * request goes through here: https only, public addresses only, capped and timed out. Without the
 * address check a form field becomes a way to probe the metadata service and anything else on the
 * private network.
 *
 * Checking the address and then calling fetch() would not be enough: fetch resolves the hostname
 * again, so a name that answered with a public address for the check can answer with a private one
 * a moment later (DNS rebinding). Instead the socket is pinned to the address that was vetted, and
 * the hostname is carried in SNI and the Host header so TLS still validates against it.
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
const USER_AGENT = "TraceMint-Preflight/1.0 (+https://tracemint.vercel.app)";

/** Ranges that must never be reachable from a user-supplied URL. */
export function isPrivateAddress(address: string): boolean {
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

/** Strips the brackets URL.hostname keeps on an IPv6 literal, which isIP does not recognise. */
const bare = (host: string) => (host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host);

/**
 * The one address we will connect to for this host, or null if any answer is private. Every answer
 * has to be public: a name that resolves to both a public and a private address must not be usable.
 */
async function vettedAddress(host: string): Promise<string | null> {
  const hostname = bare(host);
  if (isIP(hostname)) return isPrivateAddress(hostname) ? null : hostname;

  try {
    const answers = await lookup(hostname, { all: true, verbatim: true });
    if (answers.length === 0) return null;
    if (answers.some((entry) => isPrivateAddress(entry.address))) return null;
    return answers[0].address;
  } catch {
    return null;
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

type Hop =
  | { kind: "response"; status: number; contentType: string; bytes: number; body: string; truncated: boolean }
  | { kind: "redirect"; status: number; location: string | null }
  | { kind: "error"; reason: string };

/** One request, to a pinned address, reading at most maxBytes of the body. */
function requestOnce(target: URL, address: string, maxBytes: number): Promise<Hop> {
  return new Promise((resolve) => {
    const hostname = bare(target.hostname);
    let settled = false;
    const finish = (hop: Hop) => {
      if (!settled) {
        settled = true;
        resolve(hop);
      }
    };

    const call = httpsRequest(
      {
        // Connect to the address we vetted, not to whatever DNS says next.
        host: address,
        port: target.port ? Number(target.port) : 443,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        // TLS is validated against the real hostname, so a pinned IP stays safe.
        servername: hostname,
        headers: {
          Host: target.host,
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,image/*;q=0.8,*/*;q=0.5",
          "Accept-Encoding": "identity",
        },
        timeout: TIMEOUT_MS,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          response.destroy();
          const location = response.headers.location;
          finish({ kind: "redirect", status, location: typeof location === "string" ? location : null });
          return;
        }

        const chunks: Buffer[] = [];
        let bytes = 0;
        let truncated = false;

        response.on("data", (chunk: Buffer) => {
          if (truncated) return;
          bytes += chunk.byteLength;
          chunks.push(chunk);
          if (bytes >= maxBytes) {
            truncated = true;
            response.destroy();
          }
        });
        const done = () =>
          finish({
            kind: "response",
            status,
            contentType: (response.headers["content-type"] as string | undefined) ?? "",
            bytes,
            body: Buffer.concat(chunks).toString("utf8"),
            truncated,
          });
        response.on("end", done);
        // A destroy after the cap still counts as a read, not a failure.
        response.on("close", done);
        response.on("error", () => finish({ kind: "error", reason: "The page stopped sending data." }));
      },
    );

    call.on("timeout", () => {
      call.destroy();
      finish({ kind: "error", reason: "The page took too long to answer." });
    });
    call.on("error", () => finish({ kind: "error", reason: "The page could not be reached." }));
    call.end();
  });
}

/**
 * Fetches a public https URL and returns at most `maxBytes` of it as text. Redirects are followed by
 * hand so each hop's host is vetted and pinned too — otherwise a public URL could redirect inward.
 */
export async function fetchPublicUrl(raw: string, maxBytes: number): Promise<FetchSuccess | FetchFailure> {
  let target = parseHttpsUrl(raw);
  if (!target) return { ok: false, reason: "The URL must be a valid https:// address." };

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const address = await vettedAddress(target.hostname);
    if (!address) {
      return { ok: false, reason: `${bare(target.hostname)} is not a public address we can reach.` };
    }

    const result = await requestOnce(target, address, maxBytes);

    if (result.kind === "error") return { ok: false, reason: result.reason };

    if (result.kind === "redirect") {
      if (!result.location) return { ok: false, reason: `The page answered ${result.status} with nowhere to go.` };
      const next = parseHttpsUrl(new URL(result.location, target).toString());
      if (!next) return { ok: false, reason: "The page redirected somewhere that is not https." };
      target = next;
      continue;
    }

    return {
      ok: true,
      status: result.status,
      contentType: result.contentType,
      bytes: result.bytes,
      body: result.body,
      truncated: result.truncated,
    };
  }

  return { ok: false, reason: "The page redirected too many times." };
}

const PRIVATE_HOSTS = [
  /^localhost$/,
  /^0\./,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[::1?\]$/,
  /^\[f[cd][0-9a-f]{2}:/,
  /^\[fe80:/,
];

export function toHttps(url: string): string {
  if (!url.startsWith("ipfs://")) return url;
  return `https://ipfs.io/ipfs/${url.slice("ipfs://".length).replace(/^ipfs\//, "")}`;
}

export function isSafeHttpsUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  return !PRIVATE_HOSTS.some((pattern) => pattern.test(host));
}

export function resolveUrl(base: string, reference: string): string | null {
  const trimmed = reference.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  try {
    return new URL(toHttps(trimmed), base).toString();
  } catch {
    return null;
  }
}

export function withRunId(url: string, runId?: string): string {
  if (!runId) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("run", runId);
  return parsed.toString();
}

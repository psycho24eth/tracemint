import type { FetchLike } from "./types";
import { isSafeHttpsUrl } from "./urls";

export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_IMAGE_BYTES = 5_000_000;
export const MAX_PAGE_BYTES = 2_000_000;

const USER_AGENT = "LicenseHunterAgent/0.1 (+https://github.com/psycho24eth)";

export class FetchError extends Error {}

async function request(url: string, fetchFn: FetchLike): Promise<Response> {
  if (!isSafeHttpsUrl(url)) {
    throw new FetchError(`Refusing to fetch ${url}: only public https URLs are allowed`);
  }
  let response: Response;
  try {
    response = await fetchFn(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT },
    });
  } catch (error) {
    throw new FetchError(`Could not load ${url}: ${(error as Error).message}`);
  }
  if (!response.ok) throw new FetchError(`${url} returned ${response.status}`);
  if (response.url && response.url !== url && !isSafeHttpsUrl(response.url)) {
    throw new FetchError(`${url} redirected to a disallowed address`);
  }
  return response;
}

async function readLimited(response: Response, maxBytes: number, url: string): Promise<Uint8Array> {
  const tooLarge = () => new FetchError(`${url} is larger than ${maxBytes} bytes`);
  if (Number(response.headers.get("content-length") ?? "0") > maxBytes) throw tooLarge();
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function fetchText(url: string, fetchFn: FetchLike = fetch): Promise<string> {
  const response = await request(url, fetchFn);
  return new TextDecoder().decode(await readLimited(response, MAX_PAGE_BYTES, url));
}

export async function fetchImage(url: string, fetchFn: FetchLike = fetch): Promise<Uint8Array> {
  const response = await request(url, fetchFn);
  return readLimited(response, MAX_IMAGE_BYTES, url);
}

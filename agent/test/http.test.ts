import { describe, expect, it, vi } from "vitest";

import { FetchError, MAX_IMAGE_BYTES, fetchImage, fetchText } from "../src/http";

function fakeFetch(body: BodyInit | null, init: ResponseInit = {}) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, init));
}

describe("fetchText", () => {
  it("returns the page body", async () => {
    await expect(fetchText("https://shop.example.com/p", fakeFetch("<p>hi</p>"))).resolves.toBe("<p>hi</p>");
  });

  it("sends a timeout signal and a user agent", async () => {
    const fetchFn = fakeFetch("ok");
    await fetchText("https://shop.example.com/p", fetchFn);
    const init = fetchFn.mock.calls[0][1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).get("user-agent")).toContain("LicenseHunterAgent");
  });

  it("refuses unsafe URLs without calling fetch", async () => {
    const fetchFn = fakeFetch("ok");
    await expect(fetchText("http://shop.example.com/p", fetchFn)).rejects.toThrow(FetchError);
    await expect(fetchText("https://192.168.0.1/p", fetchFn)).rejects.toThrow("only public https URLs are allowed");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("reports HTTP errors", async () => {
    await expect(fetchText("https://shop.example.com/missing", fakeFetch("nope", { status: 404 }))).rejects.toThrow(
      "https://shop.example.com/missing returned 404",
    );
  });

  it("wraps network failures", async () => {
    const failing = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
      throw new TypeError("fetch failed");
    });
    await expect(fetchText("https://shop.example.com/p", failing)).rejects.toThrow(
      "Could not load https://shop.example.com/p: fetch failed",
    );
  });
});

describe("fetchImage", () => {
  it("returns the image bytes", async () => {
    const bytes = await fetchImage("https://cdn.example.com/a.png", fakeFetch(new Uint8Array([1, 2, 3])));
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("rejects a declared size over the cap", async () => {
    const fetchFn = fakeFetch("x", { headers: { "content-length": String(MAX_IMAGE_BYTES + 1) } });
    await expect(fetchImage("https://cdn.example.com/big.png", fetchFn)).rejects.toThrow("larger than 5000000 bytes");
  });

  it("rejects an undeclared body over the cap", async () => {
    const fetchFn = fakeFetch(new Uint8Array(MAX_IMAGE_BYTES + 1));
    await expect(fetchImage("https://cdn.example.com/big.png", fetchFn)).rejects.toThrow("larger than 5000000 bytes");
  });
});

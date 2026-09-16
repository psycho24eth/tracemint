import { describe, expect, it } from "vitest";

import { isSafeHttpsUrl, resolveUrl, toHttps, withRunId } from "../src/urls";

describe("isSafeHttpsUrl", () => {
  it.each([
    "https://shop.example.com/products/hoodie",
    "https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  ])("accepts %s", (url) => {
    expect(isSafeHttpsUrl(url)).toBe(true);
  });

  it.each([
    "http://shop.example.com/page",
    "ftp://files.example.com/a.png",
    "https://localhost/admin",
    "https://127.0.0.1/",
    "https://10.1.2.3/",
    "https://172.20.0.5/",
    "https://192.168.1.10/",
    "https://169.254.169.254/latest/meta-data",
    "https://0.0.0.0/",
    "https://[::1]/",
    "https://[fd12:3456::1]/",
    "https://user:secret@example.com/",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isSafeHttpsUrl(url)).toBe(false);
  });
});

describe("toHttps", () => {
  it("rewrites ipfs links to the ipfs.io gateway", () => {
    expect(toHttps("ipfs://bafyexample/art/cat.png")).toBe("https://ipfs.io/ipfs/bafyexample/art/cat.png");
    expect(toHttps("ipfs://ipfs/bafyexample")).toBe("https://ipfs.io/ipfs/bafyexample");
  });

  it("leaves other URLs unchanged", () => {
    expect(toHttps("https://a.example/x.png")).toBe("https://a.example/x.png");
  });
});

describe("resolveUrl", () => {
  const page = "https://shop.example.com/products/hoodie";

  it("resolves relative and root-relative references against the page", () => {
    expect(resolveUrl(page, "img/banner.png")).toBe("https://shop.example.com/products/img/banner.png");
    expect(resolveUrl(page, "/static/banner.png")).toBe("https://shop.example.com/static/banner.png");
  });

  it("keeps absolute URLs and rewrites ipfs references", () => {
    expect(resolveUrl(page, "https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(resolveUrl(page, "ipfs://bafyexample/a.png")).toBe("https://ipfs.io/ipfs/bafyexample/a.png");
  });

  it("skips empty references and inline data images", () => {
    expect(resolveUrl(page, "  ")).toBeNull();
    expect(resolveUrl(page, "data:image/png;base64,AAAA")).toBeNull();
  });
});

describe("withRunId", () => {
  it("adds a run parameter", () => {
    expect(withRunId("https://site.example/demo/shop", "abc123")).toBe("https://site.example/demo/shop?run=abc123");
  });

  it("keeps existing query parameters", () => {
    expect(withRunId("https://site.example/demo/shop?lang=en", "r1")).toBe("https://site.example/demo/shop?lang=en&run=r1");
  });

  it("returns the URL unchanged without a run id", () => {
    expect(withRunId("https://site.example/demo/shop")).toBe("https://site.example/demo/shop");
  });
});

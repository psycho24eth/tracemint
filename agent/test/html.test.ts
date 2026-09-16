import { describe, expect, it } from "vitest";

import { extractImageUrls } from "../src/html";

const PAGE = "https://shop.example.com/products/hoodie";

describe("extractImageUrls", () => {
  it("collects meta images, img src, and the largest srcset candidates", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://cdn.example.com/og.png">
        <meta name="twitter:image" content="/static/twitter.png">
      </head><body>
        <img src="/img/hero-small.png" srcset="/img/hero-400.png 400w, /img/hero-1200.png 1200w">
        <img src="thumbs/cat.jpg">
        <picture><source srcset="/img/pic-1x.webp 1x, /img/pic-2x.webp 2x"><img src="/img/pic.png"></picture>
      </body></html>`;

    expect(extractImageUrls(html, PAGE)).toEqual([
      "https://cdn.example.com/og.png",
      "https://shop.example.com/static/twitter.png",
      "https://shop.example.com/img/hero-1200.png",
      "https://shop.example.com/img/hero-small.png",
      "https://shop.example.com/products/thumbs/cat.jpg",
      "https://shop.example.com/img/pic.png",
      "https://shop.example.com/img/pic-2x.webp",
    ]);
  });

  it("removes duplicates and inline data images", () => {
    const html = `<img src="/a.png"><img src="/a.png"><img src="data:image/png;base64,AAAA">`;
    expect(extractImageUrls(html, PAGE)).toEqual(["https://shop.example.com/a.png"]);
  });

  it("rewrites ipfs images", () => {
    expect(extractImageUrls(`<img src="ipfs://bafyexample/art.png">`, PAGE)).toEqual([
      "https://ipfs.io/ipfs/bafyexample/art.png",
    ]);
  });

  it("caps the number of images per page", () => {
    const html = Array.from({ length: 60 }, (_, i) => `<img src="/img/${i}.png">`).join("");
    const urls = extractImageUrls(html, PAGE);
    expect(urls).toHaveLength(50);
    expect(urls[0]).toBe("https://shop.example.com/img/0.png");
  });

  it("returns nothing for a page without images", () => {
    expect(extractImageUrls("<p>No pictures here</p>", PAGE)).toEqual([]);
  });
});

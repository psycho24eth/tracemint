import { describe, expect, it } from "vitest";

import { findCandidates } from "../src/candidates";
import type { FetchLike, Work } from "../src/types";
import { cropEachSide, resize, scene } from "./images";

function routes(table: Record<string, () => Response | Promise<Response>>): FetchLike {
  return async (url) => (table[url] ? await table[url]() : new Response("not found", { status: 404 }));
}

const WORK: Work = {
  id: 1,
  creator: "0x0000000000000000000000000000000000000001",
  title: "Cybernetic Horizon",
  imageUrl: "https://art.example.com/original.png",
  watchUrls: ["https://shop.example.com/products/hoodie", "https://blog.example.com/post"],
};

describe("findCandidates", () => {
  it("finds an edited copy on a watched page and ignores unrelated images", async () => {
    const original = await scene("artwork");
    const copy = await resize(await cropEachSide(original, 0.05), 480, 360);
    const unrelated = await scene("stripes");
    const fetchFn = routes({
      "https://art.example.com/original.png": () => new Response(new Uint8Array(original)),
      "https://shop.example.com/products/hoodie": () => new Response(`<img src="/banner.png"><img src="/logo.png">`),
      "https://shop.example.com/banner.png": () => new Response(new Uint8Array(copy)),
      "https://shop.example.com/logo.png": () => new Response(new Uint8Array(unrelated)),
      "https://blog.example.com/post": () => new Response("<p>no images</p>"),
    });

    const result = await findCandidates(WORK, { fetchFn });

    expect(result.errors).toEqual([]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      workId: 1,
      pageUrl: "https://shop.example.com/products/hoodie",
      imageUrl: "https://shop.example.com/banner.png",
    });
    expect(result.candidates[0].distance).toBeLessThanOrEqual(10);
  });

  it("adds the run id to watched page URLs", async () => {
    const original = await scene("artwork");
    const fetchFn = routes({
      "https://art.example.com/original.png": () => new Response(new Uint8Array(original)),
      "https://shop.example.com/products/hoodie?run=r42": () => new Response(`<img src="https://cdn.example.com/copy.png">`),
      "https://cdn.example.com/copy.png": () => new Response(new Uint8Array(original)),
      "https://blog.example.com/post?run=r42": () => new Response(""),
    });

    const result = await findCandidates(WORK, { fetchFn, runId: "r42" });

    expect(result.candidates.map((candidate) => candidate.pageUrl)).toEqual([
      "https://shop.example.com/products/hoodie?run=r42",
    ]);
  });

  it("keeps scanning after a page or an image fails", async () => {
    const original = await scene("artwork");
    const fetchFn = routes({
      "https://art.example.com/original.png": () => new Response(new Uint8Array(original)),
      "https://shop.example.com/products/hoodie": () => new Response(`<img src="/broken.png"><img src="/copy.png">`),
      "https://shop.example.com/copy.png": () => new Response(new Uint8Array(original)),
    });

    const result = await findCandidates(WORK, { fetchFn });

    expect(result.candidates.map((candidate) => candidate.imageUrl)).toEqual(["https://shop.example.com/copy.png"]);
    expect(result.errors).toEqual([
      "work 1: https://shop.example.com/broken.png returned 404",
      "work 1: https://blog.example.com/post returned 404",
    ]);
  });

  it("reports an unreachable reference image and stops", async () => {
    const result = await findCandidates(WORK, { fetchFn: routes({}) });

    expect(result.candidates).toEqual([]);
    expect(result.errors).toEqual(["work 1: reference image: https://art.example.com/original.png returned 404"]);
  });
});

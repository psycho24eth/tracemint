import { describe, expect, it } from "vitest";

import { MAX_CLAIMS_PER_RUN, runScan } from "../src/scan";
import type { Claim, FetchLike, LicenseHunterClient, Work } from "../src/types";
import { scene } from "./images";

const ART = "https://art.example.com/original.png";
const PAGE = "https://shop.example.com/products/hoodie";

const work = (id: number): Work => ({
  id,
  creator: "0x0000000000000000000000000000000000000001",
  title: `Work ${id}`,
  imageUrl: ART,
  watchUrls: [PAGE],
});

function fakeClient(works: Work[], claims: Claim[] = [], failOnImage?: string) {
  const filed: Array<{ workId: number; pageUrl: string; imageUrl: string; wait: boolean }> = [];
  const client: LicenseHunterClient = {
    listWorks: async () => works,
    listClaims: async (workId) => claims.filter((claim) => claim.workId === workId),
    fileClaim: async (workId, pageUrl, imageUrl, { wait }) => {
      if (imageUrl === failOnImage) throw new Error("validators could not agree");
      filed.push({ workId, pageUrl, imageUrl, wait });
      return { txHash: `0xtx${filed.length}`, ok: wait ? true : null };
    },
  };
  return { client, filed };
}

async function pageWithCopies(count: number): Promise<FetchLike> {
  const original = await scene("artwork");
  const html = Array.from({ length: count }, (_, i) => `<img src="/copy-${i}.png">`).join("");
  return async (url) => {
    if (url === ART || /\/copy-\d+\.png$/.test(url)) return new Response(new Uint8Array(original));
    if (url === PAGE) return new Response(html);
    return new Response("not found", { status: 404 });
  };
}

describe("runScan", () => {
  it("files a claim for each new candidate and waits for decisions by default", async () => {
    const { client, filed } = fakeClient([work(1)]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(2) });

    expect(summary.worksScanned).toBe(1);
    expect(filed).toEqual([
      { workId: 1, pageUrl: PAGE, imageUrl: "https://shop.example.com/copy-0.png", wait: true },
      { workId: 1, pageUrl: PAGE, imageUrl: "https://shop.example.com/copy-1.png", wait: true },
    ]);
    expect(summary.filed.map((claim) => [claim.txHash, claim.ok])).toEqual([
      ["0xtx1", true],
      ["0xtx2", true],
    ]);
    expect(summary.errors).toEqual([]);
  });

  it("skips candidates that already have a claim", async () => {
    const existing: Claim = {
      id: 9,
      workId: 1,
      pageUrl: PAGE,
      imageUrl: "https://shop.example.com/copy-0.png",
      status: "NOTICE_ISSUED",
    };
    const { client, filed } = fakeClient([work(1)], [existing]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(2) });

    expect(filed.map((claim) => claim.imageUrl)).toEqual(["https://shop.example.com/copy-1.png"]);
    expect(summary.skipped.map((candidate) => candidate.imageUrl)).toEqual(["https://shop.example.com/copy-0.png"]);
  });

  it("files at most five claims per run", async () => {
    const { client, filed } = fakeClient([work(1), work(2)]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(4) });

    expect(MAX_CLAIMS_PER_RUN).toBe(5);
    expect(summary.candidates).toHaveLength(8);
    expect(filed).toHaveLength(5);
    expect(summary.skipped).toHaveLength(3);
  });

  it("submits without waiting when asked", async () => {
    const { client, filed } = fakeClient([work(1)]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(1), wait: false });

    expect(filed[0].wait).toBe(false);
    expect(summary.filed[0].ok).toBeNull();
  });

  it("records a failed filing and keeps going", async () => {
    const { client, filed } = fakeClient([work(1)], [], "https://shop.example.com/copy-0.png");

    const summary = await runScan(client, { fetchFn: await pageWithCopies(2) });

    expect(filed.map((claim) => claim.imageUrl)).toEqual(["https://shop.example.com/copy-1.png"]);
    expect(summary.errors).toEqual([
      "work 1: filing https://shop.example.com/copy-0.png: validators could not agree",
    ]);
  });

  it("scans only the requested works", async () => {
    const { client, filed } = fakeClient([work(1), work(2)]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(1), workIds: [2] });

    expect(summary.worksScanned).toBe(1);
    expect(filed.map((claim) => claim.workId)).toEqual([2]);
  });

  it("totals the images and pages looked at across every work in the run", async () => {
    const { client } = fakeClient([work(1), work(2)]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(3) });

    // Two works, one watched page each, three images on it.
    expect(summary.pagesRead).toBe(2);
    expect(summary.examined).toBe(6);
  });
});

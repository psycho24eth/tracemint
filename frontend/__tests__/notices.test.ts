import { describe, expect, it } from "vitest";

import type { Claim } from "@/lib/contracts/LicenseHunter";
import { copyPage, latestPerCopy } from "@/lib/notices";

const SHOP = "https://licensehunter.vercel.app/demo/shop";
const IMAGE = "https://licensehunter.vercel.app/demo/synth-hoodie-banner.jpg";

function claim(id: number, overrides: Partial<Claim> = {}): Claim {
  return {
    id,
    workId: 1,
    pageUrl: `${SHOP}?run=run${id}`,
    imageUrl: IMAGE,
    filedBy: "0xagent",
    verdict: "COPY_UNLICENSED",
    usage: "ADS_MERCH",
    prominence: "PRIMARY",
    reasoning: "",
    walletOnPage: "",
    fee: 0n,
    status: "NOTICE_ISSUED",
    disputeProofUrl: "",
    createdAt: id,
    ...overrides,
  };
}

describe("copyPage", () => {
  it("drops the demo run id and keeps the rest of the URL", () => {
    expect(copyPage(`${SHOP}?run=abc`)).toBe(SHOP);
    expect(copyPage(`${SHOP}?item=2&run=abc`)).toBe(`${SHOP}?item=2`);
    expect(copyPage("not a url")).toBe("not a url");
  });
});

describe("latestPerCopy", () => {
  it("keeps the newest notice for each copy, in the original order", () => {
    const claims = [claim(3), claim(6), claim(8, { workId: 2, imageUrl: "https://a.example/koi.jpg" }), claim(11)];

    expect(latestPerCopy(claims).map((kept) => kept.id)).toEqual([8, 11]);
  });

  it("keeps notices for the same copy apart when their status differs", () => {
    const claims = [claim(1, { status: "PAID" }), claim(3), claim(6)];

    expect(latestPerCopy(claims).map((kept) => kept.id)).toEqual([1, 6]);
  });
});

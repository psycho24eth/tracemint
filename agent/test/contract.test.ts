import { describe, expect, it } from "vitest";

import { toClaim, toWork } from "../src/contract";

describe("toWork", () => {
  it("maps a contract row to a Work", () => {
    const row = {
      id: 3n,
      creator: "0xAbC0000000000000000000000000000000000001",
      title: "Cybernetic Horizon",
      image_url: "https://art.example.com/a.png",
      watch_urls: ["https://shop.example.com/p"],
      base_price: 10n,
    };
    expect(toWork(row)).toEqual({
      id: 3,
      creator: "0xAbC0000000000000000000000000000000000001",
      title: "Cybernetic Horizon",
      imageUrl: "https://art.example.com/a.png",
      watchUrls: ["https://shop.example.com/p"],
    });
  });

  it("defaults to no watched URLs", () => {
    expect(toWork({ id: 1n, creator: "0x1", title: "t", image_url: "https://a.example/i.png" }).watchUrls).toEqual([]);
  });
});

describe("toClaim", () => {
  it("maps a contract row to a Claim", () => {
    const row = {
      id: 7n,
      work_id: 3n,
      page_url: "https://shop.example.com/p",
      image_url: "https://cdn.example.com/i.png",
      status: "NOTICE_ISSUED",
      fee: 45n,
    };
    expect(toClaim(row)).toEqual({
      id: 7,
      workId: 3,
      pageUrl: "https://shop.example.com/p",
      imageUrl: "https://cdn.example.com/i.png",
      status: "NOTICE_ISSUED",
    });
  });
});

import { describe, expect, it } from "vitest";

import { addressLink, toPlain, txLink } from "../src/genlayer";

describe("toPlain", () => {
  it("turns nested Maps from readContract into plain objects", () => {
    const row = new Map<string, unknown>([
      ["id", 1n],
      ["watch_urls", ["https://shop.example.com/p"]],
      ["meta", new Map([["ok", true]])],
    ]);
    expect(toPlain(row)).toEqual({ id: 1n, watch_urls: ["https://shop.example.com/p"], meta: { ok: true } });
  });

  it("maps lists of rows", () => {
    expect(toPlain([new Map([["id", 2n]])])).toEqual([{ id: 2n }]);
  });
});

describe("explorer links", () => {
  it("point at the Studio Next explorer", () => {
    expect(txLink("0xabc")).toBe("https://explorer-studio-dev.genlayer.com/tx/0xabc");
    expect(addressLink("0xdef")).toBe("https://explorer-studio-dev.genlayer.com/address/0xdef");
  });
});

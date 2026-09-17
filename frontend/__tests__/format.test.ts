import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addressLink,
  creatorShare,
  feeBreakdown,
  formatDate,
  formatGen,
  multiplierText,
  parseGen,
  parseWatchUrls,
  PROMINENCE_BPS,
  shortAddress,
  siteUrl,
  txLink,
  USAGE_BPS,
} from "../lib/format";

const GEN = 10n ** 18n;

describe("formatGen", () => {
  it("formats wei as GEN without trailing zeros", () => {
    expect(formatGen(45n * GEN)).toBe("45 GEN");
    expect(formatGen(43_650_000_000_000_000_000n)).toBe("43.65 GEN");
    expect(formatGen(1_350_000_000_000_000_000n)).toBe("1.35 GEN");
    expect(formatGen(0n)).toBe("0 GEN");
    expect(formatGen(1_234_567_890_000_000_000_000n)).toBe("1234.5678 GEN");
  });
});

describe("parseGen", () => {
  it("parses whole and fractional amounts to wei", () => {
    expect(parseGen("10")).toBe(10n * GEN);
    expect(parseGen(" 2.5 ")).toBe(2_500_000_000_000_000_000n);
    expect(parseGen("0.000000000000000001")).toBe(1n);
  });

  it.each(["", "abc", "-1", "1.2.3"])("rejects %j", (input) => {
    expect(() => parseGen(input)).toThrow("Enter an amount like 10 or 2.5");
  });
});

describe("feeBreakdown", () => {
  it("matches the spec example", () => {
    expect(feeBreakdown(10n * GEN, "ADS_MERCH", "PRIMARY")).toEqual({
      basePrice: 10n * GEN,
      usageBps: 30_000n,
      prominenceBps: 15_000n,
      fee: 45n * GEN,
      creatorAmount: 43_650_000_000_000_000_000n,
      protocolAmount: 1_350_000_000_000_000_000n,
    });
  });

  it("mirrors the contract formula for every usage and prominence", () => {
    for (const [usage, usageBps] of Object.entries(USAGE_BPS)) {
      for (const [prominence, prominenceBps] of Object.entries(PROMINENCE_BPS)) {
        const expected = (10n * GEN * usageBps * prominenceBps) / 100_000_000n;
        expect(feeBreakdown(10n * GEN, usage, prominence)?.fee).toBe(expected);
      }
    }
  });

  it("returns null when there is no fee category", () => {
    expect(feeBreakdown(10n * GEN, "NONE", "NONE")).toBeNull();
  });
});

describe("creatorShare", () => {
  it("calculates creator share as 97% of the fee", () => {
    expect(creatorShare(45n * GEN)).toBe(43_650_000_000_000_000_000n);
  });
});

describe("small helpers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("describes multipliers", () => {
    expect(multiplierText(30_000n)).toBe("× 3");
    expect(multiplierText(15_000n)).toBe("× 1.5");
    expect(multiplierText(5_000n)).toBe("× 0.5");
  });

  it("parses one watched URL per line", () => {
    expect(parseWatchUrls(" https://a.example/1 \n\n https://b.example/2\r\n")).toEqual([
      "https://a.example/1",
      "https://b.example/2",
    ]);
  });

  it("shortens addresses", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
    expect(shortAddress("0x12")).toBe("0x12");
  });

  it("builds explorer links", () => {
    expect(txLink("0xabc")).toBe("https://explorer-studio-dev.genlayer.com/tx/0xabc");
    expect(addressLink("0xdef")).toBe("https://explorer-studio-dev.genlayer.com/address/0xdef");
  });

  it("formats contract timestamps in UTC", () => {
    expect(formatDate(1789466400)).toBe("2026-09-15 10:00 UTC");
  });

  it("builds site URLs without a double slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://licensehunter.example/");
    expect(siteUrl("/demo/shop")).toBe("https://licensehunter.example/demo/shop");
  });
});

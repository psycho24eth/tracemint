import { afterEach, describe, expect, it, vi } from "vitest";

import { addressLink, retryableRpcError, toPlain, txLink, withRpcRetry } from "../src/genlayer";

/**
 * What viem actually threw when Studio's execution slots filled up, which ended scheduled scan #24.
 * The shortMessage is wrong -- viem has no entry for -32006 -- so the shape matters more than the text.
 */
const busy = () =>
  Object.assign(new Error("Version of JSON-RPC protocol is not supported."), {
    code: -32006,
    details: "Server busy: all 8 execution slots occupied, retry later",
    shortMessage: "Version of JSON-RPC protocol is not supported.",
    cause: {
      code: -32006,
      message: "Server busy: all 8 execution slots occupied, retry later",
      data: { retry_after_seconds: 2 },
    },
  });

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

describe("retryableRpcError", () => {
  it("sees through viem's wrong label and takes the server's own wait", () => {
    expect(retryableRpcError(busy())).toEqual({
      retryAfterMs: 2_000,
      reason: "Server busy: all 8 execution slots occupied, retry later",
    });
  });

  it("matches on the message when no code is given", () => {
    expect(retryableRpcError(new Error("Rate limit exceeded: 30 requests per minute"))?.retryAfterMs).toBe(2_000);
  });

  it("finds a retryable cause nested below an unrelated wrapper", () => {
    const wrapped = Object.assign(new Error("read list_works failed"), { cause: busy() });
    expect(retryableRpcError(wrapped)?.retryAfterMs).toBe(2_000);
  });

  it("leaves a real failure alone, so a rejected call is not retried forever", () => {
    expect(retryableRpcError(new Error("[EXPECTED] Wallet address not found on portfolio page"))).toBe(null);
    expect(retryableRpcError(Object.assign(new Error("reverted"), { code: -32000 }))).toBe(null);
    expect(retryableRpcError(undefined)).toBe(null);
  });
});

describe("withRpcRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("retries a busy server and returns the eventual answer", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers();
    let calls = 0;
    const call = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw busy();
      return "works";
    });

    const settled = withRpcRetry("read list_works", call);
    await vi.runAllTimersAsync();

    await expect(settled).resolves.toBe("works");
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("rethrows immediately when the error is not retryable", async () => {
    const call = vi.fn(async () => {
      throw new Error("Claim already filed");
    });

    await expect(withRpcRetry("submit file_claim", call)).rejects.toThrow("Claim already filed");
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("gives up rather than looping while the chain stays busy", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers();
    const call = vi.fn(async () => {
      throw busy();
    });

    const settled = withRpcRetry("read list_works", call);
    const assertion = expect(settled).rejects.toThrow(/JSON-RPC/);
    await vi.runAllTimersAsync();
    await assertion;

    // One first attempt plus RPC_RETRIES retries.
    expect(call).toHaveBeenCalledTimes(6);
  });
});

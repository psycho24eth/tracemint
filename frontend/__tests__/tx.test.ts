// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { outcomeMessage, submitDemoWrite, UNDECIDED_MESSAGE, waitForDemoTx, type TxStatus } from "../lib/tx";

const HASH = `0x${"cd".repeat(32)}`;
const GEN = 10n ** 18n;

const status = (overrides: Partial<TxStatus>): TxStatus => ({
  hash: HASH,
  status: "PENDING",
  result: null,
  decided: false,
  successful: null,
  ...overrides,
});

const reply = (body: unknown, httpStatus = 200) =>
  ({ ok: httpStatus < 400, status: httpStatus, json: async () => body }) as unknown as Response;

describe("outcomeMessage", () => {
  it("says nothing while pending or after success", () => {
    expect(outcomeMessage(status({}))).toBeNull();
    expect(
      outcomeMessage(status({ status: "ACCEPTED", result: "FINISHED_WITH_RETURN", decided: true, successful: true })),
    ).toBeNull();
  });

  it("explains an undetermined transaction", () => {
    expect(outcomeMessage(status({ status: "UNDETERMINED", decided: true, successful: false }))).toBe(UNDECIDED_MESSAGE);
  });

  it("explains a contract error", () => {
    expect(
      outcomeMessage(status({ status: "ACCEPTED", result: "FINISHED_WITH_ERROR", decided: true, successful: false })),
    ).toBe("The contract rejected this transaction. Open it in the explorer to see why.");
  });
});

describe("submitDemoWrite", () => {
  it("posts the role, method, encoded args, and value", async () => {
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => reply({ hash: HASH }));

    await expect(
      submitDemoWrite(
        { role: "site-owner", method: "pay_license", args: [7], value: 45n * GEN },
        fetchFn as unknown as typeof fetch,
      ),
    ).resolves.toBe(HASH);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("/api/demo/write");
    expect(JSON.parse(String(init?.body))).toEqual({
      role: "site-owner",
      method: "pay_license",
      args: [7],
      value: "45000000000000000000",
    });
  });

  it("throws the API's error message", async () => {
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) =>
      reply({ error: "Demo mode is busy. Try again in a minute." }, 429),
    );

    await expect(
      submitDemoWrite({ role: "creator", method: "withdraw_earnings", args: [] }, fetchFn as unknown as typeof fetch),
    ).rejects.toThrow("Demo mode is busy. Try again in a minute.");
  });
});

describe("waitForDemoTx", () => {
  it("polls until validators decide", async () => {
    const replies = [
      status({}),
      status({ status: "PROPOSING" }),
      status({ status: "ACCEPTED", result: "FINISHED_WITH_RETURN", decided: true, successful: true }),
    ];
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => reply(replies.shift()));
    const wait = vi.fn(async (_ms: number) => {});

    const final = await waitForDemoTx(HASH, { fetchFn: fetchFn as unknown as typeof fetch, wait, intervalMs: 1_000 });

    expect(final.successful).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(fetchFn.mock.calls[0][0]).toBe(`/api/tx/${HASH}`);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("returns the last status when the timeout passes", async () => {
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => reply(status({ status: "PROPOSING" })));

    const final = await waitForDemoTx(HASH, {
      fetchFn: fetchFn as unknown as typeof fetch,
      wait: async () => {},
      intervalMs: 1_000,
      timeoutMs: 3_000,
    });

    expect(final).toMatchObject({ status: "PROPOSING", decided: false });
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });
});

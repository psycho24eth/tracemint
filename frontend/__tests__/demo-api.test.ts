// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clientFor: vi.fn((privateKey: string) => ({ privateKey })),
  submitWrite: vi.fn(),
  getTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@licensehunter/agent/genlayer", () => ({
  clientFor: mocks.clientFor,
  submitWrite: mocks.submitWrite,
  LIGHT_FEES: { preset: "light" },
  HEAVY_FEES: { preset: "heavy" },
}));
vi.mock("genlayer-js", () => ({
  createClient: vi.fn(() => ({ getTransaction: mocks.getTransaction })),
  isSuccessful: (tx: { statusName?: string; txExecutionResultName?: string }) =>
    ["ACCEPTED", "FINALIZED"].includes(tx.statusName ?? "") && tx.txExecutionResultName === "FINISHED_WITH_RETURN",
}));
vi.mock("@/lib/genlayer/tx-utils", () => ({
  isDecidedState: (status: string) => ["ACCEPTED", "FINALIZED", "UNDETERMINED"].includes(status),
}));

const CONTRACT = "0x00000000000000000000000000000000000000c0";
const HASH = `0x${"ab".repeat(32)}`;
const GEN = 10n ** 18n;
const ACCESS_CODE = "judge-code";

async function writeRoute() {
  vi.resetModules();
  return import("../app/api/demo/write/route");
}

function post(body: unknown, accessCode: string | null = ACCESS_CODE) {
  return new Request("http://localhost/api/demo/write", {
    method: "POST",
    headers: { "content-type": "application/json", ...(accessCode ? { "x-demo-access": accessCode } : {}) },
    body: JSON.stringify(body),
  });
}

async function accessRoute() {
  vi.resetModules();
  return import("../app/api/demo/access/route");
}

function unlockRequest(code: unknown) {
  return new Request("http://localhost/api/demo/access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("LICENSE_HUNTER_ADDRESS", CONTRACT);
  vi.stubEnv("DEMO_CREATOR_PRIVATE_KEY", "0xcreator-key");
  vi.stubEnv("DEMO_SITE_OWNER_PRIVATE_KEY", "0xsite-owner-key");
  vi.stubEnv("DEMO_ACCESS_CODE", ACCESS_CODE);
  mocks.clientFor.mockClear();
  mocks.submitWrite.mockReset().mockResolvedValue(HASH);
  mocks.getTransaction.mockReset();
});

describe("POST /api/demo/access", () => {
  it("accepts the configured judge access code", async () => {
    const { POST } = await accessRoute();
    expect((await POST(unlockRequest(ACCESS_CODE))).status).toBe(204);
  });

  it("rejects a wrong code, and every code when none is configured", async () => {
    const { POST } = await accessRoute();
    expect((await POST(unlockRequest("guess"))).status).toBe(401);

    vi.stubEnv("DEMO_ACCESS_CODE", "");
    expect((await POST(unlockRequest(""))).status).toBe(401);
  });
});

describe("POST /api/demo/code", () => {
  async function codeRoute() {
    vi.resetModules();
    return import("../app/api/demo/code/route");
  }

  it("hands out a unique code that unlocks demo mode", async () => {
    const { POST: issue } = await codeRoute();
    const first = (await (await issue()).json()) as { code: string; expiresAt: number };
    const second = (await (await issue()).json()) as { code: string };

    expect(first.code).toMatch(/^DEMO-/);
    expect(second.code).not.toBe(first.code);
    expect(first.expiresAt).toBeGreaterThan(Date.now());

    const { POST: unlock } = await accessRoute();
    expect((await unlock(unlockRequest(first.code))).status).toBe(204);
  });

  it("hands out nothing when demo mode is switched off", async () => {
    vi.stubEnv("DEMO_ACCESS_CODE", "");
    const { POST: issue } = await codeRoute();

    expect((await issue()).status).toBe(503);
  });

  it("tells the visitor when their demo code has expired", async () => {
    const { issueDemoCode } = await import("../lib/server/demo-codes");
    const stale = issueDemoCode(ACCESS_CODE, Date.now() - 25 * 3_600_000).code;
    const { POST: unlock } = await accessRoute();

    const response = await unlock(unlockRequest(stale));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "That demo code has expired. Get a new one." });
  });
});

describe("POST /api/demo/write", () => {
  it("signs for a generated demo code too", async () => {
    const { issueDemoCode } = await import("../lib/server/demo-codes");
    const { POST } = await writeRoute();

    const response = await POST(post({ role: "creator", method: "withdraw_earnings", args: [] }, issueDemoCode(ACCESS_CODE).code));

    expect(response.status).toBe(200);
  });

  it("requires the judge access code", async () => {
    const { POST } = await writeRoute();

    const response = await POST(post({ role: "creator", method: "withdraw_earnings", args: [] }, null));

    expect(response.status).toBe(401);
    expect(mocks.submitWrite).not.toHaveBeenCalled();
  });

  it("signs a license payment with the site owner's key", async () => {
    const { POST } = await writeRoute();

    const response = await POST(
      post({ role: "site-owner", method: "pay_license", args: [7], value: (45n * GEN).toString() }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ hash: HASH });
    expect(mocks.clientFor).toHaveBeenCalledWith("0xsite-owner-key");
    expect(mocks.submitWrite).toHaveBeenCalledWith({ privateKey: "0xsite-owner-key" }, CONTRACT, "pay_license", [7], {
      value: 45n * GEN,
      fees: { preset: "light" },
      emitsMessages: false,
    });
  });

  it("uses the heavy fee preset for methods that make validators fetch pages", async () => {
    const { POST } = await writeRoute();

    await POST(post({ role: "creator", method: "file_claim", args: [1, "https://a.example/p", "https://a.example/i.png"] }));

    expect(mocks.submitWrite.mock.calls[0][4]).toEqual({ value: 0n, fees: { preset: "heavy" }, emitsMessages: false });
  });

  it("sends message fee allocations for payouts", async () => {
    const { POST } = await writeRoute();

    await POST(post({ role: "creator", method: "withdraw_earnings", args: [] }));

    expect(mocks.submitWrite.mock.calls[0][4]).toEqual({ value: 0n, fees: { preset: "light" }, emitsMessages: true });
  });

  it("refuses methods outside the role's allowlist", async () => {
    const { POST } = await writeRoute();

    const response = await POST(post({ role: "site-owner", method: "withdraw_earnings", args: [] }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "The demo site owner cannot call withdraw_earnings" });
    expect(mocks.submitWrite).not.toHaveBeenCalled();
  });

  it("answers 503 when the role has no key", async () => {
    vi.stubEnv("DEMO_CREATOR_PRIVATE_KEY", "");
    const { POST } = await writeRoute();

    const response = await POST(post({ role: "creator", method: "withdraw_earnings", args: [] }));

    expect(response.status).toBe(503);
    expect(mocks.submitWrite).not.toHaveBeenCalled();
  });

  it("allows at most 6 writes a minute per server instance", async () => {
    const { POST } = await writeRoute();
    const statuses: number[] = [];

    for (let i = 0; i < 7; i += 1) {
      statuses.push((await POST(post({ role: "creator", method: "withdraw_earnings", args: [] }))).status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 200, 429]);
  });

  it("returns a generic message when submission fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.submitWrite.mockRejectedValue(new Error("rpc exploded"));
    const { POST } = await writeRoute();

    const response = await POST(post({ role: "creator", method: "withdraw_earnings", args: [] }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "The transaction could not be submitted. Try again." });
    expect(consoleError).toHaveBeenCalledWith("demo write failed:", "rpc exploded");
    consoleError.mockRestore();
  });
});

describe("GET /api/tx/[hash]", () => {
  // The route's first import (it pulls in genlayer-js) is slow while the whole suite runs in parallel;
  // pay it once here rather than inside the first test's 5 s timeout.
  beforeAll(async () => {
    await import("../app/api/tx/[hash]/route");
  }, 30_000);

  const get = async (hash: string) => {
    const { GET } = await import("../app/api/tx/[hash]/route");
    return GET(new Request(`http://localhost/api/tx/${hash}`), { params: Promise.resolve({ hash }) });
  };

  it("reports a decided, successful transaction", async () => {
    mocks.getTransaction.mockResolvedValue({ statusName: "ACCEPTED", txExecutionResultName: "FINISHED_WITH_RETURN" });

    const response = await get(HASH);

    await expect(response.json()).resolves.toEqual({
      hash: HASH,
      status: "ACCEPTED",
      result: "FINISHED_WITH_RETURN",
      decided: true,
      successful: true,
    });
    expect(mocks.getTransaction).toHaveBeenCalledWith({ hash: HASH });
  });

  it("reports an undetermined transaction as decided but unsuccessful", async () => {
    mocks.getTransaction.mockResolvedValue({ statusName: "UNDETERMINED" });

    await expect((await get(HASH)).json()).resolves.toMatchObject({ decided: true, successful: false });
  });

  it("keeps an unknown transaction pending instead of failing", async () => {
    mocks.getTransaction.mockRejectedValue(new Error("not found"));

    await expect((await get(HASH)).json()).resolves.toMatchObject({ status: "UNKNOWN", decided: false, successful: null });
  });

  it("rejects malformed hashes", async () => {
    const response = await get("0x1234");

    expect(response.status).toBe(400);
    expect(mocks.getTransaction).not.toHaveBeenCalled();
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runScan: vi.fn(),
  createLicenseHunterClient: vi.fn(() => ({ agent: true })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@licensehunter/agent", () => ({
  runScan: mocks.runScan,
  createLicenseHunterClient: mocks.createLicenseHunterClient,
}));
vi.mock("@licensehunter/agent/genlayer", () => ({
  clientFor: vi.fn(),
  submitWrite: vi.fn(),
  LIGHT_FEES: { preset: "light" },
  HEAVY_FEES: { preset: "heavy" },
}));

const CONTRACT = "0x00000000000000000000000000000000000000c0";
const HASH = `0x${"12".repeat(32)}`;

const summary = (overrides: Record<string, unknown> = {}) => ({
  worksScanned: 1,
  candidates: [
    { workId: 1, pageUrl: "https://site.example/demo/shop?run=r1", imageUrl: "https://site.example/demo/b.jpg", distance: 7 },
  ],
  filed: [
    {
      workId: 1,
      pageUrl: "https://site.example/demo/shop?run=r1",
      imageUrl: "https://site.example/demo/b.jpg",
      distance: 7,
      txHash: HASH,
      ok: null,
    },
  ],
  skipped: [],
  errors: [],
  ...overrides,
});

async function scanRoute() {
  vi.resetModules();
  return import("../app/api/scan/route");
}

const post = (body: unknown) =>
  new Request("http://localhost/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("LICENSE_HUNTER_ADDRESS", CONTRACT);
  vi.stubEnv("AGENT_PRIVATE_KEY", "0xagent-key");
  mocks.runScan.mockReset().mockResolvedValue(summary());
  mocks.createLicenseHunterClient.mockClear();
});

describe("POST /api/scan", () => {
  it("scans one work without waiting for validators and returns the filed claims", async () => {
    const { POST } = await scanRoute();

    const response = await POST(post({ workId: 1, runId: "r1" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      worksScanned: 1,
      candidates: 1,
      filed: [
        {
          hash: HASH,
          pageUrl: "https://site.example/demo/shop?run=r1",
          imageUrl: "https://site.example/demo/b.jpg",
          distance: 7,
        },
      ],
      skipped: 0,
      errors: [],
    });
    expect(mocks.createLicenseHunterClient).toHaveBeenCalledWith({ privateKey: "0xagent-key", address: CONTRACT });
    expect(mocks.runScan).toHaveBeenCalledWith({ agent: true }, { wait: false, runId: "r1", workIds: [1] });
  });

  it.each([{}, { workId: 0 }, { workId: "1" }, { workId: 1, runId: "no spaces allowed" }])(
    "rejects %j with 400",
    async (body) => {
      const { POST } = await scanRoute();

      const response = await POST(post(body));

      expect(response.status).toBe(400);
      expect(mocks.runScan).not.toHaveBeenCalled();
    },
  );

  it("answers 503 when the agent key is missing", async () => {
    vi.stubEnv("AGENT_PRIVATE_KEY", "");
    const { POST } = await scanRoute();

    expect((await POST(post({ workId: 1 }))).status).toBe(503);
    expect(mocks.runScan).not.toHaveBeenCalled();
  });

  it("allows one scan a minute", async () => {
    const { POST } = await scanRoute();

    expect((await POST(post({ workId: 1 }))).status).toBe(200);
    expect((await POST(post({ workId: 1 }))).status).toBe(429);
    expect(mocks.runScan).toHaveBeenCalledTimes(1);
  });

  it("returns a generic message when the scan fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.runScan.mockRejectedValue(new Error("rpc exploded"));
    const { POST } = await scanRoute();

    const response = await POST(post({ workId: 1 }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "The scan could not run. Try again." });
    expect(consoleError).toHaveBeenCalledWith("scan failed:", "rpc exploded");
    consoleError.mockRestore();
  });
});

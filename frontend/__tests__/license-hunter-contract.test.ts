import { beforeEach, describe, expect, it, vi } from "vitest";

const readContract = vi.hoisted(() => vi.fn());
vi.mock("genlayer-js", () => ({ createClient: vi.fn(() => ({ readContract })) }));

import LicenseHunter, { toClaim, toStats, toWork } from "../lib/contracts/LicenseHunter";

const CONTRACT = "0x00000000000000000000000000000000000000c0";
const GEN = 10n ** 18n;

const workRow = () =>
  new Map<string, unknown>([
    ["id", 1n],
    ["creator", "0xA11ce00000000000000000000000000000000001"],
    ["title", "Cybernetic Horizon"],
    ["image_url", "https://site.example/demo/cybernetic-horizon.png"],
    ["portfolio_url", "https://site.example/demo/portfolio"],
    ["base_price", 10n * GEN],
    ["terms", "Web license, 12 months"],
    ["watch_urls", ["https://site.example/demo/shop"]],
    ["created_at", 1789466400n],
  ]);

const claimRow = (overrides: Record<string, unknown> = {}) =>
  new Map<string, unknown>(
    Object.entries({
      id: 7n,
      work_id: 1n,
      page_url: "https://site.example/demo/shop?run=r1",
      image_url: "https://site.example/demo/synth-hoodie-banner.jpg",
      filed_by: "0xA9e0000000000000000000000000000000000003",
      verdict: "COPY_UNLICENSED",
      usage: "ADS_MERCH",
      prominence: "PRIMARY",
      reasoning: "Same artwork, cropped.",
      wallet_on_page: "0xb0b0000000000000000000000000000000000002",
      fee: 45n * GEN,
      status: "NOTICE_ISSUED",
      dispute_proof_url: "",
      created_at: 1789466500n,
      ...overrides,
    }),
  );

describe("row mapping", () => {
  it("maps a work row", () => {
    expect(toWork(Object.fromEntries(workRow()))).toEqual({
      id: 1,
      creator: "0xA11ce00000000000000000000000000000000001",
      title: "Cybernetic Horizon",
      imageUrl: "https://site.example/demo/cybernetic-horizon.png",
      portfolioUrl: "https://site.example/demo/portfolio",
      basePrice: 10n * GEN,
      terms: "Web license, 12 months",
      watchUrls: ["https://site.example/demo/shop"],
      createdAt: 1789466400,
    });
  });

  it("maps a claim row", () => {
    const claim = toClaim(Object.fromEntries(claimRow()));
    expect(claim).toMatchObject({
      id: 7,
      workId: 1,
      verdict: "COPY_UNLICENSED",
      usage: "ADS_MERCH",
      prominence: "PRIMARY",
      walletOnPage: "0xb0b0000000000000000000000000000000000002",
      fee: 45n * GEN,
      status: "NOTICE_ISSUED",
    });
  });

  it("maps stats whose status counts arrive as a Map", () => {
    const stats = toStats({
      owner: "0x1",
      agent: "0x2",
      works: 1n,
      claims: 2n,
      licenses: 1n,
      claims_by_status: new Map([
        ["NOTICE_ISSUED", 1n],
        ["PAID", 1n],
      ]),
      total_license_revenue: 45n * GEN,
      protocol_balance: 1350000000000000000n,
    });
    expect(stats.claimsByStatus).toEqual({ NOTICE_ISSUED: 1, NO_NOTICE: 0, PAID: 1, WITHDRAWN: 0, DISPUTE_REJECTED: 0 });
    expect(stats.totalLicenseRevenue).toBe(45n * GEN);
  });
});

describe("LicenseHunter reads", () => {
  beforeEach(() => {
    readContract.mockReset();
  });

  it("lists works through list_works and converts Map rows", async () => {
    readContract.mockResolvedValue([workRow()]);

    const works = await new LicenseHunter(CONTRACT).listWorks();

    expect(readContract).toHaveBeenCalledWith({ address: CONTRACT, functionName: "list_works", args: [] });
    expect(works[0].title).toBe("Cybernetic Horizon");
    expect(works[0].basePrice).toBe(10n * GEN);
  });

  it("passes the work id to list_claims", async () => {
    readContract.mockResolvedValue([claimRow()]);

    const claims = await new LicenseHunter(CONTRACT).listClaims(1);

    expect(readContract).toHaveBeenCalledWith({ address: CONTRACT, functionName: "list_claims", args: [1] });
    expect(claims.map((claim) => claim.id)).toEqual([7]);
  });

  it("reads earnings as a bigint", async () => {
    readContract.mockResolvedValue(43650000000000000000n);
    await expect(new LicenseHunter(CONTRACT).getEarnings("0xA11ce00000000000000000000000000000000001")).resolves.toBe(
      43650000000000000000n,
    );
  });

  it("finds the license for a claim by checking licenses newest first", async () => {
    readContract.mockImplementation(async ({ functionName, args }: { functionName: string; args: unknown[] }) => {
      if (functionName === "get_stats") return new Map<string, unknown>([["licenses", 2n], ["claims_by_status", new Map()]]);
      if (functionName === "get_license") {
        const id = args[0] as number;
        return new Map<string, unknown>([["id", BigInt(id)], ["claim_id", id === 2 ? 7n : 3n]]);
      }
      throw new Error(`unexpected ${functionName}`);
    });

    const license = await new LicenseHunter(CONTRACT).findLicenseForClaim(7);

    expect(license?.id).toBe(2);
    expect(readContract).toHaveBeenCalledTimes(2);
  });
});

# LicenseHunter Plan 3 of 4: Web App and Demo Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `v2-dev` template frontend into the LicenseHunter web app on Studio Next. It needs:
- works, notices with Pay and Dispute, licenses, and creator earnings
- a guide for judges
- demo pages that validators and the agent can fetch
- server-signed demo wallets
- the "Scan now" route

**Architecture:**
- **Reads** go through `lib/contracts/LicenseHunter.ts` (genlayer-js `readContract`, `Map` rows converted to typed objects) and TanStack Query hooks.
- **Writes** go through one component, `WriteAction`:
  - With a demo role active, it posts to `/api/demo/write`, where the server signs with that demo key, then polls `/api/tx/[hash]`.
  - Otherwise it opens GenLayer's `GenLayerTransactionPanel` for MetaMask.
- **Demo pages** are server components with no client component of their own, so their content sits in the server-rendered HTML that validators' text rendering and the agent's HTML parser both read.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, TanStack Query 5, `@genlayer/transaction-kit` and `@genlayer/transaction-kit-react` `0.1.0-rc.2`, genlayer-js `2.0.0-rc.1`, `@licensehunter/agent` (workspace), sharp (demo art), Vitest with Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-15-licensehunter-genlayer-design.md`, sections 8 (frontend) and 9 (judge path).

**Depends on:**
- **Plan 1:**
  - LicenseHunter reads: `list_works`, `get_work`, `list_claims(work_id)`, `get_claim`, `list_notices`, `get_license`, `list_licenses(licensee)`, `get_earnings(creator)`, `get_stats`
  - LicenseHunter writes: `register_work`, `update_watchlist`, `file_claim`, `pay_license` (payable), `dispute`, `withdraw_earnings`
  - Root `.env.local` keys: `LICENSE_HUNTER_ADDRESS`, `AGENT_PRIVATE_KEY`, `AGENT_ADDRESS`, `DEMO_CREATOR_PRIVATE_KEY`, `DEMO_CREATOR_ADDRESS`, `DEMO_SITE_OWNER_PRIVATE_KEY`, `DEMO_SITE_OWNER_ADDRESS`
  - Explorer link formats recorded in `docs/platform-checks.md`
- **Plan 2:** `@licensehunter/agent` exports `runScan`, `createLicenseHunterClient`, and the shared types; the subpath `@licensehunter/agent/genlayer` exports `clientFor`, `submitWrite`, `HEAVY_FEES`, `LIGHT_FEES`, and `type Hex`; the subpath `@licensehunter/agent/phash` exports `differenceHash`, `hammingDistance`, and `MATCH_THRESHOLD`.

## Global Constraints

- **Network:** Studio Next, RPC `https://studio-next.genlayer.com/api`, chain ID `61997`, explorer `https://explorer-studio-dev.genlayer.com/`. The frontend network config stays in the template's `lib/genlayer/network.ts`, unchanged.
- **Env names:**
  - Public: `NEXT_PUBLIC_GENLAYER_RPC_URL`, `NEXT_PUBLIC_GENLAYER_CHAIN_ID`, `NEXT_PUBLIC_GENLAYER_CHAIN_NAME`, `NEXT_PUBLIC_GENLAYER_SYMBOL`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEMO_CREATOR_ADDRESS`, `NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS`
  - Server-only: `DEMO_CREATOR_PRIVATE_KEY`, `DEMO_SITE_OWNER_PRIVATE_KEY`, `AGENT_PRIVATE_KEY`, `LICENSE_HUNTER_ADDRESS` (falls back to `NEXT_PUBLIC_CONTRACT_ADDRESS`)
- **Private keys never reach the browser.** Every module that reads them starts with `import "server-only";`.
- **Demo write allowlist:**
  - demo creator: `register_work`, `update_watchlist`, `file_claim`, `withdraw_earnings`
  - demo site owner: `pay_license`, `dispute`
  - Anything else gets HTTP 403.
- **Success rule:** a transaction succeeded only when its status is `ACCEPTED` or `FINALIZED` and its execution result is `FINISHED_WITH_RETURN`.
- **Fee display mirrors the contract:**
  - fee = base × usage bps × prominence bps / 100,000,000
  - usage bps: `PERSONAL` 5000, `EDITORIAL` 10000, `COMMERCIAL` 20000, `ADS_MERCH` 30000
  - prominence bps: `INCIDENTAL` 5000, `FEATURED` 10000, `PRIMARY` 15000
  - creator share = fee × 9700 / 10000
- **Scan now:** `POST /api/scan { workId, runId? }` calls `runScan(..., { wait: false, runId, workIds: [workId] })`, with `maxDuration = 300` and at most one run per 60 seconds per server instance.
- **Demo pages:** `/demo/portfolio`, `/demo/shop`, `/demo/blog`, `/demo/permission`.
  - Server components only; they ignore the `run` query parameter.
  - The shop page shows `NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS`; the portfolio page shows `NEXT_PUBLIC_DEMO_CREATOR_ADDRESS`.
- **Demo art:** the shop page's edited copy crops at most 5% per side, then resizes and recompresses. Measured distances: a 5% crop per side is 7 (a match); a 10% crop per side is 16 (no match).
- **Copy:**
  - Sentence case.
  - Every notice shows "Not legal advice."
  - Landing claims use the corrected wording from spec section 13.
- **Public repo URL:** `https://github.com/psycho24eth/licensehunter`. Plan 4 creates it.
- **Tests:** the template tests `network-config.test.ts`, `transaction-panel.test.tsx`, `deploy-script.test.ts`, and `release-dependencies.test.ts` keep passing. `network-consumers.test.tsx` switches from `FootballBets` to `LicenseHunter`.
- **Git:**
  - Work on branch `feat/genlayer-rebuild`, commit locally after each task, and do not push.
  - Commit messages end with the line `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Deadline:** submissions close 2026-09-17 21:01 IST.
- **Shell:** Git Bash on Windows, run from the repo root `D:/GenlayerProject`.

## File Structure

| Path | Responsibility | Task |
|---|---|---|
| `frontend/lib/contracts/LicenseHunter.ts` | Typed contract reads and row mapping | 1 |
| `frontend/lib/hooks/useLicenseHunter.ts` | TanStack Query hooks | 1 |
| `frontend/components/Logo.tsx`, `Navbar.tsx`, `Footer.tsx`, `PageShell.tsx`, `AccountPanel.tsx` | App shell and branding | 2 |
| `frontend/app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `public/favicon.svg`, `public/site.webmanifest`, `.env.example` | Theme, metadata, landing | 2 |
| `frontend/lib/format.ts` | GEN formatting and parsing, fee breakdown, labels, explorer links | 3 |
| `frontend/lib/demo/roles.ts` | Demo roles, allowlist, request validation | 4 |
| `frontend/lib/server/demo-signer.ts` | Server-only signing with demo keys | 4 |
| `frontend/app/api/demo/write/route.ts`, `frontend/app/api/tx/[hash]/route.ts` | Demo write and transaction status APIs | 4 |
| `frontend/lib/demo/DemoModeProvider.tsx`, `frontend/components/DemoRoleSwitcher.tsx` | Demo role state and switcher | 4 |
| `frontend/components/WriteAction.tsx` | One write button for demo and wallet modes | 5 |
| `frontend/app/api/scan/route.ts` | "Scan now" | 6 |
| `frontend/app/works/page.tsx`, `frontend/app/works/[id]/page.tsx`, `frontend/components/RegisterWorkForm.tsx`, `frontend/components/ClaimsTable.tsx` | Works | 7 |
| `frontend/app/notices/page.tsx`, `frontend/app/notices/[id]/page.tsx`, `frontend/components/NoticeView.tsx` | Notices | 8 |
| `frontend/app/licenses/[id]/page.tsx`, `frontend/app/dashboard/page.tsx`, `frontend/app/judges/page.tsx` | Licenses, earnings, judge guide | 9 |
| `scripts/generate-demo-art.ts`, `frontend/public/demo/*`, `frontend/app/demo/*/page.tsx` | Demo art and demo pages | 10 |
| `frontend/lib/server/rate-limit.ts` | Per-instance rate limiting for the demo write and scan routes | 4 |
| `frontend/lib/tx.ts` | Demo write submission, transaction polling, and outcome text | 5 |
| `frontend/components/NoticeView.tsx`, `DisputeForm.tsx` | Notice page pieces | 8 |
| `frontend/lib/hooks/useCreatorLedger.ts` | A creator's works, claims, and lifetime earnings | 9 |
| `scripts/generate-demo-art.ts` | Demo artwork and its edited copy | 10 |
| `deploy/sync-frontend-env.ts` | Write `frontend/.env.local` from the root `.env.local` | 4 |

---

### Task 1: Contract data layer

**Files:**
- Create: `frontend/lib/contracts/LicenseHunter.ts`, `frontend/lib/hooks/useLicenseHunter.ts`, `frontend/__tests__/license-hunter-contract.test.ts`
- Modify: `frontend/__tests__/network-consumers.test.tsx`

**Interfaces:**
- Consumes: `GENLAYER_CHAIN`, `getContractAddress` (`frontend/lib/genlayer/client.ts`); `useWallet` (`frontend/lib/genlayer/wallet.ts`).
- Produces, from `LicenseHunter.ts`:
  - Types:
    - `Verdict`: `"COPY_UNLICENSED" | "COPY_LICENSED" | "DIFFERENT_WORK" | "UNCLEAR"`
    - `ClaimStatus`: `"NOTICE_ISSUED" | "NO_NOTICE" | "PAID" | "WITHDRAWN" | "DISPUTE_REJECTED"`
    - `Work { id; creator; title; imageUrl; portfolioUrl; basePrice: bigint; terms; watchUrls: string[]; createdAt }`
    - `Claim { id; workId; pageUrl; imageUrl; filedBy; verdict; usage; prominence; reasoning; walletOnPage; fee: bigint; status; disputeProofUrl; createdAt }`
    - `License { id; claimId; workId; licensee; pageUrl; amount: bigint; creatorAmount: bigint; issuedAt; expiresAt }`
    - `Stats { owner; agent; works; claims; licenses; claimsByStatus: Record<ClaimStatus, number>; totalLicenseRevenue: bigint; protocolBalance: bigint }`
  - Functions: `toPlain`, `toWork`, `toClaim`, `toLicense`, `toStats`
  - Default export class `LicenseHunter(contractAddress: string, address?: string | null)`:
    - `updateAccount(address)`
    - `listWorks()`, `getWork(id)`
    - `listClaims(workId)`, `getClaim(id)`, `listNotices()`
    - `getLicense(id)`, `listLicenses(licensee)`, `findLicenseForClaim(claimId)`
    - `getEarnings(creator): Promise<bigint>`, `getStats()`
- Produces, from `useLicenseHunter.ts`:
  - `useLicenseHunter()`
  - Query hooks: `useWorks()`, `useWork(id)`, `useClaims(workId)`, `useClaim(id)`, `useNotices()`, `useLicense(id)`, `useLicenseForClaim(claimId, enabled)`, `useEarnings(creator)`, `useStats()`
  - `useRefreshLicenseHunter()`, which invalidates every query under the key prefix `"license-hunter"`

- [ ] **Step 1: Write the failing test `frontend/__tests__/license-hunter-contract.test.ts`**

```ts
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
  beforeEach(() => readContract.mockReset());

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
```

Run: `npm test --workspace frontend -- license-hunter-contract`
Expected: FAIL, cannot resolve `../lib/contracts/LicenseHunter`.

- [ ] **Step 2: Write `frontend/lib/contracts/LicenseHunter.ts`**

```ts
import { createClient } from "genlayer-js";

import { GENLAYER_CHAIN } from "../genlayer/client";

export type Verdict = "COPY_UNLICENSED" | "COPY_LICENSED" | "DIFFERENT_WORK" | "UNCLEAR";
export type ClaimStatus = "NOTICE_ISSUED" | "NO_NOTICE" | "PAID" | "WITHDRAWN" | "DISPUTE_REJECTED";

export type Work = {
  id: number;
  creator: string;
  title: string;
  imageUrl: string;
  portfolioUrl: string;
  basePrice: bigint;
  terms: string;
  watchUrls: string[];
  createdAt: number;
};

export type Claim = {
  id: number;
  workId: number;
  pageUrl: string;
  imageUrl: string;
  filedBy: string;
  verdict: Verdict;
  usage: string;
  prominence: string;
  reasoning: string;
  walletOnPage: string;
  fee: bigint;
  status: ClaimStatus;
  disputeProofUrl: string;
  createdAt: number;
};

export type License = {
  id: number;
  claimId: number;
  workId: number;
  licensee: string;
  pageUrl: string;
  amount: bigint;
  creatorAmount: bigint;
  issuedAt: number;
  expiresAt: number;
};

export type Stats = {
  owner: string;
  agent: string;
  works: number;
  claims: number;
  licenses: number;
  claimsByStatus: Record<ClaimStatus, number>;
  totalLicenseRevenue: bigint;
  protocolBalance: bigint;
};

type Row = Record<string, unknown>;

export function toPlain(value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries([...value.entries()].map(([key, item]) => [String(key), toPlain(item)]));
  }
  if (Array.isArray(value)) return value.map(toPlain);
  return value;
}

const big = (value: unknown): bigint => (typeof value === "bigint" ? value : BigInt(String(value ?? 0)));
const num = (value: unknown): number => Number(value ?? 0);
const str = (value: unknown): string => String(value ?? "");

export function toWork(row: Row): Work {
  return {
    id: num(row.id),
    creator: str(row.creator),
    title: str(row.title),
    imageUrl: str(row.image_url),
    portfolioUrl: str(row.portfolio_url),
    basePrice: big(row.base_price),
    terms: str(row.terms),
    watchUrls: Array.isArray(row.watch_urls) ? row.watch_urls.map(String) : [],
    createdAt: num(row.created_at),
  };
}

export function toClaim(row: Row): Claim {
  return {
    id: num(row.id),
    workId: num(row.work_id),
    pageUrl: str(row.page_url),
    imageUrl: str(row.image_url),
    filedBy: str(row.filed_by),
    verdict: str(row.verdict) as Verdict,
    usage: str(row.usage),
    prominence: str(row.prominence),
    reasoning: str(row.reasoning),
    walletOnPage: str(row.wallet_on_page),
    fee: big(row.fee),
    status: str(row.status) as ClaimStatus,
    disputeProofUrl: str(row.dispute_proof_url),
    createdAt: num(row.created_at),
  };
}

export function toLicense(row: Row): License {
  return {
    id: num(row.id),
    claimId: num(row.claim_id),
    workId: num(row.work_id),
    licensee: str(row.licensee),
    pageUrl: str(row.page_url),
    amount: big(row.amount),
    creatorAmount: big(row.creator_amount),
    issuedAt: num(row.issued_at),
    expiresAt: num(row.expires_at),
  };
}

export function toStats(row: Row): Stats {
  const byStatus = (toPlain(row.claims_by_status) ?? {}) as Row;
  return {
    owner: str(row.owner),
    agent: str(row.agent),
    works: num(row.works),
    claims: num(row.claims),
    licenses: num(row.licenses),
    claimsByStatus: {
      NOTICE_ISSUED: num(byStatus.NOTICE_ISSUED),
      NO_NOTICE: num(byStatus.NO_NOTICE),
      PAID: num(byStatus.PAID),
      WITHDRAWN: num(byStatus.WITHDRAWN),
      DISPUTE_REJECTED: num(byStatus.DISPUTE_REJECTED),
    },
    totalLicenseRevenue: big(row.total_license_revenue),
    protocolBalance: big(row.protocol_balance),
  };
}

export default class LicenseHunter {
  private client: any;

  constructor(
    private readonly contractAddress: string,
    address?: string | null,
  ) {
    this.client = LicenseHunter.createClientFor(address);
  }

  private static createClientFor(address?: string | null) {
    const config: any = { chain: GENLAYER_CHAIN };
    if (address) config.account = address as `0x${string}`;
    return createClient(config);
  }

  updateAccount(address: string): void {
    this.client = LicenseHunter.createClientFor(address);
  }

  private async read(functionName: string, args: unknown[] = []): Promise<unknown> {
    const value = await this.client.readContract({
      address: this.contractAddress as `0x${string}`,
      functionName,
      args,
    });
    return toPlain(value);
  }

  async listWorks(): Promise<Work[]> {
    return ((await this.read("list_works")) as Row[]).map(toWork);
  }

  async getWork(workId: number): Promise<Work> {
    return toWork((await this.read("get_work", [workId])) as Row);
  }

  async listClaims(workId: number): Promise<Claim[]> {
    return ((await this.read("list_claims", [workId])) as Row[]).map(toClaim);
  }

  async getClaim(claimId: number): Promise<Claim> {
    return toClaim((await this.read("get_claim", [claimId])) as Row);
  }

  async listNotices(): Promise<Claim[]> {
    return ((await this.read("list_notices")) as Row[]).map(toClaim);
  }

  async getLicense(licenseId: number): Promise<License> {
    return toLicense((await this.read("get_license", [licenseId])) as Row);
  }

  async listLicenses(licensee: string): Promise<License[]> {
    return ((await this.read("list_licenses", [licensee])) as Row[]).map(toLicense);
  }

  async findLicenseForClaim(claimId: number): Promise<License | null> {
    const { licenses } = await this.getStats();
    for (let id = licenses; id >= 1; id -= 1) {
      const license = await this.getLicense(id);
      if (license.claimId === claimId) return license;
    }
    return null;
  }

  async getEarnings(creator: string): Promise<bigint> {
    return big(await this.read("get_earnings", [creator]));
  }

  async getStats(): Promise<Stats> {
    return toStats((await this.read("get_stats")) as Row);
  }
}
```

- [ ] **Step 3: Write `frontend/lib/hooks/useLicenseHunter.ts`**

```ts
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import LicenseHunter from "../contracts/LicenseHunter";
import { getContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";

const QUERY_PREFIX = "license-hunter";

export function useLicenseHunter(): LicenseHunter | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  return useMemo(
    () => (contractAddress ? new LicenseHunter(contractAddress, address) : null),
    [contractAddress, address],
  );
}

function useContractQuery<T>(name: string, params: unknown[], read: (contract: LicenseHunter) => Promise<T>, enabled = true) {
  const contract = useLicenseHunter();
  return useQuery<T, Error>({
    queryKey: [QUERY_PREFIX, name, ...params],
    queryFn: () => read(contract as LicenseHunter),
    enabled: contract !== null && enabled,
    staleTime: 3_000,
    refetchInterval: 15_000,
  });
}

export const useWorks = () => useContractQuery("works", [], (contract) => contract.listWorks());
export const useWork = (id: number) => useContractQuery("work", [id], (contract) => contract.getWork(id), id > 0);
export const useClaims = (workId: number) =>
  useContractQuery("claims", [workId], (contract) => contract.listClaims(workId), workId > 0);
export const useClaim = (id: number) => useContractQuery("claim", [id], (contract) => contract.getClaim(id), id > 0);
export const useNotices = () => useContractQuery("notices", [], (contract) => contract.listNotices());
export const useLicense = (id: number) => useContractQuery("license", [id], (contract) => contract.getLicense(id), id > 0);
export const useLicenseForClaim = (claimId: number, enabled: boolean) =>
  useContractQuery("license-for-claim", [claimId], (contract) => contract.findLicenseForClaim(claimId), claimId > 0 && enabled);
export const useEarnings = (creator: string | null) =>
  useContractQuery("earnings", [creator], (contract) => contract.getEarnings(creator as string), Boolean(creator));
export const useStats = () => useContractQuery("stats", [], (contract) => contract.getStats());

export function useRefreshLicenseHunter() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: [QUERY_PREFIX] }), [queryClient]);
}
```

- [ ] **Step 4: Point `network-consumers.test.tsx` at `LicenseHunter`**

In `frontend/__tests__/network-consumers.test.tsx`:

1. Replace `import FootballBets from "../lib/contracts/FootballBets";` with `import LicenseHunter from "../lib/contracts/LicenseHunter";`.
2. Replace `const contract = new FootballBets(account, account);` with `const contract = new LicenseHunter(account, account);`.

- [ ] **Step 5: Run the frontend checks**

```bash
npm test --workspace frontend
npm run lint --workspace frontend
```

Expected: all Vitest files pass, including the 7 tests in `license-hunter-contract.test.ts` and the updated `network-consumers.test.tsx`; `tsc --noEmit` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/contracts/LicenseHunter.ts frontend/lib/hooks/useLicenseHunter.ts frontend/__tests__/license-hunter-contract.test.ts frontend/__tests__/network-consumers.test.tsx
git commit -m "$(cat <<'EOF'
feat(web): typed LicenseHunter contract reads and query hooks

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: LicenseHunter shell, theme, and landing page

**Files:**
- Delete: `frontend/components/BetsTable.tsx`, `frontend/components/Leaderboard.tsx`, `frontend/components/CreateBetModal.tsx`, `frontend/lib/contracts/FootballBets.ts`, `frontend/lib/contracts/types.ts`, `frontend/lib/hooks/useFootballBets.ts`
- Replace: `frontend/components/Logo.tsx`, `frontend/components/Navbar.tsx`, `frontend/app/page.tsx`, `frontend/public/favicon.svg`, `frontend/.env.example`
- Create: `frontend/components/Footer.tsx`, `frontend/components/PageShell.tsx`, `frontend/__tests__/landing.test.tsx`
- Modify: `frontend/components/AccountPanel.tsx`, `frontend/app/layout.tsx`, `frontend/app/globals.css`, `frontend/public/site.webmanifest`

**Interfaces:**
- Produces:
  - `Logo({ size?, showWordmark?, className? })` and `LogoMark({ size?, className? })`
  - `Navbar()`, with links Works `/works`, Notices `/notices`, Dashboard `/dashboard`, For judges `/judges`
  - `Footer()`
  - `PageShell({ children })`, used by every app page except `/demo/*`

- [ ] **Step 1: Write the failing test `frontend/__tests__/landing.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import LandingPage from "../app/page";

describe("landing page", () => {
  it("states the pitch with the corrected claims", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Turn IP infringement into instant licensing" })).toBeInTheDocument();
    expect(screen.getByText(/checks the sites you watch every 30 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/on-chain, time-stamped notice with a pay link/)).toBeInTheDocument();
    expect(screen.getByText(/Creators keep 97% of every license/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Try the demo/ })).toHaveAttribute("href", "/judges");
  });
});
```

Run: `npm test --workspace frontend -- landing`
Expected: FAIL on the heading assertion (the template page renders the football heading).

- [ ] **Step 2: Remove the football example**

```bash
git rm -q frontend/components/BetsTable.tsx frontend/components/Leaderboard.tsx frontend/components/CreateBetModal.tsx frontend/lib/contracts/FootballBets.ts frontend/lib/contracts/types.ts frontend/lib/hooks/useFootballBets.ts
```

- [ ] **Step 3: Replace `frontend/components/Logo.tsx`**

```tsx
type LogoSize = "sm" | "md" | "lg";

const MARK_SIZES: Record<LogoSize, string> = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" };
const TEXT_SIZES: Record<LogoSize, string> = { sm: "text-base", md: "text-lg", lg: "text-2xl" };

export function LogoMark({ size = "md", className = "" }: { size?: LogoSize; className?: string }) {
  return (
    <svg className={`${MARK_SIZES[size]} ${className}`} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 2 4 7v8c0 7.2 5.1 13.4 12 15 6.9-1.6 12-7.8 12-15V7L16 2Z"
        fill="var(--secondary)"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      <circle cx="16" cy="15" r="5.5" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M16 6.5v4M16 19.5v4M7.5 15h4M20.5 15h4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  size = "md",
  showWordmark = true,
  className = "",
}: {
  size?: LogoSize;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className={`${TEXT_SIZES[size]} font-bold tracking-tight`}>
          License<span className="text-accent">Hunter</span>
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 4: Write the shell components**

`frontend/components/Navbar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountPanel } from "./AccountPanel";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/works", label: "Works" },
  { href: "/notices", label: "Notices" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/judges", label: "For judges" },
];

function NavLinks({ pathname, compact }: { pathname: string; compact?: boolean }) {
  return (
    <>
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 ${compact ? "py-1 text-xs" : "py-2 text-sm"} transition-colors ${
              active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function Navbar() {
  const pathname = usePathname() ?? "";
  return (
    <header className="brand-navbar sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="LicenseHunter home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="flex items-center gap-2">
          <AccountPanel />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden" aria-label="Main">
        <NavLinks pathname={pathname} compact />
      </nav>
    </header>
  );
}
```

`frontend/components/Footer.tsx`:

```tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>LicenseHunter runs on GenLayer Studio Next. Notices are automated findings, not legal advice.</p>
        <div className="flex gap-4">
          <Link href="/judges" className="hover:text-foreground">
            For judges
          </Link>
          <a href="https://github.com/psycho24eth/licensehunter" className="hover:text-foreground">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
```

`frontend/components/PageShell.tsx`:

```tsx
import type { ReactNode } from "react";

import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 5: Remove football points from `frontend/components/AccountPanel.tsx`**

1. Delete the line `import { usePlayerPoints } from "@/lib/hooks/useFootballBets";`.
2. Delete the line `const { data: points = 0 } = usePlayerPoints(address);`.
3. In the connected state, delete the divider `<div className="h-4 w-px bg-white/10" />` and the `<div>` right after it that renders `{points}` and `pts`.
4. In the wallet details dialog, delete the whole `brand-card` block whose label is `Your Points`.
5. Replace the description text `Connect your MetaMask wallet to start betting` with `Connect MetaMask to pay licenses, file claims, and withdraw earnings`.

- [ ] **Step 6: Write the landing page `frontend/app/page.tsx`**

```tsx
import { ArrowRight, Eye, Gavel, Receipt, ScanSearch, Wallet } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/PageShell";
import { buttonVariants } from "@/components/ui/button";

const STEPS = [
  {
    icon: ScanSearch,
    title: "Scan",
    text: "The agent checks the sites you watch every 30 minutes, plus the open web when image search is on.",
  },
  {
    icon: Eye,
    title: "Judge",
    text: "GenLayer validators each compare your work with the copy and must agree the use is unlicensed.",
  },
  {
    icon: Gavel,
    title: "Notice",
    text: "An on-chain, time-stamped notice with a pay link, addressed to the wallet on the page when there is one.",
  },
  {
    icon: Receipt,
    title: "Settle",
    text: "The site owner pays a fee sized by how the image is used and gets a 12-month license.",
  },
  {
    icon: Wallet,
    title: "Earn",
    text: "Creators keep 97% of every license and withdraw whenever they like. No upfront cost.",
  },
];

export default function LandingPage() {
  return (
    <PageShell>
      <section className="py-12 text-center">
        <p className="text-sm font-medium text-accent">Onchain Justice · GenLayer Studio Next</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Turn IP infringement into instant licensing
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Register an image you own. When a site copies it, GenLayer validators decide whether the use is unlicensed, and
          the site owner can settle with a license in one transaction.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/judges" className={buttonVariants({ variant: "gradient", size: "lg" })}>
            Try the demo
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/notices" className={buttonVariants({ variant: "outline", size: "lg" })}>
            See notices
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5" aria-label="How it works">
        {STEPS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="brand-card p-4">
            <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <section className="brand-card mt-10 p-6">
        <h2 className="text-xl font-semibold">Why decentralized judgment</h2>
        <p className="mt-2 text-muted-foreground">
          Whether a page uses someone&apos;s work without permission is a judgment call. When one platform or one AI makes
          that call, it can be wrong or captured. Here, several validators independently look at both images and must
          agree before anyone is asked to pay, and a site owner who already has permission can dispute with proof.
        </p>
      </section>
    </PageShell>
  );
}
```

- [ ] **Step 7: Rebrand metadata, theme, and static assets**

In `frontend/app/layout.tsx`:
- Set `metadata.title` to `"LicenseHunter"`.
- Set `metadata.description` to `"GenLayer validators judge copied images; site owners settle with a license."`.
- Set `viewport.themeColor` to `"#05070d"`.
- Replace the comment `// GenLayer brand purple` with nothing.

In `frontend/app/globals.css`, replace the entire `:root { … }` block **and** the entire `.dark { … }` block with this single block:

```css
:root,
.dark {
  --font-body: 'Switzer';
  --font-display: 'Switzer';

  --background: #05070d;
  --foreground: #f1f5f9;
  --card: #0c111d;
  --card-foreground: #f1f5f9;
  --popover: #0c111d;
  --popover-foreground: #f1f5f9;
  --primary: #00f2fe;
  --primary-foreground: #031016;
  --secondary: #111827;
  --secondary-foreground: #f1f5f9;
  --muted: #0f172a;
  --muted-foreground: #94a3b8;
  --accent: #00f2fe;
  --accent-foreground: #031016;
  --blue: #3b82f6;
  --blue-foreground: #f1f5f9;
  --pink: #7928ca;
  --destructive: #f43f5e;
  --destructive-foreground: #f1f5f9;
  --border: #1e293b;
  --input: #1e293b;
  --ring: #00f2fe;
  --chart-1: #00f2fe;
  --chart-2: #7928ca;
  --chart-3: #10b981;
  --chart-4: #1e293b;
  --chart-5: #f59e0b;
  --radius: 0.5rem;
  --sidebar: #0c111d;
  --sidebar-foreground: #f1f5f9;
  --sidebar-primary: #00f2fe;
  --sidebar-primary-foreground: #031016;
  --sidebar-accent: #111827;
  --sidebar-accent-foreground: #f1f5f9;
  --sidebar-border: #1e293b;
  --sidebar-ring: #00f2fe;
}
```

Then, in the same file, replace these four utility rules with the versions below: `.gradient-purple-pink`, `.brand-card`, `.brand-card-hover:hover`, and `.brand-navbar`.

```css
  .gradient-purple-pink {
    background: linear-gradient(135deg, #00f2fe 0%, #7928ca 100%);
    color: #031016;
  }

  .brand-card {
    background: rgb(12 17 29 / 0.85);
    border: 1px solid #1e293b;
    border-radius: 0.5rem;
    transition: border-color 0.2s ease, transform 0.2s ease;
  }

  .brand-card-hover:hover {
    border-color: rgb(0 242 254 / 0.5);
    transform: translateY(-2px);
  }

  .brand-navbar {
    background: rgb(5 7 13 / 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid #1e293b;
  }
```

In the `body` rule under `@layer base`, add `background-color: var(--background);` so the page never falls back to white.

Replace `frontend/public/favicon.svg` with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M16 2 4 7v8c0 7.2 5.1 13.4 12 15 6.9-1.6 12-7.8 12-15V7L16 2Z" fill="#111827" stroke="#00f2fe" stroke-width="1.5"/><circle cx="16" cy="15" r="5.5" stroke="#00f2fe" stroke-width="1.5"/><path d="M16 6.5v4M16 19.5v4M7.5 15h4M20.5 15h4" stroke="#00f2fe" stroke-width="1.5" stroke-linecap="round"/></svg>
```

In `frontend/public/site.webmanifest`, set `"name"` to `"LicenseHunter"`, `"short_name"` to `"LicenseHunter"`, and every color field to `"#05070d"`.

Replace `frontend/.env.example` with:

```bash
# GenLayer network: Studio Next (Consensus v0.6). Override all four together.
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio-next.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61997
NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studio Next
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN

# Deployed LicenseHunter contract (LICENSE_HUNTER_ADDRESS in the root .env.local)
NEXT_PUBLIC_CONTRACT_ADDRESS=

# Public site URL without a trailing slash; demo links and demo work URLs use it
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Demo wallet addresses printed on the demo pages
NEXT_PUBLIC_DEMO_CREATOR_ADDRESS=
NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS=

# Server-only keys. Never prefix these with NEXT_PUBLIC_.
DEMO_CREATOR_PRIVATE_KEY=
DEMO_SITE_OWNER_PRIVATE_KEY=
AGENT_PRIVATE_KEY=
LICENSE_HUNTER_ADDRESS=
```

- [ ] **Step 8: Run the checks**

```bash
npm test --workspace frontend
npm run lint --workspace frontend
npm run build
```

Expected: all Vitest files pass, including `landing.test.tsx`; `tsc --noEmit` prints nothing; `next build` succeeds, and the output route table lists `/`.

- [ ] **Step 9: Commit**

```bash
git add -A frontend
git commit -m "$(cat <<'EOF'
feat(web): LicenseHunter shell, theme, and landing page

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Formatting and fee helpers

**Files:**
- Create: `frontend/lib/format.ts`, `frontend/__tests__/format.test.ts`

**Interfaces:**
- Consumes: `ClaimStatus`, `Verdict` (Task 1).
- Produces:
  - Rates: `USAGE_BPS`, `PROMINENCE_BPS` (bigint bps), `type Usage`, `type Prominence`
  - Labels: `USAGE_LABELS`, `PROMINENCE_LABELS`, `STATUS_LABELS`, `VERDICT_LABELS`
  - GEN amounts: `formatGen(wei: bigint, maxDecimals?: number): string`, which truncates, e.g. `"43.65 GEN"`; `parseGen(input: string): bigint`, which throws `"Enter an amount like 10 or 2.5"`
  - Fees: `type FeeBreakdown`; `feeBreakdown(basePrice: bigint, usage: string, prominence: string): FeeBreakdown | null`; `multiplierText(bps: bigint): string`, e.g. `"× 1.5"`
  - Misc: `parseWatchUrls(text: string): string[]`, `EXPLORER_URL`, `txLink(hash)`, `addressLink(address)`, `shortAddress(address, visible?)`, `formatDate(seconds: number): string` (e.g. `"2026-09-15 10:00 UTC"`), `siteUrl(path?: string): string`

- [ ] **Step 1: Write the failing test `frontend/__tests__/format.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addressLink,
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
```

If `docs/platform-checks.md` records different explorer link formats, use those in both this test and `txLink`/`addressLink`.

Run: `npm test --workspace frontend -- format`
Expected: FAIL, cannot resolve `../lib/format`.

- [ ] **Step 2: Write `frontend/lib/format.ts`**

```ts
import type { ClaimStatus, Verdict } from "./contracts/LicenseHunter";

const WEI_PER_GEN = 10n ** 18n;

export const USAGE_BPS = { PERSONAL: 5_000n, EDITORIAL: 10_000n, COMMERCIAL: 20_000n, ADS_MERCH: 30_000n } as const;
export const PROMINENCE_BPS = { INCIDENTAL: 5_000n, FEATURED: 10_000n, PRIMARY: 15_000n } as const;
export type Usage = keyof typeof USAGE_BPS;
export type Prominence = keyof typeof PROMINENCE_BPS;

export const USAGE_LABELS: Record<Usage, string> = {
  PERSONAL: "Personal",
  EDITORIAL: "Editorial",
  COMMERCIAL: "Commercial",
  ADS_MERCH: "Ads or merchandise",
};

export const PROMINENCE_LABELS: Record<Prominence, string> = {
  INCIDENTAL: "Incidental",
  FEATURED: "Featured",
  PRIMARY: "Main image",
};

export const STATUS_LABELS: Record<ClaimStatus, string> = {
  NOTICE_ISSUED: "Notice issued",
  NO_NOTICE: "No notice",
  PAID: "Paid",
  WITHDRAWN: "Withdrawn",
  DISPUTE_REJECTED: "Dispute rejected",
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  COPY_UNLICENSED: "Unlicensed copy",
  COPY_LICENSED: "Licensed copy",
  DIFFERENT_WORK: "Different work",
  UNCLEAR: "Unclear",
};

export function formatGen(wei: bigint, maxDecimals = 4): string {
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const whole = abs / WEI_PER_GEN;
  const fraction = (abs % WEI_PER_GEN).toString().padStart(18, "0").slice(0, maxDecimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${fraction ? `${whole}.${fraction}` : whole} GEN`;
}

export function parseGen(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(trimmed)) throw new Error("Enter an amount like 10 or 2.5");
  const [whole, fraction = ""] = trimmed.split(".");
  return BigInt(whole) * WEI_PER_GEN + BigInt(fraction.padEnd(18, "0"));
}

export type FeeBreakdown = {
  basePrice: bigint;
  usageBps: bigint;
  prominenceBps: bigint;
  fee: bigint;
  creatorAmount: bigint;
  protocolAmount: bigint;
};

export function feeBreakdown(basePrice: bigint, usage: string, prominence: string): FeeBreakdown | null {
  if (!(usage in USAGE_BPS) || !(prominence in PROMINENCE_BPS)) return null;
  const usageBps = USAGE_BPS[usage as Usage];
  const prominenceBps = PROMINENCE_BPS[prominence as Prominence];
  const fee = (basePrice * usageBps * prominenceBps) / 100_000_000n;
  const creatorAmount = (fee * 9_700n) / 10_000n;
  return { basePrice, usageBps, prominenceBps, fee, creatorAmount, protocolAmount: fee - creatorAmount };
}

export function multiplierText(bps: bigint): string {
  return `× ${Number(bps) / 10_000}`;
}

export function parseWatchUrls(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export const EXPLORER_URL = "https://explorer-studio-dev.genlayer.com";
export const txLink = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const addressLink = (address: string) => `${EXPLORER_URL}/address/${address}`;

export function shortAddress(address: string, visible = 4): string {
  return address.length > 2 + visible * 2 ? `${address.slice(0, 2 + visible)}…${address.slice(-visible)}` : address;
}

export function formatDate(seconds: number): string {
  return `${new Date(seconds * 1000).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path}`;
}
```

- [ ] **Step 3: Run the checks**

```bash
npm test --workspace frontend
npm run lint --workspace frontend
```

Expected: all Vitest files pass, including `format.test.ts`; `tsc --noEmit` prints nothing.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/format.ts frontend/__tests__/format.test.ts
git commit -m "$(cat <<'EOF'
feat(web): GEN formatting, fee breakdown, and link helpers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Demo roles, server signer, and transaction status APIs

**Files:**
- Create: `frontend/lib/demo/roles.ts`, `frontend/lib/server/rate-limit.ts`, `frontend/lib/server/demo-signer.ts`, `frontend/app/api/demo/write/route.ts`, `frontend/app/api/tx/[hash]/route.ts`, `frontend/lib/demo/DemoModeProvider.tsx`, `frontend/components/DemoRoleSwitcher.tsx`, `deploy/sync-frontend-env.ts`
- Create tests: `frontend/__tests__/demo-roles.test.ts`, `frontend/__tests__/demo-api.test.ts`, `frontend/__tests__/demo-mode.test.tsx`
- Modify: `frontend/package.json`, `frontend/next.config.ts`, `frontend/app/providers.tsx`, `frontend/components/Navbar.tsx`, `package.json` (root), `package-lock.json`

**Interfaces:**
- Consumes:
  - `clientFor`, `submitWrite`, `HEAVY_FEES`, `LIGHT_FEES`, `Hex` from `@licensehunter/agent/genlayer` (Plan 2)
  - `GENLAYER_CHAIN` (`frontend/lib/genlayer/network.ts`), `useWallet` (`frontend/lib/genlayer/wallet.ts`)
  - `loadEnv`, `requireEnv` (`deploy/studio-next.ts`)
- Produces, from `lib/demo/roles.ts` (safe for the browser):
  - `type DemoRole = "creator" | "site-owner"`
  - `DEMO_METHODS`, `DEMO_ROLE_LABELS`
  - `demoAddress(role): string` (reads `NEXT_PUBLIC_DEMO_*_ADDRESS` at call time)
  - `roleForMethod(method): DemoRole | null`
  - `encodeArgs(args: unknown[]): unknown[]`, which turns each `bigint` into `{ "$bigint": "<digits>" }` so it survives JSON
  - `type DemoWriteRequest = { role; method; args: unknown[]; value: bigint }`
  - `class DemoRequestError extends Error { status: 400 | 403 }`
  - `parseDemoWriteRequest(body: unknown): DemoWriteRequest`
- Produces, server side:
  - `createRateLimiter(limit, windowMs, now?)`, returning `() => boolean`
  - `signDemoWrite(request): Promise<Hex>`, `contractAddress(): string`, `class DemoConfigError`
  - `POST /api/demo/write` taking `{ role, method, args, value }`:
    - `200 { hash }`
    - `400 | 403 { error }`
    - `429 { error }` after 6 writes in 60 seconds
    - `503 { error }` when not configured
    - `502 { error }` when submission fails
  - `GET /api/tx/[hash]` returning `200 { hash, status, result, decided, successful }` or `400 { error }`
- Produces, from `DemoModeProvider.tsx`:
  - `DemoModeProvider`
  - `useDemoMode(): { role: DemoRole | null; setRole(role) }`, with the role saved in `localStorage` under `licensehunter.demoRole`
  - `useActingAddress(): string | null`
- Produces `DemoRoleSwitcher()`: radio buttons named "Wallet", "Creator", and "Site owner".

- [ ] **Step 1: Add dependencies and let Next compile the agent workspace**

In `frontend/package.json`, add to `dependencies`:

```json
"@licensehunter/agent": "0.1.0",
"server-only": "0.0.1",
```

Replace `frontend/next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  // The agent workspace ships TypeScript source, so Next compiles it for the API routes.
  transpilePackages: ["@licensehunter/agent"],
};

export default nextConfig;
```

Then run:

```bash
npm install --no-audit --no-fund
ls node_modules/@licensehunter
```

Expected: the install succeeds, and `ls` prints `agent`.

- [ ] **Step 2: Write the failing test `frontend/__tests__/demo-roles.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import { DEMO_METHODS, DemoRequestError, encodeArgs, parseDemoWriteRequest, roleForMethod } from "../lib/demo/roles";

const GEN = 10n ** 18n;

function rejection(body: unknown): DemoRequestError {
  try {
    parseDemoWriteRequest(body);
  } catch (error) {
    if (error instanceof DemoRequestError) return error;
    throw error;
  }
  throw new Error("expected the request to be rejected");
}

describe("demo write allowlist", () => {
  it("matches the spec", () => {
    expect(DEMO_METHODS).toEqual({
      creator: ["register_work", "update_watchlist", "file_claim", "withdraw_earnings"],
      "site-owner": ["pay_license", "dispute"],
    });
  });

  it("finds the role allowed to call a method", () => {
    expect(roleForMethod("withdraw_earnings")).toBe("creator");
    expect(roleForMethod("pay_license")).toBe("site-owner");
    expect(roleForMethod("set_agent")).toBeNull();
  });

  it.each([
    ["creator", "pay_license"],
    ["creator", "dispute"],
    ["creator", "withdraw_protocol_fees"],
    ["site-owner", "register_work"],
    ["site-owner", "withdraw_earnings"],
    ["site-owner", "set_agent"],
  ])("refuses the %s role calling %s with 403", (role, method) => {
    expect(rejection({ role, method, args: [] }).status).toBe(403);
  });

  it("rejects an unknown role with 400", () => {
    expect(rejection({ role: "owner", method: "pay_license" }).status).toBe(400);
  });
});

describe("parseDemoWriteRequest", () => {
  it("parses a license payment with its value", () => {
    expect(
      parseDemoWriteRequest({ role: "site-owner", method: "pay_license", args: [7], value: (45n * GEN).toString() }),
    ).toEqual({ role: "site-owner", method: "pay_license", args: [7], value: 45n * GEN });
  });

  it("round-trips bigint and list arguments through JSON", () => {
    const args = [
      "Cybernetic Horizon",
      "https://site.example/demo/cybernetic-horizon.png",
      "https://site.example/demo/portfolio",
      10n * GEN,
      "Web license, 12 months",
      ["https://site.example/demo/shop"],
    ];
    const body = JSON.parse(JSON.stringify({ role: "creator", method: "register_work", args: encodeArgs(args) }));

    expect(parseDemoWriteRequest(body)).toEqual({ role: "creator", method: "register_work", args, value: 0n });
  });

  it.each([
    [{ role: "creator", method: "withdraw_earnings", value: "5" }, "Only pay_license accepts a value"],
    [{ role: "site-owner", method: "pay_license", args: [1], value: "-1" }, "value must be a whole number of wei"],
    [{ role: "creator", method: "file_claim", args: "1" }, "args must be a list of at most 8 values"],
    [{ role: "creator", method: "file_claim", args: [{ nested: true }] }, "Unsupported argument value"],
    [{ role: "creator", method: "file_claim", args: ["x".repeat(2_001)] }, "Unsupported argument value"],
  ])("rejects %j with 400", (body, message) => {
    const error = rejection(body);
    expect(error.status).toBe(400);
    expect(error.message).toBe(message);
  });
});
```

Run: `npm test --workspace frontend -- demo-roles`
Expected: FAIL, cannot resolve `../lib/demo/roles`.

- [ ] **Step 3: Write `frontend/lib/demo/roles.ts`**

```ts
export type DemoRole = "creator" | "site-owner";

export const DEMO_METHODS: Record<DemoRole, readonly string[]> = {
  creator: ["register_work", "update_watchlist", "file_claim", "withdraw_earnings"],
  "site-owner": ["pay_license", "dispute"],
};

export const DEMO_ROLE_LABELS: Record<DemoRole, string> = {
  creator: "Demo creator",
  "site-owner": "Demo site owner",
};

export function demoAddress(role: DemoRole): string {
  const address =
    role === "creator" ? process.env.NEXT_PUBLIC_DEMO_CREATOR_ADDRESS : process.env.NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS;
  return address ?? "";
}

export function roleForMethod(method: string): DemoRole | null {
  if (DEMO_METHODS.creator.includes(method)) return "creator";
  if (DEMO_METHODS["site-owner"].includes(method)) return "site-owner";
  return null;
}

export type DemoWriteRequest = { role: DemoRole; method: string; args: unknown[]; value: bigint };

export class DemoRequestError extends Error {
  constructor(
    readonly status: 400 | 403,
    message: string,
  ) {
    super(message);
  }
}

const MAX_ARGS = 8;
const MAX_LIST_ITEMS = 10;
const MAX_STRING_CHARS = 2_000;
const WEI_PATTERN = /^\d{1,40}$/;

type BigintWire = { $bigint: string };

export function encodeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === "bigint") return { $bigint: arg.toString() } satisfies BigintWire;
    return Array.isArray(arg) ? encodeArgs(arg) : arg;
  });
}

function isBigintWire(value: unknown): value is BigintWire {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const digits = (value as Partial<BigintWire>).$bigint;
  return Object.keys(value).length === 1 && typeof digits === "string" && WEI_PATTERN.test(digits);
}

function decodeArg(value: unknown, insideList: boolean): unknown {
  if (typeof value === "string" && value.length <= MAX_STRING_CHARS) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (Array.isArray(value) && !insideList && value.length <= MAX_LIST_ITEMS) {
    return value.map((item) => decodeArg(item, true));
  }
  if (isBigintWire(value)) return BigInt(value.$bigint);
  throw new DemoRequestError(400, "Unsupported argument value");
}

export function parseDemoWriteRequest(body: unknown): DemoWriteRequest {
  if (typeof body !== "object" || body === null) throw new DemoRequestError(400, "Send a JSON object");
  const { role, method, args = [], value = "0" } = body as Record<string, unknown>;
  if (role !== "creator" && role !== "site-owner") throw new DemoRequestError(400, "Unknown demo role");
  if (typeof method !== "string" || !DEMO_METHODS[role].includes(method)) {
    throw new DemoRequestError(403, `The ${DEMO_ROLE_LABELS[role].toLowerCase()} cannot call ${String(method)}`);
  }
  if (!Array.isArray(args) || args.length > MAX_ARGS) {
    throw new DemoRequestError(400, `args must be a list of at most ${MAX_ARGS} values`);
  }
  if (typeof value !== "string" || !WEI_PATTERN.test(value)) {
    throw new DemoRequestError(400, "value must be a whole number of wei");
  }
  const wei = BigInt(value);
  if (wei > 0n && method !== "pay_license") throw new DemoRequestError(400, "Only pay_license accepts a value");
  return { role, method, args: args.map((arg) => decodeArg(arg, false)), value: wei };
}
```

Run: `npm test --workspace frontend -- demo-roles`
Expected: PASS, 16 tests.

- [ ] **Step 4: Write the failing test `frontend/__tests__/demo-api.test.ts`**

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  isDecidedState: (status: string) => ["ACCEPTED", "FINALIZED", "UNDETERMINED"].includes(status),
  isSuccessful: (tx: { statusName?: string; txExecutionResultName?: string }) =>
    ["ACCEPTED", "FINALIZED"].includes(tx.statusName ?? "") && tx.txExecutionResultName === "FINISHED_WITH_RETURN",
}));

const CONTRACT = "0x00000000000000000000000000000000000000c0";
const HASH = `0x${"ab".repeat(32)}`;
const GEN = 10n ** 18n;

async function writeRoute() {
  vi.resetModules();
  return import("../app/api/demo/write/route");
}

function post(body: unknown) {
  return new Request("http://localhost/api/demo/write", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("LICENSE_HUNTER_ADDRESS", CONTRACT);
  vi.stubEnv("DEMO_CREATOR_PRIVATE_KEY", "0xcreator-key");
  vi.stubEnv("DEMO_SITE_OWNER_PRIVATE_KEY", "0xsite-owner-key");
  mocks.clientFor.mockClear();
  mocks.submitWrite.mockReset().mockResolvedValue(HASH);
  mocks.getTransaction.mockReset();
});

describe("POST /api/demo/write", () => {
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
```

Run: `npm test --workspace frontend -- demo-api`
Expected: FAIL, cannot resolve `../app/api/demo/write/route`.

- [ ] **Step 5: Write the rate limiter, the signer, and both routes**

`frontend/lib/server/rate-limit.ts`:

```ts
/** Allows at most `limit` calls per rolling window. The state lives in one server instance only. */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  let recent: number[] = [];
  return function tryAcquire(): boolean {
    const time = now();
    recent = recent.filter((stamp) => time - stamp < windowMs);
    if (recent.length >= limit) return false;
    recent.push(time);
    return true;
  };
}
```

`frontend/lib/server/demo-signer.ts`:

```ts
import "server-only";

import { clientFor, HEAVY_FEES, LIGHT_FEES, submitWrite, type Hex } from "@licensehunter/agent/genlayer";

import type { DemoRole, DemoWriteRequest } from "@/lib/demo/roles";

const KEY_ENV: Record<DemoRole, "DEMO_CREATOR_PRIVATE_KEY" | "DEMO_SITE_OWNER_PRIVATE_KEY"> = {
  creator: "DEMO_CREATOR_PRIVATE_KEY",
  "site-owner": "DEMO_SITE_OWNER_PRIVATE_KEY",
};

// These methods make validators fetch pages or images, so they need the larger time allocation.
const HEAVY_METHODS = new Set(["register_work", "file_claim", "dispute"]);
// These methods pay out through an emitted message, which needs a declared fee allocation (docs/platform-checks.md).
const MESSAGE_METHODS = new Set(["withdraw_earnings", "withdraw_protocol_fees"]);

export class DemoConfigError extends Error {}

export function contractAddress(): string {
  const address = process.env.LICENSE_HUNTER_ADDRESS || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address) throw new DemoConfigError("The contract address is not configured.");
  return address;
}

export async function signDemoWrite(request: DemoWriteRequest): Promise<Hex> {
  const privateKey = process.env[KEY_ENV[request.role]];
  if (!privateKey) throw new DemoConfigError("Demo mode is not configured on this deployment.");
  return submitWrite(clientFor(privateKey as Hex), contractAddress(), request.method, request.args, {
    value: request.value,
    fees: HEAVY_METHODS.has(request.method) ? HEAVY_FEES : LIGHT_FEES,
    emitsMessages: MESSAGE_METHODS.has(request.method),
  });
}
```

`frontend/app/api/demo/write/route.ts`:

```ts
import { DemoRequestError, parseDemoWriteRequest } from "@/lib/demo/roles";
import { DemoConfigError, signDemoWrite } from "@/lib/server/demo-signer";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const tryWrite = createRateLimiter(6, 60_000);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body" }, { status: 400 });
  }

  try {
    const demoWrite = parseDemoWriteRequest(body);
    if (!tryWrite()) {
      return Response.json({ error: "Demo mode is busy. Try again in a minute." }, { status: 429 });
    }
    return Response.json({ hash: await signDemoWrite(demoWrite) });
  } catch (error) {
    if (error instanceof DemoRequestError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof DemoConfigError) return Response.json({ error: error.message }, { status: 503 });
    console.error("demo write failed:", (error as Error).message);
    return Response.json({ error: "The transaction could not be submitted. Try again." }, { status: 502 });
  }
}
```

`frontend/app/api/tx/[hash]/route.ts`:

```ts
import { createClient, isDecidedState, isSuccessful } from "genlayer-js";

import { GENLAYER_CHAIN } from "@/lib/genlayer/network";

export const runtime = "nodejs";

const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!HASH_PATTERN.test(hash)) return Response.json({ error: "Not a transaction hash" }, { status: 400 });

  try {
    const tx = await createClient({ chain: GENLAYER_CHAIN }).getTransaction({ hash: hash as never });
    const status = String(tx.statusName ?? "PENDING");
    const decided = isDecidedState(status);
    return Response.json(
      { hash, status, result: tx.txExecutionResultName ?? null, decided, successful: decided ? isSuccessful(tx) : null },
      { headers: NO_STORE },
    );
  } catch {
    // A just-submitted transaction may not be indexed yet; the caller keeps polling.
    return Response.json(
      { hash, status: "UNKNOWN", result: null, decided: false, successful: null },
      { headers: NO_STORE },
    );
  }
}
```

Run: `npm test --workspace frontend -- demo-api`
Expected: PASS, 11 tests, with no console output.

- [ ] **Step 6: Write the failing test `frontend/__tests__/demo-mode.test.tsx`**

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/genlayer/wallet", () => ({
  useWallet: () => ({ address: "0x000000000000000000000000000000000000a11e" }),
}));

import { DemoRoleSwitcher } from "../components/DemoRoleSwitcher";
import { DemoModeProvider, useActingAddress } from "../lib/demo/DemoModeProvider";

const CREATOR = "0xA11ce00000000000000000000000000000000001";
const SITE_OWNER = "0xb0b0000000000000000000000000000000000002";

function ActingAddress() {
  return <output>{useActingAddress() ?? "none"}</output>;
}

function renderSwitcher() {
  return render(
    <DemoModeProvider>
      <DemoRoleSwitcher />
      <ActingAddress />
    </DemoModeProvider>,
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DEMO_CREATOR_ADDRESS", CREATOR);
  vi.stubEnv("NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS", SITE_OWNER);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("demo mode", () => {
  it("acts as the connected wallet until a demo role is chosen", () => {
    renderSwitcher();

    expect(screen.getByRole("radio", { name: "Wallet" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent("0x000000000000000000000000000000000000a11e");
  });

  it("switches to a demo role and remembers it", () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole("radio", { name: "Site owner" }));

    expect(screen.getByRole("radio", { name: "Site owner" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent(SITE_OWNER);
    expect(window.localStorage.getItem("licensehunter.demoRole")).toBe("site-owner");
  });

  it("restores the saved role", async () => {
    window.localStorage.setItem("licensehunter.demoRole", "creator");

    renderSwitcher();

    expect(await screen.findByText(CREATOR)).toBeInTheDocument();
  });
});
```

Run: `npm test --workspace frontend -- demo-mode`
Expected: FAIL, cannot resolve `../components/DemoRoleSwitcher`.

- [ ] **Step 7: Write the provider and the switcher, and wire them in**

`frontend/lib/demo/DemoModeProvider.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { demoAddress, type DemoRole } from "@/lib/demo/roles";
import { useWallet } from "@/lib/genlayer/wallet";

const STORAGE_KEY = "licensehunter.demoRole";

type DemoMode = { role: DemoRole | null; setRole: (role: DemoRole | null) => void };

const DemoModeContext = createContext<DemoMode>({ role: null, setRole: () => {} });

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DemoRole | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "creator" || saved === "site-owner") setRoleState(saved);
    } catch {
      // Storage can be unavailable (private windows); start in wallet mode.
    }
  }, []);

  const setRole = useCallback((next: DemoRole | null) => {
    setRoleState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The role still applies for this visit.
    }
  }, []);

  const value = useMemo(() => ({ role, setRole }), [role, setRole]);
  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoMode {
  return useContext(DemoModeContext);
}

/** The address the app acts as: the active demo role's wallet, or else the connected wallet. */
export function useActingAddress(): string | null {
  const { role } = useDemoMode();
  const { address } = useWallet();
  return role ? demoAddress(role) || null : address;
}
```

`frontend/components/DemoRoleSwitcher.tsx`:

```tsx
"use client";

import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { DEMO_ROLE_LABELS, demoAddress, type DemoRole } from "@/lib/demo/roles";

const OPTIONS: Array<{ role: DemoRole | null; label: string; title: string }> = [
  { role: null, label: "Wallet", title: "Use your own MetaMask wallet" },
  { role: "creator", label: "Creator", title: DEMO_ROLE_LABELS.creator },
  { role: "site-owner", label: "Site owner", title: DEMO_ROLE_LABELS["site-owner"] },
];

export function DemoRoleSwitcher() {
  const { role, setRole } = useDemoMode();

  return (
    <div role="radiogroup" aria-label="Act as" className="flex rounded-md border border-border p-0.5 text-xs">
      {OPTIONS.map((option) => {
        const active = option.role === role;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            disabled={option.role !== null && !demoAddress(option.role)}
            onClick={() => setRole(option.role)}
            className={`whitespace-nowrap rounded px-2 py-1 transition-colors disabled:opacity-40 ${
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
```

In `frontend/app/providers.tsx`:
1. Add `import { DemoModeProvider } from "@/lib/demo/DemoModeProvider";` below the `WalletProvider` import.
2. Replace `{children}` inside `<WalletProvider>` with `<DemoModeProvider>{children}</DemoModeProvider>`.

In `frontend/components/Navbar.tsx`:
1. Add these imports below the `next/navigation` import:
   ```tsx
   import { useDemoMode } from "@/lib/demo/DemoModeProvider";

   import { DemoRoleSwitcher } from "./DemoRoleSwitcher";
   ```
2. In `Navbar`, add `const { role } = useDemoMode();` below the `pathname` line.
3. Replace `<AccountPanel />` with:
   ```tsx
   <DemoRoleSwitcher />
   {role === null && <AccountPanel />}
   ```

Run: `npm test --workspace frontend -- demo-mode`
Expected: PASS, 3 tests.

- [ ] **Step 8: Write `deploy/sync-frontend-env.ts`**

```ts
import { writeFileSync } from "node:fs";

import { loadEnv, requireEnv } from "./studio-next";

const TARGET = "frontend/.env.local";

loadEnv();

const values: Record<string, string> = {
  NEXT_PUBLIC_CONTRACT_ADDRESS: requireEnv("LICENSE_HUNTER_ADDRESS"),
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_DEMO_CREATOR_ADDRESS: requireEnv("DEMO_CREATOR_ADDRESS"),
  NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS: requireEnv("DEMO_SITE_OWNER_ADDRESS"),
  LICENSE_HUNTER_ADDRESS: requireEnv("LICENSE_HUNTER_ADDRESS"),
  AGENT_PRIVATE_KEY: requireEnv("AGENT_PRIVATE_KEY"),
  DEMO_CREATOR_PRIVATE_KEY: requireEnv("DEMO_CREATOR_PRIVATE_KEY"),
  DEMO_SITE_OWNER_PRIVATE_KEY: requireEnv("DEMO_SITE_OWNER_PRIVATE_KEY"),
};

writeFileSync(TARGET, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n")}\n`);
// Print key names only; the values include private keys.
console.log(`wrote ${TARGET}: ${Object.keys(values).join(", ")}`);
```

In the root `package.json`, add `"sync:web": "tsx deploy/sync-frontend-env.ts"` to `scripts`. Then run:

```bash
npm run sync:web
git check-ignore frontend/.env.local
```

Expected: the first command prints `wrote frontend/.env.local:` followed by the eight key names. The second prints `frontend/.env.local`, which proves the file is ignored. If `git check-ignore` prints nothing, add `frontend/.env.local` to `.gitignore` before continuing.

- [ ] **Step 9: Run the checks**

```bash
npm test --workspace frontend
npm run lint --workspace frontend
npm run build
```

Expected: all Vitest files pass, including the three new files (16 + 11 + 3 tests). `tsc --noEmit` prints nothing. `next build` succeeds, and its route table lists `/api/demo/write` and `/api/tx/[hash]` as dynamic (`ƒ`).

- [ ] **Step 10: Commit**

```bash
git add frontend/lib/demo frontend/lib/server frontend/app/api frontend/components/DemoRoleSwitcher.tsx frontend/components/Navbar.tsx frontend/app/providers.tsx frontend/next.config.ts frontend/package.json frontend/__tests__/demo-roles.test.ts frontend/__tests__/demo-api.test.ts frontend/__tests__/demo-mode.test.tsx deploy/sync-frontend-env.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat(web): demo roles with server-side signing and transaction status API

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: One write button for demo and wallet modes

**Files:**
- Create: `frontend/lib/tx.ts`, `frontend/components/WriteAction.tsx`, `frontend/__tests__/tx.test.ts`, `frontend/__tests__/write-action.test.tsx`

**Interfaces:**
- Consumes:
  - `useDemoMode`, `roleForMethod`, `DEMO_ROLE_LABELS`, `encodeArgs`, `type DemoRole` (Task 4)
  - `txLink` (Task 3)
  - `useRefreshLicenseHunter` (Task 1)
  - `useTransactionKit` (template `lib/genlayer/kit.ts`), `useWallet`, `getContractAddress`, `GENLAYER_NETWORK` (template)
  - `GenLayerTransactionPanel`, `type SubmitInput`, `type TrackedStatus` (`@genlayer/transaction-kit-react`); the panel sends `userValue` as the transaction `value`
- Produces, from `lib/tx.ts`:
  - `type TxStatus = { hash; status; result: string | null; decided: boolean; successful: boolean | null }`, the shape `GET /api/tx/[hash]` returns
  - `UNDECIDED_MESSAGE`, `STILL_WAITING_MESSAGE`
  - `outcomeMessage(status: TxStatus): string | null`
  - `submitDemoWrite({ role, method, args, value? }, fetchFn?): Promise<string>`, which throws the API's `error` text
  - `waitForDemoTx(hash, { fetchFn?, intervalMs? = 4000, timeoutMs? = 300000, wait? }?): Promise<TxStatus>`, which returns the last status once decided or timed out
- Produces `WriteAction({ method, args, label, value?, disabled?, onBeforeSubmit?, onSuccess?, variant? })`:
  - **Demo role matches `roleForMethod(method)`:** posts to `/api/demo/write`, polls, then shows "Done." or the outcome text.
  - **Demo role does not match:** a disabled button plus "Switch to the <role> role to do this."
  - **Wallet mode:** opens `GenLayerTransactionPanel` with `userValue={value}` and `trackUntil="decided"`.
  - **On success:** calls `useRefreshLicenseHunter()` and `onSuccess`.

- [ ] **Step 1: Write the failing test `frontend/__tests__/tx.test.ts`**

```ts
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
```

Run: `npm test --workspace frontend -- tx.test`
Expected: FAIL, cannot resolve `../lib/tx`.

- [ ] **Step 2: Write `frontend/lib/tx.ts`**

```ts
import { encodeArgs, type DemoRole } from "@/lib/demo/roles";

export type TxStatus = {
  hash: string;
  status: string;
  result: string | null;
  decided: boolean;
  successful: boolean | null;
};

export const UNDECIDED_MESSAGE =
  "Validators couldn't agree, so nothing was recorded. Try again, or the agent will retry on its next run.";
export const STILL_WAITING_MESSAGE = "Still waiting for validators. Check the transaction in the explorer.";

export function outcomeMessage(status: TxStatus): string | null {
  if (!status.decided || status.successful) return null;
  if (status.status === "UNDETERMINED") return UNDECIDED_MESSAGE;
  if (status.result === "FINISHED_WITH_ERROR") {
    return "The contract rejected this transaction. Open it in the explorer to see why.";
  }
  return `The transaction ended with status ${status.status}.`;
}

export async function submitDemoWrite(
  request: { role: DemoRole; method: string; args: unknown[]; value?: bigint },
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchFn("/api/demo/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: request.role,
      method: request.method,
      args: encodeArgs(request.args),
      value: (request.value ?? 0n).toString(),
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { hash?: string; error?: string };
  if (!response.ok || !body.hash) throw new Error(body.error ?? `The demo write failed with HTTP ${response.status}.`);
  return body.hash;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForDemoTx(
  hash: string,
  {
    fetchFn = fetch,
    intervalMs = 4_000,
    timeoutMs = 300_000,
    wait = sleep,
  }: { fetchFn?: typeof fetch; intervalMs?: number; timeoutMs?: number; wait?: (ms: number) => Promise<void> } = {},
): Promise<TxStatus> {
  let status: TxStatus = { hash, status: "SUBMITTED", result: null, decided: false, successful: null };
  for (let waited = 0; ; waited += intervalMs) {
    const response = await fetchFn(`/api/tx/${hash}`, { cache: "no-store" });
    if (response.ok) status = (await response.json()) as TxStatus;
    if (status.decided || waited >= timeoutMs) return status;
    await wait(intervalMs);
  }
}
```

Run: `npm test --workspace frontend -- tx.test`
Expected: PASS, 7 tests.

- [ ] **Step 3: Write the failing test `frontend/__tests__/write-action.test.tsx`**

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  role: null as null | "creator" | "site-owner",
  address: null as string | null,
  refresh: vi.fn(),
}));

vi.mock("@/lib/demo/DemoModeProvider", () => ({ useDemoMode: () => ({ role: state.role, setRole: () => {} }) }));
vi.mock("@/lib/genlayer/wallet", () => ({ useWallet: () => ({ address: state.address }) }));
vi.mock("@/lib/genlayer/kit", async () => {
  const { createMockKit } = await import("@genlayer/transaction-kit-react");
  const kit = createMockKit({ delays: { estimate: 0, submit: 0, step: 0 } });
  return { useTransactionKit: (address: string | null) => (address ? kit : null) };
});
vi.mock("@/lib/genlayer/client", () => ({
  getContractAddress: () => "0x00000000000000000000000000000000000000c0",
  GENLAYER_NETWORK: { chainName: "GenLayer Studio Next" },
}));
vi.mock("@/lib/hooks/useLicenseHunter", () => ({ useRefreshLicenseHunter: () => state.refresh }));

import { WriteAction } from "../components/WriteAction";
import { UNDECIDED_MESSAGE } from "../lib/tx";

const HASH = `0x${"ef".repeat(32)}`;
const GEN = 10n ** 18n;

const reply = (body: unknown, httpStatus = 200) =>
  ({ ok: httpStatus < 400, status: httpStatus, json: async () => body }) as unknown as Response;

const decided = (overrides: Record<string, unknown> = {}) =>
  reply({ hash: HASH, status: "ACCEPTED", result: "FINISHED_WITH_RETURN", decided: true, successful: true, ...overrides });

const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
  url === "/api/demo/write" ? reply({ hash: HASH }) : decided(),
);

beforeEach(() => {
  state.role = null;
  state.address = null;
  state.refresh.mockClear();
  fetchMock.mockClear();
  fetchMock.mockImplementation(async (url: string) => (url === "/api/demo/write" ? reply({ hash: HASH }) : decided()));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WriteAction in demo mode", () => {
  it("signs through the demo API, waits for validators, and refreshes", async () => {
    state.role = "creator";
    const onSuccess = vi.fn();
    render(<WriteAction method="withdraw_earnings" args={[]} label="Withdraw" onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(await screen.findByText(/^Done\./)).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(state.refresh).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      role: "creator",
      method: "withdraw_earnings",
      args: [],
      value: "0",
    });
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/tx/${HASH}`);
  });

  it("sends a payment value as a wei string", async () => {
    state.role = "site-owner";
    render(<WriteAction method="pay_license" args={[7]} value={45n * GEN} label="Pay 45 GEN" />);

    fireEvent.click(screen.getByRole("button", { name: "Pay 45 GEN" }));

    await screen.findByText(/^Done\./);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      args: [7],
      value: "45000000000000000000",
    });
  });

  it("asks for the demo role that may call the method", () => {
    state.role = "creator";
    render(<WriteAction method="pay_license" args={[7]} value={45n * GEN} label="Pay 45 GEN" />);

    expect(screen.getByRole("button", { name: "Pay 45 GEN" })).toBeDisabled();
    expect(screen.getByText("Switch to the demo site owner role to do this.")).toBeInTheDocument();
  });

  it("explains when validators could not agree", async () => {
    state.role = "creator";
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/demo/write" ? reply({ hash: HASH }) : decided({ status: "UNDETERMINED", result: null, successful: false }),
    );
    const onSuccess = vi.fn();
    render(
      <WriteAction
        method="file_claim"
        args={[1, "https://a.example/p", "https://a.example/i.png"]}
        label="File claim"
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "File claim" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(UNDECIDED_MESSAGE);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("shows the API's error", async () => {
    state.role = "creator";
    fetchMock.mockImplementation(async () => reply({ error: "Demo mode is busy. Try again in a minute." }, 429));
    render(<WriteAction method="withdraw_earnings" args={[]} label="Withdraw" />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Demo mode is busy. Try again in a minute.");
  });

  it("does nothing when onBeforeSubmit returns false", () => {
    state.role = "creator";
    render(<WriteAction method="withdraw_earnings" args={[]} label="Withdraw" onBeforeSubmit={() => false} />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("WriteAction in wallet mode", () => {
  it("asks for a wallet when none is connected", () => {
    render(<WriteAction method="update_watchlist" args={[1, []]} label="Save watchlist" />);

    expect(screen.getByRole("button", { name: "Save watchlist" })).toBeDisabled();
    expect(screen.getByText("Connect a wallet, or switch to a demo role.")).toBeInTheDocument();
  });

  it("explains that wallet payouts go through the demo creator role", () => {
    state.address = "0x000000000000000000000000000000000000a11e";
    render(<WriteAction method="withdraw_earnings" args={[]} label="Withdraw" />);

    expect(screen.getByRole("button", { name: "Withdraw" })).toBeDisabled();
    expect(
      screen.getByText(
        "Wallet payouts need a message fee allocation the Transaction Kit can't send yet. Switch to the demo creator role to withdraw.",
      ),
    ).toBeInTheDocument();
  });

  it("opens the transaction panel and finishes when the wallet flow succeeds", async () => {
    state.address = "0x000000000000000000000000000000000000a11e";
    const onSuccess = vi.fn();
    render(<WriteAction method="update_watchlist" args={[1, []]} label="Save watchlist" onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: "Save watchlist" }));
    const hold = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>("button.gltk-hold");
      if (!button) throw new Error("Hold to sign button was not rendered");
      expect(button).toBeEnabled();
      return button;
    });
    fireEvent.click(hold);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

Run: `npm test --workspace frontend -- write-action`
Expected: FAIL, cannot resolve `../components/WriteAction`.

- [ ] **Step 4: Write `frontend/components/WriteAction.tsx`**

```tsx
"use client";

import { GenLayerTransactionPanel, type SubmitInput, type TrackedStatus } from "@genlayer/transaction-kit-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { DEMO_ROLE_LABELS, roleForMethod, type DemoRole } from "@/lib/demo/roles";
import { txLink } from "@/lib/format";
import { GENLAYER_NETWORK, getContractAddress } from "@/lib/genlayer/client";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { useRefreshLicenseHunter } from "@/lib/hooks/useLicenseHunter";
import { outcomeMessage, STILL_WAITING_MESSAGE, submitDemoWrite, UNDECIDED_MESSAGE, waitForDemoTx } from "@/lib/tx";

type Phase =
  | { name: "idle" }
  | { name: "submitting" }
  | { name: "pending"; hash: string }
  | { name: "wallet" }
  | { name: "done"; hash?: string }
  | { name: "failed"; message: string; hash?: string };

export type WriteActionProps = {
  method: string;
  args: unknown[];
  label: string;
  value?: bigint;
  disabled?: boolean;
  /** Runs first when the button is pressed; return false to stop, for example when a form is invalid. */
  onBeforeSubmit?: () => boolean;
  onSuccess?: () => void;
  variant?: "default" | "gradient" | "outline" | "secondary";
};

// The Transaction Kit submits fees without message allocations, and Studio Next rejects payout messages
// without them (docs/platform-checks.md), so payouts run through the demo creator role for now.
const WALLET_BLOCKED_METHODS = new Set(["withdraw_earnings", "withdraw_protocol_fees"]);

function blockedReason(options: {
  contractAddress: string;
  method: string;
  role: DemoRole | null;
  requiredRole: DemoRole | null;
  address: string | null;
  hasKit: boolean;
}): string | null {
  if (!options.contractAddress) return "Set NEXT_PUBLIC_CONTRACT_ADDRESS to enable this action.";
  if (options.role) {
    if (options.requiredRole === options.role) return null;
    return options.requiredRole
      ? `Switch to the ${DEMO_ROLE_LABELS[options.requiredRole].toLowerCase()} role to do this.`
      : "Switch to your wallet to do this.";
  }
  if (WALLET_BLOCKED_METHODS.has(options.method)) {
    return "Wallet payouts need a message fee allocation the Transaction Kit can't send yet. Switch to the demo creator role to withdraw.";
  }
  if (!options.address) return "Connect a wallet, or switch to a demo role.";
  if (!options.hasKit) return "Your wallet is not ready. Reconnect it and try again.";
  return null;
}

function TxLink({ hash }: { hash?: string }) {
  if (!hash) return null;
  return (
    <a href={txLink(hash)} target="_blank" rel="noreferrer" className="underline">
      View transaction
    </a>
  );
}

export function WriteAction({
  method,
  args,
  label,
  value,
  disabled,
  onBeforeSubmit,
  onSuccess,
  variant = "gradient",
}: WriteActionProps) {
  const { role } = useDemoMode();
  const { address } = useWallet();
  const kit = useTransactionKit(address);
  const refresh = useRefreshLicenseHunter();
  const contractAddress = getContractAddress();
  const [phase, setPhase] = useState<Phase>({ name: "idle" });

  // The panel re-estimates fees whenever the tx object changes, so its identity must stay stable across renders.
  const argsKey = JSON.stringify(args, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
  const tx = useMemo<SubmitInput>(
    () => ({ kind: "write", address: contractAddress as `0x${string}`, method, args }),
    [contractAddress, method, argsKey],
  );

  const reason = blockedReason({
    contractAddress,
    method,
    role,
    requiredRole: roleForMethod(method),
    address,
    hasKit: kit !== null,
  });
  const busy = phase.name === "submitting" || phase.name === "pending";

  function succeed(hash?: string) {
    setPhase({ name: "done", hash });
    void refresh();
    onSuccess?.();
  }

  async function runDemoWrite(demoRole: DemoRole) {
    setPhase({ name: "submitting" });
    let hash: string | undefined;
    try {
      hash = await submitDemoWrite({ role: demoRole, method, args, value });
      setPhase({ name: "pending", hash });
      const status = await waitForDemoTx(hash);
      if (status.successful) {
        succeed(hash);
        return;
      }
      const message = status.decided ? (outcomeMessage(status) ?? UNDECIDED_MESSAGE) : STILL_WAITING_MESSAGE;
      setPhase({ name: "failed", message, hash });
    } catch (error) {
      setPhase({ name: "failed", message: (error as Error).message, hash });
    }
  }

  function start() {
    if (onBeforeSubmit && !onBeforeSubmit()) return;
    if (role) void runDemoWrite(role);
    else setPhase({ name: "wallet" });
  }

  function handleWalletDone(status: TrackedStatus) {
    if (status.successful !== false) {
      succeed(status.genlayerTxId);
      return;
    }
    const message = status.statusName === "UNDETERMINED" ? UNDECIDED_MESSAGE : "The transaction did not succeed.";
    setPhase({ name: "failed", message, hash: status.genlayerTxId });
  }

  return (
    <div className="space-y-2">
      {phase.name === "wallet" && kit ? (
        <div className="space-y-2">
          <GenLayerTransactionPanel
            kit={kit}
            tx={tx}
            userValue={value}
            network={GENLAYER_NETWORK.chainName}
            theme="dark"
            trackUntil="decided"
            onDone={handleWalletDone}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => setPhase({ name: "idle" })}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant={variant} disabled={Boolean(disabled || reason || busy)} onClick={start}>
          {phase.name === "submitting" ? "Submitting…" : phase.name === "pending" ? "Waiting for validators…" : label}
        </Button>
      )}
      {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
      {phase.name === "pending" && (
        <p role="status" className="text-xs text-muted-foreground">
          Submitted. Validators usually decide within 1–2 minutes. <TxLink hash={phase.hash} />
        </p>
      )}
      {phase.name === "done" && (
        <p role="status" className="text-xs text-emerald-400">
          Done. <TxLink hash={phase.hash} />
        </p>
      )}
      {phase.name === "failed" && (
        <p role="alert" className="text-xs text-destructive">
          {phase.message} <TxLink hash={phase.hash} />
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the checks**

```bash
npm test --workspace frontend
npm run lint --workspace frontend
```

Expected: all Vitest files pass, including `tx.test.ts` (7 tests) and `write-action.test.tsx` (9 tests), with no `act(...)` warnings in the output. `tsc --noEmit` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/tx.ts frontend/components/WriteAction.tsx frontend/__tests__/tx.test.ts frontend/__tests__/write-action.test.tsx
git commit -m "$(cat <<'EOF'
feat(web): one write action for demo roles and wallet signing

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: "Scan now"

**Files:**
- Create: `frontend/app/api/scan/route.ts`, `frontend/__tests__/scan-api.test.ts`

**Interfaces:**
- Consumes: `createLicenseHunterClient`, `runScan`, `type ScanSummary` from `@licensehunter/agent`; `type Hex` from `@licensehunter/agent/genlayer`; `contractAddress`, `DemoConfigError` (Task 4 — the one place that resolves the contract address on the server); `createRateLimiter` (Task 4).
- Produces `POST /api/scan` taking `{ workId: number, runId?: string }`:
  - `200 { worksScanned, candidates, filed: [{ hash, pageUrl, imageUrl, distance }], skipped, errors }`
  - `400 { error }` for a bad body
  - `429 { error }` when a scan already ran in the last 60 seconds
  - `503 { error }` without `AGENT_PRIVATE_KEY` or a contract address
  - `502 { error }` when the scan itself fails

- [ ] **Step 1: Write the failing test `frontend/__tests__/scan-api.test.ts`**

```ts
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
```

Run: `npm test --workspace frontend -- scan-api`
Expected: FAIL, cannot resolve `../app/api/scan/route`.

- [ ] **Step 2: Write `frontend/app/api/scan/route.ts`**

```ts
import { createLicenseHunterClient, runScan, type ScanSummary } from "@licensehunter/agent";
import type { Hex } from "@licensehunter/agent/genlayer";

import { contractAddress, DemoConfigError } from "@/lib/server/demo-signer";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const tryScan = createRateLimiter(1, 60_000);
const RUN_ID_PATTERN = /^[a-z0-9-]{1,32}$/i;

function parseScanRequest(body: unknown): { workId: number; runId?: string } {
  const { workId, runId } = (body ?? {}) as Record<string, unknown>;
  if (typeof workId !== "number" || !Number.isSafeInteger(workId) || workId < 1) {
    throw new Error("Send the workId of a registered work.");
  }
  if (runId !== undefined && (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId))) {
    throw new Error("A runId may only contain letters, digits, and dashes.");
  }
  return { workId, runId };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body" }, { status: 400 });
  }

  let scanRequest: { workId: number; runId?: string };
  try {
    scanRequest = parseScanRequest(body);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }

  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) return Response.json({ error: "Scanning is not configured on this deployment." }, { status: 503 });
  if (!tryScan()) return Response.json({ error: "A scan just ran. Try again in a minute." }, { status: 429 });

  try {
    const client = createLicenseHunterClient({ privateKey: privateKey as Hex, address: contractAddress() });
    // Claims go out without waiting for decisions, so the page can track each transaction itself.
    const found: ScanSummary = await runScan(client, {
      wait: false,
      runId: scanRequest.runId,
      workIds: [scanRequest.workId],
    });
    return Response.json({
      worksScanned: found.worksScanned,
      candidates: found.candidates.length,
      filed: found.filed.map((claim) => ({
        hash: claim.txHash,
        pageUrl: claim.pageUrl,
        imageUrl: claim.imageUrl,
        distance: claim.distance,
      })),
      skipped: found.skipped.length,
      errors: found.errors,
    });
  } catch (error) {
    if (error instanceof DemoConfigError) return Response.json({ error: error.message }, { status: 503 });
    console.error("scan failed:", (error as Error).message);
    return Response.json({ error: "The scan could not run. Try again." }, { status: 502 });
  }
}
```

Run: `npm test --workspace frontend -- scan-api`
Expected: PASS, 9 tests.

- [ ] **Step 3: Commit**

Commit `frontend/app/api/scan/route.ts` and `frontend/__tests__/scan-api.test.ts` with the message `feat(web): scan a work on demand through the agent`, ending in the `Co-Authored-By` line from the Global Constraints.

---

### Task 7: Works pages

**How this task is specified:** Tasks 1-6 hand you complete code to transcribe. Tasks 7-10 specify content, component interfaces, and test expectations instead, and you write the JSX. Follow the template's existing pieces (`components/ui/*`, the `brand-card` class, `PageShell`) and its Tailwind style. Every page is a client component that reads through the Task 1 hooks, and every write goes through `WriteAction` (Task 5) so demo mode and wallet mode both work.

**Files:**
- Create: `frontend/app/works/page.tsx`, `frontend/app/works/[id]/page.tsx`, `frontend/components/RegisterWorkForm.tsx`, `frontend/components/WatchlistEditor.tsx`, `frontend/components/ClaimsTable.tsx`, `frontend/components/ScanNowButton.tsx`
- Create tests: `frontend/__tests__/register-work-form.test.tsx`, `frontend/__tests__/claims-table.test.tsx`, `frontend/__tests__/scan-now-button.test.tsx`

**Interfaces:**
- Consumes: `useWorks`, `useWork`, `useClaims`, `useRefreshLicenseHunter`, `type Claim`, `type Work` (Task 1); `formatGen`, `parseGen`, `parseWatchUrls`, `shortAddress`, `formatDate`, `txLink`, `addressLink`, `STATUS_LABELS`, `VERDICT_LABELS`, `siteUrl` (Task 3); `useActingAddress` (Task 4); `WriteAction` (Task 5); `PageShell`, `Button`, `Input`, `Label`, `Badge`.
- Produces:
  - `RegisterWorkForm()` plus the exported pure function `validateWork(fields): string | null`
  - `WatchlistEditor({ work }: { work: Work })`
  - `ClaimsTable({ claims }: { claims: Claim[] })`
  - `ScanNowButton({ workId, useRunId }: { workId: number; useRunId: boolean })`

**Content:**

- `/works` — heading "Registered works". While loading, a "Loading works…" line; on error, the error message. Each work is a `brand-card` holding a plain `<img>` of `work.imageUrl` (never `next/image`, so validators and the agent fetch the same file), the title, `formatGen(work.basePrice)`, the creator as `shortAddress`, and a link to `/works/{id}`. `RegisterWorkForm` sits below the list.
- `RegisterWorkForm` — fields: title, image URL, portfolio URL, base price in GEN (default `10`), terms (default `Non-exclusive web license, 12 months`), and watched URLs as a textarea, one per line. Above the button: "Put this address on your portfolio page so the ownership check passes: <acting address>" from `useActingAddress()`. Validation mirrors the contract: title 1-120 characters; image and portfolio URLs start with `https://` and hold no spaces; base price parses with `parseGen` and is above zero; terms at most 500 characters; at most 10 watched URLs, each `https://`. `validateWork` returns the message for the first broken rule, else null. The write is `WriteAction` with `method="register_work"`, `label="Register work"`, `onBeforeSubmit` running `validateWork` (showing the message and returning false on failure), and args `[title, imageUrl, portfolioUrl, basePriceWei, terms, watchUrls]`; a base price that does not parse becomes `0n` in args, and `onBeforeSubmit` stops the submission. Reset the fields on success.
- `/works/[id]` — reads the id with `useParams`. Shows the image, title, terms, base price, creator (with `addressLink`), and the portfolio link, then `ScanNowButton`, `WatchlistEditor`, and `ClaimsTable` for that work. Pass `useRunId` as true only when every watched URL starts with `siteUrl("/demo/")`, which marks the seeded demo work.
- `WatchlistEditor` — a textarea seeded from `work.watchUrls.join("\n")`, an inline error when there are more than 10 URLs or any is not `https://`, and `WriteAction` with `method="update_watchlist"`, `args=[work.id, urls]`, `label="Save watchlist"`, disabled while invalid.
- `ClaimsTable` — columns: found-on page URL (external link), verdict via `VERDICT_LABELS`, fee via `formatGen` (an em dash when zero), status as a `Badge` with `STATUS_LABELS`, filed date via `formatDate`, and an "Open" link to `/notices/{claim.id}`. Wrap the table in `overflow-x-auto`. With no claims: "No claims yet. Run a scan to look for copies."
- `ScanNowButton` — a "Scan now" button posting `{ workId, runId }` to `/api/scan`, where `runId` is generated at click time (never during render, which would break hydration) and only when `useRunId` is true. While running, the label reads "Scanning…" and the button is disabled. On success: "Checked N candidate images and filed M claims", each filed claim with its page URL and a `txLink`, the skipped count when above zero, any errors, and "Validators usually decide within 1-2 minutes." Then call `useRefreshLicenseHunter()`. On failure, show the API's `error` text in a `role="alert"` paragraph.

**Tests:**

- `register-work-form.test.tsx` — mock `@/components/WriteAction` with a stub that records its props and renders a button calling `onBeforeSubmit`; mock `useActingAddress`. Assert: (1) filling every field produces the args `["Cybernetic Horizon", "https://site.example/demo/cybernetic-horizon.png", "https://site.example/demo/portfolio", 10n * 10n ** 18n, "Non-exclusive web license, 12 months", ["https://site.example/demo/shop"]]`; (2) an `http://` image URL shows "The image URL must start with https:// and contain no spaces." and `onBeforeSubmit` returns false; (3) a base price of `abc` shows the `parseGen` message; (4) eleven watched URLs show the ten-URL message; (5) the acting address appears in the hint.
- `claims-table.test.tsx` — a claim with verdict `COPY_UNLICENSED`, fee 45 GEN, and status `NOTICE_ISSUED` renders "Unlicensed copy", "45 GEN", "Notice issued", and an "Open" link whose `href` is `/notices/7`; an empty list renders the empty message.
- `scan-now-button.test.tsx` — stub `fetch`: (1) clicking posts `{ workId: 1, runId: <string> }` when `useRunId` is true and omits `runId` when false, lists the filed claim with a transaction link, and calls refresh; (2) a 429 response shows "A scan just ran. Try again in a minute." in the alert; (3) while the request is in flight the button is disabled and reads "Scanning…".

- [ ] **Step 1: Write the three test files above**

Run: `npm test --workspace frontend -- register-work-form claims-table scan-now-button`
Expected: FAIL with module-not-found errors.

- [ ] **Step 2: Write the four components and the two pages to match the Content section**

- [ ] **Step 3: Run the checks**

```bash
npm test --workspace frontend
npm run lint --workspace frontend
npm run build
```

Expected: every Vitest file passes with no `act(...)` warnings; `tsc --noEmit` prints nothing; `next build` succeeds and its route table lists `/works` and `/works/[id]`.

- [ ] **Step 4: Commit**

Commit the six new source files and three test files with the message `feat(web): works list, registration, watchlist, and on-demand scanning`, ending in the `Co-Authored-By` line.

---

### Task 8: Notices and the notice page

**How this task is specified:** content, interfaces, and test expectations; you write the JSX (see Task 7's note).

**Files:**
- Create: `frontend/app/notices/page.tsx`, `frontend/app/notices/[id]/page.tsx`, `frontend/components/NoticeView.tsx`, `frontend/components/DisputeForm.tsx`
- Create tests: `frontend/__tests__/notice-view.test.tsx`, `frontend/__tests__/dispute-form.test.tsx`

**Interfaces:**
- Consumes: `useNotices`, `useClaim`, `useWork`, `useLicenseForClaim`, `type Claim`, `type License`, `type Work` (Task 1); `feeBreakdown`, `multiplierText`, `formatGen`, `formatDate`, `shortAddress`, `addressLink`, `USAGE_LABELS`, `PROMINENCE_LABELS`, `STATUS_LABELS`, `VERDICT_LABELS` (Task 3); `WriteAction` (Task 5); `PageShell`, `Badge`, `Input`, `Label`, `Button`.
- Produces:
  - `NoticeView({ claim, work, license }: { claim: Claim; work: Work; license: License | null })`
  - `DisputeForm({ claim }: { claim: Claim })`

**Content:**

- `/notices` — heading "Notices". `useNotices()`, newest first (highest id first). Each row is a `brand-card` with the page URL, the verdict label, the fee via `formatGen`, a status `Badge`, and a link to `/notices/{id}`. Empty state: "No notices yet. Register a work and run a scan."
- `/notices/[id]` — reads the id with `useParams`, loads the claim, then the work with `useClaim`/`useWork`, and the license with `useLicenseForClaim(claim.id, claim.status === "PAID")`. Renders `NoticeView`. While either query is loading, "Loading notice…"; if the claim query errors, show its message.
- `NoticeView` — top to bottom:
  1. A verdict banner: the verdict label, the status badge, and the date from `formatDate(claim.createdAt)`.
  2. Two images side by side with captions "Registered work" (`work.imageUrl`) and "Found on the page" (`claim.imageUrl`), both plain `<img>` tags.
  3. A line naming the page: the `claim.pageUrl` as an external link.
  4. Addressing: when `claim.walletOnPage` is set, "Addressed to <shortAddress> " with `addressLink`; otherwise "No wallet was found on the page, so any wallet can settle this notice."
  5. The validators' reasoning as a quotation.
  6. A fee breakdown from `feeBreakdown(work.basePrice, claim.usage, claim.prominence)`: base price, usage label with `multiplierText(usageBps)`, prominence label with `multiplierText(prominenceBps)`, the fee in bold, and "The creator receives <creatorAmount> and the protocol keeps <protocolAmount>." When `feeBreakdown` returns null (no fee category), skip the breakdown.
  7. The creator's terms.
  8. The line "Not legal advice." on every notice.
  9. Actions by status:
     - `NOTICE_ISSUED` or `DISPUTE_REJECTED`: `WriteAction` with `method="pay_license"`, `args=[claim.id]`, `value={claim.fee}`, `label="Pay <fee> and get a license"`.
     - `NOTICE_ISSUED` only: `DisputeForm` below the Pay action.
     - `PAID`: "License issued" with a link to `/licenses/{license.id}` when the license is known, and no Pay action.
     - `WITHDRAWN`: "This notice was withdrawn after the site owner showed permission."
     - `NO_NOTICE`: "Validators decided this copy is licensed or a different work, so no notice was issued."
- `DisputeForm` — a proof URL input (`https://…`), the hint "Link a page that shows the creator's permission, such as a licence or an email.", an inline error "The proof URL must start with https:// and contain no spaces." when invalid, and `WriteAction` with `method="dispute"`, `args=[claim.id, proofUrl]`, `label="Dispute with proof"`, `variant="outline"`, `onBeforeSubmit` validating the URL. Below it: "Only the wallet shown on the page can dispute, and each notice can be disputed once."

**Tests:**

Both test files mock `@/components/WriteAction` with a stub recording props (method, args, value, label, disabled) and rendering a button that calls `onBeforeSubmit`.

- `notice-view.test.tsx` — build a work with `basePrice` 10 GEN and a claim with `usage: "ADS_MERCH"`, `prominence: "PRIMARY"`, `fee: 45 GEN`, `walletOnPage` set. Assert: (1) the breakdown shows "10 GEN", "× 3", "× 1.5", "45 GEN", "43.65 GEN", and "1.35 GEN"; (2) the Pay action passes `method="pay_license"`, `args=[7]`, and `value=45n * 10n ** 18n`; (3) the dispute form is present for `NOTICE_ISSUED`; (4) with `status: "PAID"` and a license, the page links to `/licenses/3` and renders no Pay action; (5) with `status: "NO_NOTICE"`, `verdict: "COPY_LICENSED"`, `fee: 0n`, the "no notice was issued" line shows and no Pay action; (6) "Not legal advice." appears in every case above.
- `dispute-form.test.tsx` — (1) an `http://` proof URL shows the error and `onBeforeSubmit` returns false; (2) a valid URL passes `args=[7, "https://site.example/demo/permission"]`; (3) the one-dispute hint is present.

- [ ] **Step 1: Write both test files**

Run: `npm test --workspace frontend -- notice-view dispute-form`
Expected: FAIL with module-not-found errors.

- [ ] **Step 2: Write `NoticeView`, `DisputeForm`, and both pages**

- [ ] **Step 3: Run the checks**

```bash
npm test --workspace frontend
npm run lint --workspace frontend
npm run build
```

Expected: every Vitest file passes; `tsc --noEmit` prints nothing; the route table lists `/notices` and `/notices/[id]`.

- [ ] **Step 4: Commit**

Commit the four source files and two test files with the message `feat(web): notices with fee breakdown, payment, and disputes`, ending in the `Co-Authored-By` line.

---

### Task 9: Licenses, dashboard, and the judge guide

**How this task is specified:** content, interfaces, and test expectations; you write the JSX (see Task 7's note).

**Files:**
- Create: `frontend/app/licenses/[id]/page.tsx`, `frontend/app/dashboard/page.tsx`, `frontend/app/judges/page.tsx`, `frontend/lib/hooks/useCreatorLedger.ts`
- Create tests: `frontend/__tests__/dashboard.test.tsx`, `frontend/__tests__/judges.test.tsx`

**Interfaces:**
- Consumes: `useLicense`, `useWork`, `useWorks`, `useEarnings`, `useLicenseHunter` (Task 1); `formatGen`, `formatDate`, `shortAddress`, `addressLink`, `txLink`, `siteUrl`, `STATUS_LABELS` (Task 3); `useActingAddress`, `useDemoMode`, `DEMO_ROLE_LABELS` (Task 4); `WriteAction` (Task 5); `getContractAddress` (template).
- Produces `creatorShare(fee: bigint): bigint` in `frontend/lib/format.ts` (fee x 9700 / 10000), with a test in `frontend/__tests__/format.test.ts` asserting `creatorShare(45n * 10n ** 18n) === 43_650_000_000_000_000_000n`. Task 3's `feeBreakdown` needs a usage and prominence, which a paid claim's share does not.
- Produces `useCreatorLedger(creator: string | null)`, a TanStack Query hook under the `license-hunter` key prefix returning `{ works: Work[]; claims: Claim[]; lifetimeEarnings: bigint; byStatus: Record<ClaimStatus, number> }`. It lists works, keeps those whose `creator` matches case-insensitively, lists each work's claims, sums `creatorShare(fee)` over `PAID` claims for lifetime earnings, and counts claims by status.

**Content:**

- `/licenses/[id]` — a certificate card: "License #<id>", the work title from `useWork(license.workId)`, the licensed page as an external link, the licensee with `shortAddress` and `addressLink`, the amount paid and the creator's share with `formatGen`, issued and expiry dates with `formatDate`, and the footer "Issued by LicenseHunter on GenLayer Studio Next" with a link to the contract address in the explorer. While loading, "Loading license…".
- `/dashboard` — heading "Creator dashboard". Shows the acting address (from `useActingAddress()`), or "Connect a wallet or pick a demo role to see earnings." when there is none. Then:
  - A "Withdrawable now" card with `formatGen(useEarnings(address))` and `WriteAction` with `method="withdraw_earnings"`, `args=[]`, `label="Withdraw"`, disabled when the amount is zero.
  - A "Lifetime earnings" card with `lifetimeEarnings` from `useCreatorLedger`.
  - A counts row built from `byStatus`, labelled with `STATUS_LABELS`.
  - A list of the creator's works with open notices, each linking to `/notices/{id}`.
  - The note "Withdrawals are paid out when the transaction finalizes, which takes a few minutes on Studio Next."
- `/judges` — heading "Verify LicenseHunter in five minutes". Content:
  1. Two buttons, "Act as demo creator" and "Act as demo site owner", calling `setRole` from `useDemoMode()`, with the active role marked.
  2. The contract address from `getContractAddress()`, with an explorer link, and the network line "Studio Next, chain 61997".
  3. The judge path as an ordered list, matching spec section 9: open the pre-registered work "Cybernetic Horizon"; click "Scan now"; wait 1-2 minutes for validators; the shop claim becomes a notice (`COPY_UNLICENSED`, ads or merchandise, main image, 45 GEN, addressed to the demo site owner); the blog claim is stored as a licensed copy with no notice; switch to the demo site owner and pay; the creator's withdrawable earnings rise by 43.65 GEN; switch back and withdraw; optionally scan again and dispute the new notice with the permission page.
  4. A link to the demo work: find the work whose `portfolioUrl` equals `siteUrl("/demo/portfolio")` in `useWorks()` and link to `/works/{id}`; when it is missing, show "The demo work is not registered on this deployment yet."
  5. Links to the four demo pages: `/demo/portfolio`, `/demo/shop`, `/demo/blog`, `/demo/permission`.
  6. The note "Demo wallets are server-signed so you can try the flow without installing MetaMask. Fees come out of those demo wallets."

**Tests:**

- `dashboard.test.tsx` — mock the Task 1 hooks and `useCreatorLedger`, mock `WriteAction` with a props-recording stub, mock `useActingAddress`. Assert: (1) earnings of 43.65 GEN render as "43.65 GEN" and the Withdraw action is enabled; (2) zero earnings disable it; (3) with no acting address, the connect line shows.
- `judges.test.tsx` — mock `useWorks` with a work whose `portfolioUrl` is `siteUrl("/demo/portfolio")`, mock `useDemoMode` with a `setRole` spy, mock `getContractAddress`. Assert: (1) the ordered list has the seven steps of the judge path; (2) the contract address and its explorer link appear; (3) clicking "Act as demo site owner" calls `setRole("site-owner")`; (4) the demo work link points at `/works/1`.

- [ ] **Step 1: Write both test files**

Run: `npm test --workspace frontend -- dashboard judges`
Expected: FAIL with module-not-found errors.

- [ ] **Step 2: Write the hook and the three pages**

- [ ] **Step 3: Run the checks**

```bash
npm test --workspace frontend
npm run lint --workspace frontend
npm run build
```

Expected: every Vitest file passes; `tsc --noEmit` prints nothing; the route table lists `/licenses/[id]`, `/dashboard`, and `/judges`.

- [ ] **Step 4: Commit**

Commit the four source files and two test files with the message `feat(web): license certificates, creator dashboard, and judge guide`, ending in the `Co-Authored-By` line.

---

### Task 10: Demo art and demo pages

**How this task is specified:** content, interfaces, and test expectations; you write the JSX and the script (see Task 7's note). The exact wording below matters: validators read these pages as evidence, so keep the quoted lines verbatim.

**Files:**
- Create: `scripts/generate-demo-art.ts`, `frontend/public/demo/cybernetic-horizon.png`, `frontend/public/demo/synth-hoodie-banner.jpg`, `frontend/app/demo/portfolio/page.tsx`, `frontend/app/demo/shop/page.tsx`, `frontend/app/demo/blog/page.tsx`, `frontend/app/demo/permission/page.tsx`
- Create tests: `frontend/__tests__/demo-pages.test.tsx`
- Modify: `package.json` (root), adding `"demo-art": "tsx scripts/generate-demo-art.ts"`

**Interfaces:**
- Consumes: `differenceHash`, `hammingDistance`, `MATCH_THRESHOLD` from `@licensehunter/agent/phash`; `sharp` (already a dependency of the agent workspace).
- Produces two image files and four pages. No shared component: each demo page stands alone, with no `PageShell`, no navigation, and no client component of its own, so its content is in the server-rendered HTML that validators' text rendering and the agent's HTML parser both see.

**The art script** (`scripts/generate-demo-art.ts`):
1. Builds a synthwave SVG 1200×800: a dark `#05070d` ground, a cyan-to-magenta sun, a horizon grid, mountain silhouettes, a few stars, and a small "Demo Creator" signature in the corner.
2. Renders it to `frontend/public/demo/cybernetic-horizon.png` with sharp.
3. Makes the edited copy: crop 5% off each side (60px left and right, 40px top and bottom), resize to 960 wide, and write JPEG quality 82 to `frontend/public/demo/synth-hoodie-banner.jpg`.
4. Prints both file sizes and fails with exit code 1 if either is 5 MB or larger, which is the contract's image cap.
5. Computes `differenceHash` of both files and prints the Hamming distance, failing with exit code 1 when it is above `MATCH_THRESHOLD`. A 5% crop measured 7 on the synthetic test artwork; the run must confirm the real art also lands at or under 10, because the whole demo depends on the agent matching these two files.

Run it with `npm run demo-art`.

**The pages** (all server components; use plain `<img>`, never `next/image`, so the file the agent hashes is the file validators fetch; each exports `metadata` with `robots: "noindex"`; each ignores the `run` query parameter):

- `/demo/portfolio` — "Demo Creator" as the heading, then "Cybernetic Horizon, 2026", the PNG at a readable size, the line `Wallet: <NEXT_PUBLIC_DEMO_CREATOR_ADDRESS>`, and "Licensing enquiries go through LicenseHunter." The creator's address must be the only `0x…` string on the page, because the contract's ownership check looks for that address in the rendered text.
- `/demo/shop` — "Neon Threads" as the shop name, the product "Synth hoodie", the JPEG as the product's main image with no credit to any creator, a price of "$49", and the line `Pay us in GEN: <NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS>`. The site owner's address must be the only `0x…` string on the page, because the contract addresses the notice to the first such address in the page text. Do not mention a licence, permission, or the creator anywhere on this page — that is what makes the copy unlicensed.
- `/demo/blog` — "Five synthwave artworks we love" as the heading, a short paragraph, the PNG, and directly under it the visible credit `Licensed from Demo Creator via LicenseHunter`, plus "License: non-exclusive web license, 12 months." No `0x…` address anywhere on the page.
- `/demo/permission` — "Permission letter" as the heading and this text, which is the dispute proof: `PERMISSION LETTER: Demo Creator grants Neon Threads permission to use the artwork "Cybernetic Horizon" on its synth hoodie product page for 12 months.` Then the creator and shop addresses on separate labelled lines and the date line "Signed 2026-09-16".

**Tests** (`demo-pages.test.tsx`): render each page component and assert:
1. The portfolio page shows the creator address and exactly one `0x`-prefixed 40-hex string in its text content.
2. The shop page shows the site owner address, exactly one such string, and no occurrence of "Licensed", "licence", "license", or "permission" (case-insensitive).
3. The blog page shows "Licensed from Demo Creator via LicenseHunter" and no `0x`-prefixed 40-hex string.
4. The permission page contains the full permission sentence above.
5. Each page's `<img>` `src` is `/demo/cybernetic-horizon.png` or `/demo/synth-hoodie-banner.jpg`.

Stub the two public env addresses with `vi.stubEnv` in the test.

- [ ] **Step 1: Write the art script and run it**

```bash
npm run demo-art
```

Expected: both files are written, each under 5 MB, and the printed Hamming distance is at or under 10. If it is above 10, reduce the crop (for example to 3% per side) and rerun until it lands at or under 10, then record the final crop in the script's comment.

- [ ] **Step 2: Write `frontend/__tests__/demo-pages.test.tsx`**

Run: `npm test --workspace frontend -- demo-pages`
Expected: FAIL with module-not-found errors.

- [ ] **Step 3: Write the four pages**

- [ ] **Step 4: Run the checks**

```bash
npm test --workspace frontend
npm run lint --workspace frontend
npm run build
```

Expected: every Vitest file passes; `tsc --noEmit` prints nothing; `next build` succeeds and the route table lists all four `/demo/*` pages as static.

- [ ] **Step 5: Commit**

Commit the script, both images, the four pages, the test, and the root `package.json` with the message `feat(web): demo artwork and the pages validators judge`, ending in the `Co-Authored-By` line.

---

## Coverage against the spec

| Spec section 8 route | Task |
|---|---|
| `/` pitch and how it works | 2 |
| `/works` list and register form | 7 |
| `/works/[id]` watchlist, claims, "Scan now" | 6, 7 |
| `/notices` and `/notices/[id]` | 8 |
| `/licenses/[id]` | 9 |
| `/dashboard` | 9 |
| `/judges` | 9 |
| `/demo/portfolio`, `/demo/shop`, `/demo/blog`, `/demo/permission` | 10 |
| Wallet writes through `GenLayerTransactionPanel` | 5 |
| Demo mode with server-signed writes | 4, 5 |
| Data access and `Map` conversion | 1 |
| Theme and configuration | 2, 3, 4 |

## Notes for Plan 4

- The seeded demo work must be registered with `portfolioUrl = siteUrl("/demo/portfolio")` and watched URLs `siteUrl("/demo/shop")` and `siteUrl("/demo/blog")`, all on the deployed site, or `/works/[id]` will not offer run ids and `/judges` will not find the work.
- `NEXT_PUBLIC_SITE_URL` must be the deployed origin with no trailing slash before the work is seeded, because the registered URLs are stored on chain.
- Vercel needs the server-only env keys: `LICENSE_HUNTER_ADDRESS`, `AGENT_PRIVATE_KEY`, `DEMO_CREATOR_PRIVATE_KEY`, `DEMO_SITE_OWNER_PRIVATE_KEY`, plus the public ones.

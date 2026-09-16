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

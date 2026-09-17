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

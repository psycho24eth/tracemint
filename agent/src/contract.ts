import { isSuccessful } from "genlayer-js";

import { clientFor, HEAVY_FEES, read, submitWrite, waitDecided, type Hex } from "./genlayer";
import type { Claim, LicenseHunterClient, Work } from "./types";

type Row = Record<string, unknown>;

export function toWork(row: Row): Work {
  return {
    id: Number(row.id),
    creator: String(row.creator),
    title: String(row.title),
    imageUrl: String(row.image_url),
    watchUrls: Array.isArray(row.watch_urls) ? row.watch_urls.map(String) : [],
  };
}

export function toClaim(row: Row): Claim {
  return {
    id: Number(row.id),
    workId: Number(row.work_id),
    pageUrl: String(row.page_url),
    imageUrl: String(row.image_url),
    status: String(row.status),
  };
}

export function createLicenseHunterClient(options: { privateKey: Hex; address: string }): LicenseHunterClient {
  const client = clientFor(options.privateKey);
  return {
    async listWorks() {
      return ((await read(client, options.address, "list_works")) as Row[]).map(toWork);
    },
    async listClaims(workId) {
      return ((await read(client, options.address, "list_claims", [workId])) as Row[]).map(toClaim);
    },
    async fileClaim(workId, pageUrl, imageUrl, { wait }) {
      const txHash = await submitWrite(client, options.address, "file_claim", [workId, pageUrl, imageUrl], {
        fees: HEAVY_FEES,
      });
      if (!wait) return { txHash, ok: null };
      return { txHash, ok: isSuccessful(await waitDecided(client, txHash)) };
    },
  };
}

"use client";

import { useQuery } from "@tanstack/react-query";

import type { Claim, ClaimStatus, Work } from "../contracts/LicenseHunter";
import { creatorShare } from "../format";
import { useLicenseHunter } from "./useLicenseHunter";

const QUERY_PREFIX = "license-hunter";

export type CreatorLedger = {
  works: Work[];
  claims: Claim[];
  lifetimeEarnings: bigint;
  byStatus: Record<ClaimStatus, number>;
};

export function useCreatorLedger(creator: string | null) {
  const contract = useLicenseHunter();

  return useQuery<CreatorLedger, Error>({
    queryKey: [QUERY_PREFIX, "creator-ledger", creator],
    queryFn: async () => {
      if (!contract) throw new Error("Contract not available");

      const works = await contract.listWorks();
      const creatorWorks = creator
        ? works.filter((w) => w.creator.toLowerCase() === creator.toLowerCase())
        : [];

      const allClaims: Claim[] = [];
      for (const work of creatorWorks) {
        const claims = await contract.listClaims(work.id);
        allClaims.push(...claims);
      }

      let lifetimeEarnings = 0n;
      const byStatus: Record<ClaimStatus, number> = {
        NOTICE_ISSUED: 0,
        NO_NOTICE: 0,
        PAID: 0,
        WITHDRAWN: 0,
        DISPUTE_REJECTED: 0,
      };

      for (const claim of allClaims) {
        byStatus[claim.status]++;
        if (claim.status === "PAID") {
          lifetimeEarnings += creatorShare(claim.fee);
        }
      }

      return {
        works: creatorWorks,
        claims: allClaims,
        lifetimeEarnings,
        byStatus,
      };
    },
    enabled: contract !== null && Boolean(creator),
    staleTime: 3_000,
    refetchInterval: 15_000,
  });
}

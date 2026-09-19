"use client";

import { useQuery } from "@tanstack/react-query";

import { getStudioUrl } from "../genlayer/client";

// Shares the contract queries' prefix so a refresh after a transaction updates the balance too.
export const balanceQueryKey = (address: string | null) => ["license-hunter", "balance", address];

/** A wallet's GEN balance, read from the GenLayer RPC so it is right whatever network the wallet is on. */
export function useGenBalance(address: string | null) {
  return useQuery<bigint, Error>({
    queryKey: balanceQueryKey(address),
    queryFn: async () => {
      const response = await fetch(getStudioUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
      });
      const payload = (await response.json()) as { result?: string; error?: { message?: string } };
      if (payload.error || typeof payload.result !== "string") {
        throw new Error(payload.error?.message ?? "Could not read the balance.");
      }
      return BigInt(payload.result);
    },
    enabled: Boolean(address),
    staleTime: 5_000,
    refetchInterval: 20_000,
  });
}

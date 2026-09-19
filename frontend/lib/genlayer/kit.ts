"use client";

import { useMemo } from "react";
import { createTransactionKit, type TransactionKit } from "@genlayer/transaction-kit";
import { GENLAYER_CHAIN } from "./client";
import type { Eip1193Provider } from "./connection";

/** A Transaction Kit that signs with the connected wallet, whichever wallet that is. */
export function useTransactionKit(address: string | null, provider: Eip1193Provider | null): TransactionKit | null {
  return useMemo(() => {
    if (!provider || !address?.startsWith("0x")) {
      return null;
    }

    return createTransactionKit({
      chain: GENLAYER_CHAIN,
      provider,
      account: address as `0x${string}`,
    });
  }, [address, provider]);
}

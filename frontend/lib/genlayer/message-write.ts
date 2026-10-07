import { LIGHT_FEES } from "@licensehunter/agent/fees";
import { createClient } from "genlayer-js";

import { GENLAYER_CHAIN } from "./client";
import { toWalletError, type Eip1193Provider } from "./connection";

type Hex = `0x${string}`;

/**
 * Writes that pay out through a message the contract emits: an `emit_call` that sends GEN to a wallet. Studio Next
 * only runs that message when the transaction declares an allocation tree for it, and the Transaction Kit's submit
 * has no way to carry one (docs/platform-checks.md). So these skip the kit: a dry run of the exact call prices the
 * message, and the wallet signs a write that declares that allocation.
 */
export const MESSAGE_METHODS = new Set(["withdraw_earnings", "withdraw_protocol_fees"]);

/** The two calls a payout needs, as a genlayer-js client bound to the connected wallet provides them. */
export type PayoutClient = {
  estimateTransactionFeesForWrite(
    args: Record<string, unknown>,
  ): Promise<{ distribution: unknown; messageAllocations?: unknown[]; feeValue: bigint }>;
  writeContract(args: Record<string, unknown>): Promise<unknown>;
};

/** A genlayer-js client that signs with the connected wallet, so the dry run runs as that wallet. */
export function walletClient(address: string, provider: Eip1193Provider) {
  return createClient({ chain: GENLAYER_CHAIN, account: address as Hex, provider: provider as never });
}

export async function submitMessageWrite(
  client: PayoutClient,
  call: { address: string; functionName: string; args: unknown[]; value?: bigint },
  { onPriced }: { onPriced?: () => void } = {},
): Promise<Hex> {
  const value = call.value ?? 0n;
  let estimate: Awaited<ReturnType<PayoutClient["estimateTransactionFeesForWrite"]>>;
  try {
    // The dry run executes the method as the wallet, so it also catches a payout the contract would refuse.
    estimate = await client.estimateTransactionFeesForWrite({
      address: call.address,
      functionName: call.functionName,
      args: call.args,
      value,
      ...LIGHT_FEES,
    });
  } catch (error) {
    throw new Error(dryRunFailure(error));
  }
  if (!estimate.messageAllocations?.length) {
    throw new Error(
      "Studio Next priced the payout without an allocation for its transfer message, so it would fail. Nothing was sent; try again in a moment.",
    );
  }

  onPriced?.();
  try {
    return (await client.writeContract({
      address: call.address,
      functionName: call.functionName,
      args: call.args,
      value,
      fees: { distribution: estimate.distribution, messageAllocations: estimate.messageAllocations, feeValue: estimate.feeValue },
    })) as Hex;
  } catch (error) {
    throw toWalletError(error, "The payout could not be sent");
  }
}

/** Studio reports a dry run the contract refused only as "execution failed", without the contract's own reason. */
function dryRunFailure(error: unknown): string {
  const { details = "", message = "" } = (error ?? {}) as { details?: string; message?: string };
  if (/execution failed/i.test(`${details} ${message}`)) {
    return "The contract refused this payout in a dry run, so nothing was sent. Usually that means this wallet has nothing to withdraw yet.";
  }
  return `The payout could not be priced (${details || message || "no answer from the network"}). Nothing was sent.`;
}

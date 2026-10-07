// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { submitMessageWrite, walletClient } from "@/lib/genlayer/message-write";

const CONTRACT = "0xA7225195035c80Fc6E9128112947B9bF87c7A5Dd";
const CREATOR = "0x10516B67e54C3c252493b55d10Db1c779684C543";
const HASH = `0x${"ef".repeat(32)}`;

// What Studio Next's dry run returns for a payout: the light preset filled in with live caps, and one External
// message to the creator carrying its own budget (docs/platform-checks.md, run 3).
const DISTRIBUTION = {
  leaderTimeunitsAllocation: 100n,
  validatorTimeunitsAllocation: 200n,
  appealRounds: 0n,
  executionBudgetPerRound: 21_000_000_000_000n,
  executionConsumed: 0n,
  totalMessageFees: 150_000_000_000_000n,
  rotations: [1n],
  maxPriceGenPerTimeUnit: 1_200_000_000n,
  storageFeeMaxGasPrice: 1_200_000_000n,
  receiptFeeMaxGasPrice: 1_200_000_000n,
};
const ALLOCATIONS = [{ messageType: 0, recipient: CREATOR, budget: 150_000_000_000_000n }];
const ESTIMATE = {
  distribution: DISTRIBUTION,
  messageAllocations: ALLOCATIONS,
  feeValue: 459_000_000_000_000n,
  policy: { enabled: true, genPerTimeUnit: 1_000_000_000n, storageUnitPrice: 1n, receiptGasPrice: 1n, executionBudgetFloor: 0n },
};

/** A client already bound to the creator's wallet: the dry run answers with `estimate`, and the wallet signs. */
function wallet(estimate: unknown = ESTIMATE) {
  return {
    estimateTransactionFeesForWrite: vi.fn(async (_args: Record<string, unknown>) => estimate as typeof ESTIMATE),
    writeContract: vi.fn(async (_args: Record<string, unknown>): Promise<unknown> => HASH),
  };
}

const PAYOUT = { address: CONTRACT, functionName: "withdraw_earnings", args: [] as unknown[] };

describe("paying out to a connected wallet", () => {
  it("prices the payout with a dry run of the same call, at the light preset", async () => {
    const client = wallet();

    await submitMessageWrite(client, PAYOUT);

    expect(client.estimateTransactionFeesForWrite).toHaveBeenCalledWith({
      address: CONTRACT,
      functionName: "withdraw_earnings",
      args: [],
      value: 0n,
      leaderTimeunitsAllocation: 100,
      validatorTimeunitsAllocation: 200,
      rotations: [1],
    });
  });

  it("sends exactly the allocation tree the dry run returned", async () => {
    const client = wallet();

    const hash = await submitMessageWrite(client, PAYOUT);

    expect(hash).toBe(HASH);
    expect(client.writeContract).toHaveBeenCalledTimes(1);
    expect(client.writeContract).toHaveBeenCalledWith({
      address: CONTRACT,
      functionName: "withdraw_earnings",
      args: [],
      value: 0n,
      fees: { distribution: DISTRIBUTION, messageAllocations: ALLOCATIONS, feeValue: 459_000_000_000_000n },
    });
  });

  it("says when the payout is priced, before the wallet asks for a signature", async () => {
    const client = wallet();
    const order: string[] = [];
    client.writeContract.mockImplementation(async () => {
      order.push("sign");
      return HASH;
    });

    await submitMessageWrite(client, PAYOUT, { onPriced: () => order.push("priced") });

    expect(order).toEqual(["priced", "sign"]);
  });

  it.each([
    ["no allocation tree", { ...ESTIMATE, messageAllocations: undefined }],
    ["an empty one", { ...ESTIMATE, messageAllocations: [] }],
  ])("sends nothing when the dry run returns %s, since Studio Next would fail the transfer", async (_case, estimate) => {
    const client = wallet(estimate);

    await expect(submitMessageWrite(client, PAYOUT)).rejects.toThrow(/allocation/i);
    expect(client.writeContract).not.toHaveBeenCalled();
  });

  it("explains a payout the contract refused in the dry run, which the RPC only calls invalid parameters", async () => {
    const client = wallet();
    // What Studio Next answered on 2026-10-07 when a wallet with nothing to withdraw ran the dry run.
    client.estimateTransactionFeesForWrite.mockRejectedValue(
      Object.assign(new Error("Missing or invalid parameters.\nDouble check you have provided the correct parameters.\n\nDetails: execution failed"), {
        name: "InvalidInputRpcError",
        details: "execution failed",
      }),
    );

    await expect(submitMessageWrite(client, PAYOUT)).rejects.toThrow(/nothing to withdraw/i);
    expect(client.writeContract).not.toHaveBeenCalled();
  });

  it("says plainly when the signature is declined in the wallet", async () => {
    const client = wallet();
    client.writeContract.mockRejectedValue(Object.assign(new Error("User rejected the request."), { code: 4001 }));

    await expect(submitMessageWrite(client, PAYOUT)).rejects.toThrow("The request was declined in the wallet.");
  });

  it("builds its client on the connected wallet, so the dry run runs as that wallet", () => {
    const client = walletClient(CREATOR, { request: vi.fn() });

    expect(client.account?.address.toLowerCase()).toBe(CREATOR.toLowerCase());
  });
});

// Task 2b follow-up: targeted payout check against the already-deployed spike contract, testing
// two ways of funding the internal `emit_transfer` message that `forward()` triggers, since a bare
// `messageAllocations` entry with no budget caused `InvalidFeeParams` (see docs/platform-checks.md).
import {
  balanceOf,
  clientFor,
  describeTx,
  HEAVY_FEES,
  json,
  loadEnv,
  requireEnv,
  txLink,
  waitDecided,
  type Hex,
} from "../deploy/studio-next";

// Reuse the spike contract deployed by run 1 of `npm run spike` (see docs/platform-checks.md) instead
// of paying to redeploy another throwaway copy just to exercise `forward`.
const SPIKE = "0x282A5b1175B914a6cA9cDA9fe4519cb681223980" as Hex;
const ONE_GEN = 10n ** 18n;

loadEnv();
const agent = clientFor(requireEnv("AGENT_PRIVATE_KEY") as Hex);
const creator = requireEnv("DEMO_CREATOR_ADDRESS");

async function pollBalance(before: bigint): Promise<bigint> {
  // Transfers apply at finalization, which can lag acceptance, so poll longer than the
  // deploy/write checks in run-spike.ts do (30 x 10s = 5 minutes, vs. their 12 x 10s = 2 minutes).
  let after = before;
  for (let attempt = 0; attempt < 30 && after === before; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    after = await balanceOf(creator);
  }
  return after;
}

type ObservedFeeUsage = { recommendedTotalMessageFees?: bigint } | undefined;
let est:
  | {
      distribution: unknown;
      feeValue: bigint;
      messageAllocations?: unknown;
      observed?: ObservedFeeUsage;
    }
  | undefined;

console.log("=== Mode A: estimateTransactionFeesForWrite (simulation-derived message allocations) ===");
try {
  est = (await (agent as any).estimateTransactionFeesForWrite({
    address: SPIKE,
    functionName: "forward",
    args: [creator],
    value: ONE_GEN,
    ...HEAVY_FEES,
  } as never)) as typeof est;
  console.log(`A totalMessageFees: ${(est!.distribution as any).totalMessageFees}`);
  console.log(`A messageAllocations: ${json(est!.messageAllocations)}`);
  console.log(`A feeValue: ${est!.feeValue}`);
  console.log(`A observed: ${json(est!.observed)}`);

  const beforeA = await balanceOf(creator);
  const hashA = (await (agent as any).writeContract({
    address: SPIKE,
    functionName: "forward",
    args: [creator] as never,
    value: ONE_GEN,
    fees: { distribution: est!.distribution, messageAllocations: est!.messageAllocations, feeValue: est!.feeValue },
  } as never)) as Hex;
  const txA = await waitDecided(agent, hashA);
  console.log(`A tx: ${describeTx(txA)} ${txLink(hashA)}`);
  console.log(`A tx receipt: ${json(txA)}`);
  const afterA = await pollBalance(beforeA);
  console.log(`A creator balance ${beforeA} -> ${afterA}`);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`A failed: ${message}`);
}

console.log("=== Mode B: totalMessageFees pool (Transaction Kit style, no explicit allocations) ===");
try {
  const recommended = est?.observed?.recommendedTotalMessageFees;
  const X = recommended && recommended > 0n ? recommended : 10n ** 16n;
  console.log(`B X (totalMessageFees pool): ${X}`);

  const pool = (await (agent as any).estimateTransactionFees({
    ...HEAVY_FEES,
    totalMessageFees: X,
  } as never)) as { distribution: { totalMessageFees: unknown }; feeValue: bigint };
  console.log(`B pool.distribution.totalMessageFees: ${pool.distribution.totalMessageFees}`);

  const beforeB = await balanceOf(creator);
  const hashB = (await (agent as any).writeContract({
    address: SPIKE,
    functionName: "forward",
    args: [creator] as never,
    value: ONE_GEN,
    fees: { distribution: pool.distribution, feeValue: pool.feeValue },
  } as never)) as Hex;
  const txB = await waitDecided(agent, hashB);
  console.log(`B tx: ${describeTx(txB)} ${txLink(hashB)}`);
  console.log(`B tx receipt: ${json(txB)}`);
  const afterB = await pollBalance(beforeB);
  console.log(`B creator balance ${beforeB} -> ${afterB}`);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`B failed: ${message}`);
}

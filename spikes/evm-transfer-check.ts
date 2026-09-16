// Task 2b follow-up: pay a wallet through an external (EVM) message instead of an internal one.
// Internal `emit_transfer` messages to wallets were declared and budgeted on Studio Next but never
// delivered (see docs/platform-checks.md), so this deploys a fresh spike and tries `forward_evm`.
import {
  addressLink,
  balanceOf,
  clientFor,
  deploy,
  describeTx,
  HEAVY_FEES,
  json,
  loadEnv,
  read,
  requireEnv,
  txLink,
  waitDecided,
  type Hex,
} from "../deploy/studio-next";

const ONE_GEN = 10n ** 18n;

loadEnv();
const agent = clientFor(requireEnv("AGENT_PRIVATE_KEY") as Hex);
const creator = requireEnv("DEMO_CREATOR_ADDRESS");

const deployed = await deploy(agent, "spikes/vision_transfer_spike.py", []);
console.log(`deploy: ${describeTx(deployed.tx)} ${txLink(deployed.hash)}`);
if (!deployed.ok || !deployed.address) {
  console.error(json(deployed.tx));
  process.exit(1);
}
const spike = deployed.address;
console.log(`spike contract: ${spike} ${addressLink(spike)}`);

const client = agent as any;
const estimate = await client.estimateTransactionFeesForWrite({
  address: spike,
  functionName: "forward_evm",
  args: [creator],
  value: ONE_GEN,
  ...HEAVY_FEES,
});
console.log(`estimate: totalMessageFees=${estimate.distribution.totalMessageFees} feeValue=${estimate.feeValue}`);
console.log(`allocations: ${json(estimate.messageAllocations)}`);

const before = await balanceOf(creator);
const hash = (await client.writeContract({
  address: spike,
  functionName: "forward_evm",
  args: [creator],
  value: ONE_GEN,
  fees: {
    distribution: estimate.distribution,
    messageAllocations: estimate.messageAllocations,
    feeValue: estimate.feeValue,
  },
})) as Hex;
const tx = await waitDecided(agent, hash);
console.log(`forward_evm: ${describeTx(tx)} ${txLink(hash)}`);
console.log(`stored: ${await read(agent, spike, "get_last")}`);

let after = before;
for (let attempt = 0; attempt < 36 && after === before; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  after = await balanceOf(creator);
}
console.log(`creator balance ${before} -> ${after}`);
console.log(`spike balance ${await balanceOf(spike)}`);

const final = await client.getTransaction({ hash });
console.log(`final status: ${final.statusName}`);
console.log(`messages: ${json(final.messages)}`);
console.log(`triggered: ${json(final.triggered_transactions)}`);

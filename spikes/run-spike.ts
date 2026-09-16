import {
  addressLink,
  balanceOf,
  clientFor,
  deploy,
  describeTx,
  HEAVY_FEES,
  json,
  loadEnv,
  quoteFees,
  read,
  requireEnv,
  txLink,
  write,
  type Hex,
} from "../deploy/studio-next";

const STARRY_960 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/960px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg";
const STARRY_500 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/500px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg";
const MONA_500 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/500px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg";
const STARRY_PAGE = "https://en.wikipedia.org/wiki/The_Starry_Night";
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

async function check(
  name: string,
  method: string,
  args: unknown[],
  value?: bigint,
  dumpReceipt?: boolean,
): Promise<boolean> {
  // A hard chain-level rejection (e.g. an EVM revert on invalid fee params) throws from
  // writeContract before any receipt exists, instead of resolving to a FINISHED_WITH_ERROR
  // receipt like a normal contract-side failure does. Catch it so one bad call doesn't take
  // down the rest of the run; record it as a failed check with the thrown message as evidence.
  try {
    const result = await write(agent, spike, method, args, { value, fees: HEAVY_FEES });
    console.log(`${name}: ${describeTx(result.tx)} ${txLink(result.hash)}`);
    if (!result.ok) console.error(json(result.tx));
    // dumpReceipt: full receipt regardless of outcome, to inspect on-chain message fee budget /
    // message allocation fields (the controller wants these compared to Task 2's "0 wei" / "0" transfer).
    if (dumpReceipt) console.log(`${name} receipt: ${json(result.tx)}`);
    console.log(`${name} stored: ${await read(agent, spike, "get_last")}`);
    return result.ok;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${name}: threw before a receipt was obtained: ${message}`);
    return false;
  }
}

const results: Record<string, boolean> = {};
results.sameArtwork = await check("same artwork", "compare", [STARRY_960, STARRY_500]);
results.differentArtwork = await check("different artwork", "compare", [STARRY_960, MONA_500]);
results.pageRender = await check("page render", "page_has", [STARRY_PAGE, "Van Gogh"]);
results.textPrompt = await check("text prompt", "ask", ["What color is a clear daytime sky?"]);
results.sameArtworkShots = await check("same artwork (screenshots)", "compare_shots", [STARRY_960, STARRY_500]);
results.differentArtworkShots = await check("different artwork (screenshots)", "compare_shots", [
  STARRY_960,
  MONA_500,
]);
results.pageUsage = await check("page usage", "describe_page", [STARRY_PAGE]);

const unfundedQuote = await quoteFees(agent, HEAVY_FEES);
console.log(
  `unfunded transfer fee quote: feeValue=${unfundedQuote.feeValue} totalMessageFees=${unfundedQuote.distribution.totalMessageFees}`,
);
const before = await balanceOf(creator);
results.transferTx = await check("transfer 1 GEN", "forward", [creator], ONE_GEN, true);
let after = before;
for (let attempt = 0; attempt < 12 && after === before; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  after = await balanceOf(creator);
}
results.transferArrived = after - before === ONE_GEN;
console.log(`creator balance ${before} -> ${after}`);

// Funded payout checks live in spikes/transfer-check.ts and spikes/evm-transfer-check.ts (docs/platform-checks.md).

console.log(json(results));

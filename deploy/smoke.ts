import { clientFor, json, loadEnv, read, requireEnv, type Hex } from "./studio-next";

loadEnv();
const client = clientFor(requireEnv("DEMO_CREATOR_PRIVATE_KEY") as Hex);
const address = requireEnv("LICENSE_HUNTER_ADDRESS");
const agentAddress = requireEnv("AGENT_ADDRESS").toLowerCase();

const stats = (await read(client, address, "get_stats")) as Record<string, unknown>;
console.log(json(stats));

const problems: string[] = [];
if (String(stats.agent).toLowerCase() !== agentAddress) problems.push("agent does not match AGENT_ADDRESS");
if (String(stats.owner).toLowerCase() !== agentAddress) problems.push("owner is not the deployer");
if (Number(stats.works) !== 0 || Number(stats.claims) !== 0) problems.push("a fresh deployment should have no works or claims");
if (problems.length > 0) {
  console.error(`smoke failed: ${problems.join("; ")}`);
  process.exit(1);
}
console.log("smoke ok");

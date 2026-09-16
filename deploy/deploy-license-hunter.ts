import {
  addressLink,
  clientFor,
  deploy,
  describeTx,
  json,
  loadEnv,
  requireEnv,
  txLink,
  upsertEnv,
  type Hex,
} from "./studio-next";

loadEnv();
const deployer = clientFor(requireEnv("AGENT_PRIVATE_KEY") as Hex);
const agentAddress = requireEnv("AGENT_ADDRESS");

const result = await deploy(deployer, "contracts/license_hunter.py", [agentAddress]);
console.log(`deploy: ${describeTx(result.tx)} ${txLink(result.hash)}`);
if (!result.ok || !result.address) {
  console.error(json(result.tx));
  process.exit(1);
}
upsertEnv("LICENSE_HUNTER_ADDRESS", result.address);
console.log(`LicenseHunter: ${result.address} ${addressLink(result.address)}`);

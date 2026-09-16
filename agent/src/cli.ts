import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createLicenseHunterClient } from "./contract";
import { json, type Hex } from "./genlayer";
import { runScan } from "./scan";

const envFile = fileURLToPath(new URL("../../.env.local", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const privateKey = process.env.AGENT_PRIVATE_KEY;
const address = process.env.LICENSE_HUNTER_ADDRESS;
if (!privateKey || !address) {
  console.log("Agent not configured: set AGENT_PRIVATE_KEY and LICENSE_HUNTER_ADDRESS. Skipping scan.");
  process.exit(0);
}

const client = createLicenseHunterClient({ privateKey: privateKey as Hex, address });
const summary = await runScan(client, { wait: true });

console.log(json({ filed: summary.filed, skipped: summary.skipped.length, errors: summary.errors }));
console.log(
  `scanned ${summary.worksScanned} works, found ${summary.candidates.length} candidates, ` +
    `filed ${summary.filed.length} claims, ${summary.errors.length} errors`,
);

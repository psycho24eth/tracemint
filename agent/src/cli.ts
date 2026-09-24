import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createLicenseHunterClient } from "./contract";
import { json, retryableRpcError, RPC_RETRIES, type Hex } from "./genlayer";
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

let summary;
try {
  summary = await runScan(client, { wait: true });
} catch (error) {
  // withRpcRetry already waited out a busy Studio, so reaching here means the chain stayed
  // unreachable. Still exit 1 -- a scheduled scan that never runs should be visible -- but print the
  // reason on one line, because the raw viem stack blames the JSON-RPC version for a busy server.
  const retryable = retryableRpcError(error);
  const reason = retryable ? `${retryable.reason} (gave up after ${RPC_RETRIES} retries)` : (error as Error).message;
  console.error(`Scan failed: ${reason}`);
  process.exit(1);
}

console.log(
  json({
    filed: summary.filed,
    skipped: summary.skipped.length,
    errors: summary.errors,
    examined: summary.examined,
    pagesRead: summary.pagesRead,
  }),
);
console.log(
  `scanned ${summary.worksScanned} works, read ${summary.pagesRead} pages, compared ${summary.examined} images, ` +
    `found ${summary.candidates.length} candidates, filed ${summary.filed.length} claims, ` +
    `${summary.errors.length} errors`,
);

import { createLicenseHunterClient, runScan, type ScanSummary } from "@licensehunter/agent";
import type { Hex } from "@licensehunter/agent/genlayer";

import { contractAddress, DemoConfigError } from "@/lib/server/demo-signer";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const tryScan = createRateLimiter(1, 60_000);
const RUN_ID_PATTERN = /^[a-z0-9-]{1,32}$/i;

function parseScanRequest(body: unknown): { workId: number; runId?: string } {
  const { workId, runId } = (body ?? {}) as Record<string, unknown>;
  if (typeof workId !== "number" || !Number.isSafeInteger(workId) || workId < 1) {
    throw new Error("Send the workId of a registered work.");
  }
  if (runId !== undefined && (typeof runId !== "string" || !RUN_ID_PATTERN.test(runId))) {
    throw new Error("A runId may only contain letters, digits, and dashes.");
  }
  return { workId, runId };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body" }, { status: 400 });
  }

  let scanRequest: { workId: number; runId?: string };
  try {
    scanRequest = parseScanRequest(body);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }

  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) return Response.json({ error: "Scanning is not configured on this deployment." }, { status: 503 });
  if (!tryScan()) return Response.json({ error: "A scan just ran. Try again in a minute." }, { status: 429 });

  try {
    const client = createLicenseHunterClient({ privateKey: privateKey as Hex, address: contractAddress() });
    // Claims go out without waiting for decisions, so the page can track each transaction itself.
    const found: ScanSummary = await runScan(client, {
      wait: false,
      runId: scanRequest.runId,
      workIds: [scanRequest.workId],
    });
    return Response.json({
      worksScanned: found.worksScanned,
      candidates: found.candidates.length,
      filed: found.filed.map((claim) => ({
        hash: claim.txHash,
        pageUrl: claim.pageUrl,
        imageUrl: claim.imageUrl,
        distance: claim.distance,
      })),
      skipped: found.skipped.length,
      errors: found.errors,
    });
  } catch (error) {
    if (error instanceof DemoConfigError) return Response.json({ error: error.message }, { status: 503 });
    console.error("scan failed:", (error as Error).message);
    return Response.json({ error: "The scan could not run. Try again." }, { status: 502 });
  }
}

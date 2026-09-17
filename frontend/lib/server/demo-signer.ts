import "server-only";

import { clientFor, HEAVY_FEES, LIGHT_FEES, submitWrite, type Hex } from "@licensehunter/agent/genlayer";

import type { DemoRole, DemoWriteRequest } from "@/lib/demo/roles";

const KEY_ENV: Record<DemoRole, "DEMO_CREATOR_PRIVATE_KEY" | "DEMO_SITE_OWNER_PRIVATE_KEY"> = {
  creator: "DEMO_CREATOR_PRIVATE_KEY",
  "site-owner": "DEMO_SITE_OWNER_PRIVATE_KEY",
};

// These methods make validators fetch pages or images, so they need the larger time allocation.
const HEAVY_METHODS = new Set(["register_work", "file_claim", "dispute"]);
// These methods pay out through an emitted message, which needs a declared fee allocation (docs/platform-checks.md).
const MESSAGE_METHODS = new Set(["withdraw_earnings", "withdraw_protocol_fees"]);

export class DemoConfigError extends Error {}

export function contractAddress(): string {
  const address = process.env.LICENSE_HUNTER_ADDRESS || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address) throw new DemoConfigError("The contract address is not configured.");
  return address;
}

export async function signDemoWrite(request: DemoWriteRequest): Promise<Hex> {
  const privateKey = process.env[KEY_ENV[request.role]];
  if (!privateKey) throw new DemoConfigError("Demo mode is not configured on this deployment.");
  return submitWrite(clientFor(privateKey as Hex), contractAddress(), request.method, request.args, {
    value: request.value,
    fees: HEAVY_METHODS.has(request.method) ? HEAVY_FEES : LIGHT_FEES,
    emitsMessages: MESSAGE_METHODS.has(request.method),
  });
}

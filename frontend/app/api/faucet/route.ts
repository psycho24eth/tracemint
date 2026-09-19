import { FAUCET_AMOUNT_WEI, FAUCET_CEILING_WEI, faucetAvailable } from "@/lib/faucet";
import { formatGen } from "@/lib/format";
import { GENLAYER_CHAIN } from "@/lib/genlayer/network";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const COOLDOWN_MS = 10 * 60_000;
const tryFund = createRateLimiter(20, 60_000);
// When each wallet was last funded. Lives in one server instance; the balance ceiling is the real limit.
const lastFunded = new Map<string, number>();

async function rpc<T>(method: string, paramsJson: string): Promise<T> {
  // Built by hand so the wei amount reaches the node as an exact JSON integer; JSON.stringify can't write
  // one above 2^53. The address in paramsJson has already been checked against ADDRESS.
  const response = await fetch(GENLAYER_CHAIN.rpcUrls.default.http[0], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: `{"jsonrpc":"2.0","id":1,"method":"${method}","params":${paramsJson}}`,
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (payload.error) throw new Error(`${method} failed: ${payload.error.message ?? "unknown error"}`);
  return payload.result as T;
}

const balanceOf = async (address: string) => BigInt(await rpc<string>("eth_getBalance", `["${address}","latest"]`));

/** Sends test GEN to a wallet on Studio networks, so a new wallet can pay transaction fees. */
export async function POST(request: Request) {
  if (!faucetAvailable(GENLAYER_CHAIN)) {
    return Response.json({ error: "This network has no test GEN faucet." }, { status: 501 });
  }

  const body = (await request.json().catch(() => ({}))) as { address?: unknown };
  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!ADDRESS.test(address)) {
    return Response.json({ error: "That is not a wallet address." }, { status: 400 });
  }

  const key = address.toLowerCase();
  const fundedAt = lastFunded.get(key);
  if (fundedAt !== undefined && Date.now() - fundedAt < COOLDOWN_MS) {
    return Response.json({ error: "This wallet received test GEN a few minutes ago. Try again later." }, { status: 429 });
  }
  if (!tryFund()) {
    return Response.json({ error: "The faucet is busy. Try again in a minute." }, { status: 429 });
  }

  try {
    const before = await balanceOf(address);
    if (before >= FAUCET_CEILING_WEI) {
      return Response.json(
        { error: `This wallet already holds ${formatGen(before, 2)}, enough for several transactions.` },
        { status: 409 },
      );
    }
    await rpc("sim_fundAccount", `["${address}",${FAUCET_AMOUNT_WEI.toString()}]`);
    lastFunded.set(key, Date.now());
    return Response.json({ balance: (await balanceOf(address)).toString() });
  } catch (error) {
    console.error("Faucet request failed:", error);
    return Response.json({ error: "The GenLayer network didn't send the test GEN. Try again in a minute." }, { status: 502 });
  }
}

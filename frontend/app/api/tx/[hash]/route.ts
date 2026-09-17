import { createClient, isSuccessful } from "genlayer-js";

import { GENLAYER_CHAIN } from "@/lib/genlayer/network";
import { isDecidedState } from "@/lib/genlayer/tx-utils";

export const runtime = "nodejs";

const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!HASH_PATTERN.test(hash)) return Response.json({ error: "Not a transaction hash" }, { status: 400 });

  try {
    const tx = await createClient({ chain: GENLAYER_CHAIN }).getTransaction({ hash: hash as never });
    const status = String(tx.statusName ?? "PENDING");
    const decided = isDecidedState(status);
    return Response.json(
      { hash, status, result: tx.txExecutionResultName ?? null, decided, successful: decided ? isSuccessful(tx) : null },
      { headers: NO_STORE },
    );
  } catch {
    // A just-submitted transaction may not be indexed yet; the caller keeps polling.
    return Response.json(
      { hash, status: "UNKNOWN", result: null, decided: false, successful: null },
      { headers: NO_STORE },
    );
  }
}

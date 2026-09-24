import { readFileSync } from "node:fs";
import { createAccount, createClient, generatePrivateKey, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

export type Hex = `0x${string}`;

export const RPC_URL = process.env.GENLAYER_RPC_URL ?? "https://studio-next.genlayer.com/api";
export const CHAIN_ID = Number(process.env.GENLAYER_CHAIN_ID ?? "61997");
export const EXPLORER_URL = "https://explorer-studio-dev.genlayer.com";

// The SDK has no Studio Next preset yet; reuse the Consensus v0.6 devnet preset with Studio Next's RPC.
export const studioNext = {
  ...studioDevnet,
  id: CHAIN_ID,
  name: "GenLayer Studio Next",
  rpcUrls: { default: { http: [RPC_URL] } },
} satisfies typeof studioDevnet;

export function clientFor(privateKey: Hex) {
  return createClient({ chain: studioNext, account: createAccount(privateKey) });
}

export type StudioClient = ReturnType<typeof clientFor>;

/**
 * Studio refuses work when its execution slots are full, and says how long to wait:
 *
 *   code: -32006, message: "Server busy: all 8 execution slots occupied, retry later",
 *   data: { retry_after_seconds: 2 }
 *
 * viem has no entry for -32006, so it surfaces this as JsonRpcVersionUnsupportedError — "Version of
 * JSON-RPC protocol is not supported" — and the real reason only appears on `details` and `cause`.
 * That is why the code, the message and the whole cause chain all get checked: a two-second queue
 * used to end a scheduled scan with a stack trace blaming the protocol version.
 */
const RETRYABLE_RPC_CODES = new Set([-32005, -32006]);
const RETRYABLE_RPC_TEXT = /server busy|execution slots|retry later|rate limit|too many requests|limit exceeded/i;
const DEFAULT_RETRY_MS = 2_000;
const MAX_RETRY_MS = 30_000;

export const RPC_RETRIES = Number(process.env.GENLAYER_RPC_RETRIES ?? "5");

/** The server's own wait in milliseconds, or null when the error is not worth retrying. */
export function retryableRpcError(error: unknown): { retryAfterMs: number; reason: string } | null {
  for (let node: unknown = error, depth = 0; node && depth < 5; depth += 1) {
    const it = node as Record<string, unknown>;
    const text = [it.details, it.shortMessage, it.message].filter((part) => typeof part === "string").join(" ");
    const seconds = (it.data as { retry_after_seconds?: unknown } | undefined)?.retry_after_seconds;

    if (RETRYABLE_RPC_CODES.has(Number(it.code)) || RETRYABLE_RPC_TEXT.test(text)) {
      return {
        retryAfterMs: typeof seconds === "number" && seconds > 0 ? seconds * 1_000 : DEFAULT_RETRY_MS,
        reason: (typeof it.details === "string" && it.details) || text || "the RPC asked us to retry",
      };
    }
    node = it.cause;
  }
  return null;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Retries a chain call while Studio says it is busy. Safe for writes as well as reads: a busy
 * refusal means the transaction was never accepted, and `file_claim` is idempotent on chain anyway
 * because claim_keys rejects a duplicate.
 */
export async function withRpcRetry<T>(label: string, call: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      const retry = retryableRpcError(error);
      if (!retry || attempt >= RPC_RETRIES) throw error;
      const wait = Math.min(retry.retryAfterMs * 2 ** attempt, MAX_RETRY_MS);
      console.warn(`${label}: ${retry.reason}. Retrying in ${wait}ms (${attempt + 1}/${RPC_RETRIES}).`);
      await sleep(wait);
    }
  }
}

export async function rpc<T>(method: string, paramsJson: string): Promise<T> {
  // Built by hand so wei amounts above 2^53 reach the server as exact JSON integers.
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: `{"jsonrpc":"2.0","id":1,"method":"${method}","params":${paramsJson}}`,
  });
  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (payload.error) throw new Error(`${method} failed: ${payload.error.message ?? "unknown error"}`);
  return payload.result as T;
}

export async function balanceOf(address: string): Promise<bigint> {
  return BigInt(await rpc<string>("eth_getBalance", `["${address}","latest"]`));
}

export const LIGHT_FEES = { leaderTimeunitsAllocation: 100, validatorTimeunitsAllocation: 200, rotations: [1] };
// validatorTimeunitsAllocation capped at 600 by the chain (PhaseTimeoutOutOfBounds(1200,30,600) observed at 1200); see docs/platform-checks.md.
// Judgments compare model verdicts, and a leader whose model reads the page differently (or cannot see images)
// is outvoted. Funding the chain's maximum of three rotations lets other leaders try before the claim is dropped.
export const HEAVY_FEES = { leaderTimeunitsAllocation: 600, validatorTimeunitsAllocation: 600, rotations: [3] };
export type FeePreset = typeof LIGHT_FEES;

export async function quoteFees(client: StudioClient, preset: FeePreset) {
  const estimate = await client.estimateTransactionFees(preset as never);
  return { distribution: estimate.distribution, feeValue: estimate.feeValue };
}

/**
 * Fees for a write that emits messages (payouts). Studio Next only funds contract-emitted messages
 * through a declared allocation tree, which the simulation derives; see docs/platform-checks.md.
 * The simulation executes the method, so use this only for cheap writes such as withdrawals.
 */
export async function quoteMessageFees(
  client: StudioClient,
  preset: FeePreset,
  call: { address: string; functionName: string; args: unknown[]; value: bigint },
) {
  const estimate = await client.estimateTransactionFeesForWrite({
    ...preset,
    address: call.address as Hex,
    functionName: call.functionName,
    args: call.args as never,
    value: call.value,
  } as never);
  return {
    distribution: estimate.distribution,
    feeValue: estimate.feeValue,
    ...(estimate.messageAllocations ? { messageAllocations: estimate.messageAllocations } : {}),
  };
}

export function json(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

export function describeTx(tx: any): string {
  return `${tx?.statusName ?? tx?.status ?? "unknown status"} / ${tx?.txExecutionResultName ?? "no execution result"}`;
}

export const txLink = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const addressLink = (address: string) => `${EXPLORER_URL}/address/${address}`;

export async function waitDecided(client: StudioClient, hash: Hex): Promise<any> {
  return client.waitForTransactionReceipt({ hash: hash as never, waitUntil: "decided", interval: 5000, retries: 120 });
}

export async function deploy(client: StudioClient, contractPath: string, args: unknown[]) {
  await client.initializeConsensusSmartContract();
  const fees = await quoteFees(client, LIGHT_FEES);
  const hash = (await client.deployContract({
    code: new Uint8Array(readFileSync(contractPath)),
    args: args as never,
    fees,
  })) as Hex;
  const tx = await waitDecided(client, hash);
  const address = (tx?.txDataDecoded?.contractAddress ?? tx?.data?.contract_address) as Hex | undefined;
  return { hash, tx, ok: isSuccessful(tx), address };
}

export async function submitWrite(
  client: StudioClient,
  address: string,
  functionName: string,
  args: unknown[],
  options: { value?: bigint; fees?: FeePreset; emitsMessages?: boolean } = {},
): Promise<Hex> {
  const preset = options.fees ?? LIGHT_FEES;
  const value = options.value ?? 0n;
  const fees = await withRpcRetry(`quote ${functionName}`, () =>
    options.emitsMessages
      ? quoteMessageFees(client, preset, { address, functionName, args, value })
      : quoteFees(client, preset),
  );
  return (await withRpcRetry(`submit ${functionName}`, () =>
    client.writeContract({
      address: address as Hex,
      functionName,
      args: args as never,
      value,
      fees: fees as never,
    }),
  )) as Hex;
}

export async function write(
  client: StudioClient,
  address: string,
  functionName: string,
  args: unknown[],
  options: { value?: bigint; fees?: FeePreset; emitsMessages?: boolean } = {},
) {
  const hash = await submitWrite(client, address, functionName, args, options);
  const tx = await waitDecided(client, hash);
  return { hash, tx, ok: isSuccessful(tx) };
}

export function toPlain(value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries([...value.entries()].map(([key, item]) => [String(key), toPlain(item)]));
  }
  if (Array.isArray(value)) return value.map(toPlain);
  return value;
}

export async function read(client: StudioClient, address: string, functionName: string, args: unknown[] = []) {
  return toPlain(
    await withRpcRetry(`read ${functionName}`, () =>
      client.readContract({ address: address as Hex, functionName, args: args as never }),
    ),
  );
}

export { createAccount, generatePrivateKey };

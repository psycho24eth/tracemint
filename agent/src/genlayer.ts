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
export const HEAVY_FEES = { leaderTimeunitsAllocation: 600, validatorTimeunitsAllocation: 600, rotations: [1] };
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

export async function write(
  client: StudioClient,
  address: string,
  functionName: string,
  args: unknown[],
  options: { value?: bigint; fees?: FeePreset; emitsMessages?: boolean } = {},
) {
  const preset = options.fees ?? LIGHT_FEES;
  const value = options.value ?? 0n;
  const fees = options.emitsMessages
    ? await quoteMessageFees(client, preset, { address, functionName, args, value })
    : await quoteFees(client, preset);
  const hash = (await client.writeContract({
    address: address as Hex,
    functionName,
    args: args as never,
    value,
    fees: fees as never,
  })) as Hex;
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
  return toPlain(await client.readContract({ address: address as Hex, functionName, args: args as never }));
}

export { createAccount, generatePrivateKey };

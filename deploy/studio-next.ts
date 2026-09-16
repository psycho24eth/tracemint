import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createAccount, createClient, generatePrivateKey, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

export type Hex = `0x${string}`;

export const RPC_URL = process.env.GENLAYER_RPC_URL ?? "https://studio-next.genlayer.com/api";
export const CHAIN_ID = Number(process.env.GENLAYER_CHAIN_ID ?? "61997");
export const EXPLORER_URL = "https://explorer-studio-dev.genlayer.com";
export const ENV_FILE = ".env.local";

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

export function loadEnv(): void {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
}

export function upsertEnv(key: string, value: string): void {
  const kept = existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, "utf8")
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith(`${key}=`))
    : [];
  kept.push(`${key}=${value}`);
  writeFileSync(ENV_FILE, `${kept.join("\n")}\n`);
  process.env[key] = value;
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key} in ${ENV_FILE}. Run "npm run accounts" first.`);
  return value;
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
export const HEAVY_FEES = { leaderTimeunitsAllocation: 600, validatorTimeunitsAllocation: 600, rotations: [1] };
export type FeePreset = typeof LIGHT_FEES;

export async function quoteFees(client: StudioClient, preset: FeePreset) {
  const estimate = await client.estimateTransactionFees(preset as never);
  return { distribution: estimate.distribution, feeValue: estimate.feeValue };
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
  options: { value?: bigint; fees?: FeePreset } = {},
) {
  const fees = await quoteFees(client, options.fees ?? LIGHT_FEES);
  const hash = (await client.writeContract({
    address: address as Hex,
    functionName,
    args: args as never,
    value: options.value ?? 0n,
    fees,
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

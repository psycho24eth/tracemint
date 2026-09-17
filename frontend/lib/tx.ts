import { encodeArgs, type DemoRole } from "@/lib/demo/roles";

export type TxStatus = {
  hash: string;
  status: string;
  result: string | null;
  decided: boolean;
  successful: boolean | null;
};

export const UNDECIDED_MESSAGE =
  "Validators couldn't agree, so nothing was recorded. Try again, or the agent will retry on its next run.";
export const STILL_WAITING_MESSAGE = "Still waiting for validators. Check the transaction in the explorer.";

export function outcomeMessage(status: TxStatus): string | null {
  if (!status.decided || status.successful) return null;
  if (status.status === "UNDETERMINED") return UNDECIDED_MESSAGE;
  if (status.result === "FINISHED_WITH_ERROR") {
    return "The contract rejected this transaction. Open it in the explorer to see why.";
  }
  return `The transaction ended with status ${status.status}.`;
}

export async function submitDemoWrite(
  request: { role: DemoRole; method: string; args: unknown[]; value?: bigint },
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchFn("/api/demo/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: request.role,
      method: request.method,
      args: encodeArgs(request.args),
      value: (request.value ?? 0n).toString(),
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { hash?: string; error?: string };
  if (!response.ok || !body.hash) throw new Error(body.error ?? `The demo write failed with HTTP ${response.status}.`);
  return body.hash;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForDemoTx(
  hash: string,
  {
    fetchFn = fetch,
    intervalMs = 4_000,
    timeoutMs = 300_000,
    wait = sleep,
  }: { fetchFn?: typeof fetch; intervalMs?: number; timeoutMs?: number; wait?: (ms: number) => Promise<void> } = {},
): Promise<TxStatus> {
  let status: TxStatus = { hash, status: "SUBMITTED", result: null, decided: false, successful: null };
  for (let waited = 0; ; waited += intervalMs) {
    const response = await fetchFn(`/api/tx/${hash}`, { cache: "no-store" });
    if (response.ok) status = (await response.json()) as TxStatus;
    if (status.decided || waited >= timeoutMs) return status;
    await wait(intervalMs);
  }
}

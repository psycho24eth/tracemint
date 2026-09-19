// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const GEN = 10n ** 18n;
const WALLET = "0x000000000000000000000000000000000000a11e";

type RpcCall = { method: string; body: string };
const calls: RpcCall[] = [];
let balances: bigint[] = [];
let failFunding = false;

const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
  const body = String(init?.body);
  const method = /"method":"([a-zA-Z_]+)"/.exec(body)?.[1] ?? "";
  calls.push({ method, body });
  if (method === "eth_getBalance") return Response.json({ jsonrpc: "2.0", id: 1, result: `0x${(balances.shift() ?? 0n).toString(16)}` });
  if (method === "sim_fundAccount") {
    return Response.json(failFunding ? { jsonrpc: "2.0", id: 1, error: { message: "boom" } } : { jsonrpc: "2.0", id: 1, result: true });
  }
  return Response.json({ jsonrpc: "2.0", id: 1, error: { message: "unexpected" } });
});

async function faucet() {
  vi.resetModules();
  return (await import("../app/api/faucet/route")).POST;
}

const ask = (address: unknown) =>
  new Request("http://localhost/api/faucet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
  });

beforeEach(() => {
  calls.length = 0;
  balances = [];
  failFunding = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/faucet", () => {
  it("sends 100 test GEN to a low wallet, as an exact integer amount", async () => {
    balances = [0n, 100n * GEN];
    const POST = await faucet();

    const response = await POST(ask(WALLET));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ balance: (100n * GEN).toString() });
    const funding = calls.find((call) => call.method === "sim_fundAccount");
    expect(funding?.body).toContain(`"params":["0x000000000000000000000000000000000000A11E",100000000000000000000]`);
  });

  // Studio Next files GEN sent to a lowercase address where balance reads never look.
  it("funds the checksummed address, whatever case the wallet reports", async () => {
    balances = [0n, 100n * GEN];
    const POST = await faucet();

    await POST(ask("0x00000000000000000000000000000000deadbeef"));

    const funding = calls.find((call) => call.method === "sim_fundAccount");
    expect(funding?.body).toContain(`"params":["0x00000000000000000000000000000000DeaDBeef",`);
  });

  it("waits for the balance to rise before it reports success", async () => {
    balances = [0n, 0n, 0n, 100n * GEN];
    vi.useFakeTimers();
    const POST = await faucet();

    const pending = POST(ask(WALLET));
    await vi.runAllTimersAsync();
    const response = await pending;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ balance: (100n * GEN).toString() });
    expect(calls.filter((call) => call.method === "eth_getBalance")).toHaveLength(4);
  });

  it("says so when the GEN never lands, and lets the wallet ask again", async () => {
    vi.useFakeTimers();
    const POST = await faucet();

    const pending = POST(ask(WALLET));
    await vi.runAllTimersAsync();
    const response = await pending;

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({ error: expect.stringContaining("hasn't reached your wallet") });

    calls.length = 0;
    balances = [0n, 100n * GEN];
    expect((await POST(ask(WALLET))).status).toBe(200);
  });

  it("rejects anything that isn't a wallet address before calling the network", async () => {
    const POST = await faucet();

    for (const address of ["", "0x123", `${WALLET}"]`, 42, null]) {
      expect((await POST(ask(address))).status).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it("doesn't top up a wallet that already has enough", async () => {
    balances = [250n * GEN];
    const POST = await faucet();

    const response = await POST(ask(WALLET));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: expect.stringContaining("250 GEN") });
    expect(calls.map((call) => call.method)).toEqual(["eth_getBalance"]);
  });

  it("asks a wallet it just funded to wait", async () => {
    balances = [0n, 100n * GEN];
    const POST = await faucet();
    await POST(ask(WALLET));

    const again = await POST(ask(WALLET.toUpperCase().replace("0X", "0x")));

    expect(again.status).toBe(429);
  });

  it("explains when the network doesn't send the GEN", async () => {
    balances = [0n];
    failFunding = true;
    const POST = await faucet();

    const response = await POST(ask(WALLET));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: expect.stringContaining("didn't send the test GEN") });
  });
});

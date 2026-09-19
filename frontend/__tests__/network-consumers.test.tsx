import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GENLAYER_CHAIN,
  GENLAYER_CHAIN_ID_HEX,
  GENLAYER_NETWORK,
} from "../lib/genlayer/network";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ readContract: vi.fn() })),
  createTransactionKit: vi.fn(() => ({ configured: true })),
}));

vi.mock("genlayer-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@genlayer/transaction-kit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@genlayer/transaction-kit")>()),
  createTransactionKit: mocks.createTransactionKit,
}));

import LicenseHunter from "../lib/contracts/LicenseHunter";
import { ensureGenLayerChain, withChainGuard, type Eip1193Provider, WalletError } from "../lib/genlayer/connection";
import { useTransactionKit } from "../lib/genlayer/kit";

const account = "0x1234567890123456789012345678901234567890";
const ETHEREUM = "0x1";

/** A wallet on `chainId` that answers switch and add requests the way the test scripts them. */
function wallet(chainId: string, handlers: Record<string, (params: unknown) => unknown> = {}) {
  const state = { chainId };
  const request = vi.fn(async ({ method, params }: { method: string; params?: unknown }) => {
    if (method in handlers) return handlers[method](params);
    if (method === "eth_chainId") return state.chainId;
    if (method === "wallet_switchEthereumChain") {
      state.chainId = GENLAYER_CHAIN_ID_HEX;
      return null;
    }
    return `result of ${method}`;
  });
  return { state, request, provider: { request } as Eip1193Provider, methods: () => request.mock.calls.map(([call]) => call.method) };
}

describe("network consumers", () => {
  beforeEach(() => {
    mocks.createClient.mockClear();
    mocks.createTransactionKit.mockClear();
  });

  it("uses the shared chain for contract clients", () => {
    const contract = new LicenseHunter(account, account);

    expect(mocks.createClient).toHaveBeenLastCalledWith({
      account,
      chain: GENLAYER_CHAIN,
    });

    contract.updateAccount("0x0000000000000000000000000000000000000001");
    expect(mocks.createClient).toHaveBeenLastCalledWith({
      account: "0x0000000000000000000000000000000000000001",
      chain: GENLAYER_CHAIN,
    });
  });

  it("signs Transaction Kit submissions with the connected wallet on the shared chain", () => {
    const { provider } = wallet(GENLAYER_CHAIN_ID_HEX);
    renderHook(() => useTransactionKit(account, provider));

    expect(mocks.createTransactionKit).toHaveBeenCalledWith({ account, chain: GENLAYER_CHAIN, provider });
  });

  it("does not create a signing kit without an account or a wallet", () => {
    const { provider } = wallet(GENLAYER_CHAIN_ID_HEX);
    expect(renderHook(() => useTransactionKit(null, provider)).result.current).toBeNull();
    expect(renderHook(() => useTransactionKit(account, null)).result.current).toBeNull();
    expect(mocks.createTransactionKit).not.toHaveBeenCalled();
  });
});

describe("ensureGenLayerChain", () => {
  it("leaves a wallet that is already on GenLayer alone", async () => {
    const { provider, methods } = wallet(GENLAYER_CHAIN_ID_HEX);

    await ensureGenLayerChain(provider);

    expect(methods()).toEqual(["eth_chainId"]);
  });

  it("switches a wallet that knows the network", async () => {
    const { provider, request } = wallet(ETHEREUM);

    await ensureGenLayerChain(provider);

    expect(request).toHaveBeenCalledWith({ method: "wallet_switchEthereumChain", params: [{ chainId: GENLAYER_CHAIN_ID_HEX }] });
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ method: "wallet_addEthereumChain" }));
  });

  it("adds the network when the wallet has never seen it, then switches", async () => {
    let known = false;
    const { provider, request, state, methods } = wallet(ETHEREUM, {
      wallet_switchEthereumChain: () => {
        if (!known) throw { code: -32603, message: 'Unrecognized chain ID "0xf22d".' };
        state.chainId = GENLAYER_CHAIN_ID_HEX;
        return null;
      },
      wallet_addEthereumChain: () => {
        known = true;
        return null;
      },
    });

    await ensureGenLayerChain(provider);

    expect(request).toHaveBeenCalledWith({ method: "wallet_addEthereumChain", params: [GENLAYER_NETWORK] });
    expect(methods().filter((method) => method.startsWith("wallet_"))).toEqual([
      "wallet_switchEthereumChain",
      "wallet_addEthereumChain",
      "wallet_switchEthereumChain",
    ]);
  });

  it("reports a declined switch without trying to add the network", async () => {
    const { provider, methods } = wallet(ETHEREUM, {
      wallet_switchEthereumChain: () => {
        throw { code: 4001, message: "User rejected the request." };
      },
    });

    await expect(ensureGenLayerChain(provider)).rejects.toMatchObject({ kind: "rejected" });
    expect(methods()).not.toContain("wallet_addEthereumChain");
  });

  it("reports a wallet that can't add custom networks", async () => {
    const { provider } = wallet(ETHEREUM, {
      wallet_switchEthereumChain: () => {
        throw { code: 4902, message: "Unrecognized chain" };
      },
      wallet_addEthereumChain: () => {
        throw { code: 4200, message: "Method not supported" };
      },
    });

    const failure = await ensureGenLayerChain(provider).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(WalletError);
    expect(failure).toMatchObject({ kind: "unsupported" });
  });
});

describe("withChainGuard", () => {
  it("moves the wallet to GenLayer before it signs a transaction", async () => {
    const { provider, methods } = wallet(ETHEREUM);

    await expect(withChainGuard(provider).request({ method: "eth_sendTransaction", params: [{}] })).resolves.toBe(
      "result of eth_sendTransaction",
    );

    const order = methods();
    expect(order.indexOf("wallet_switchEthereumChain")).toBeLessThan(order.indexOf("eth_sendTransaction"));
  });

  it("never sends the transaction when the switch is declined", async () => {
    const { provider, methods } = wallet(ETHEREUM, {
      wallet_switchEthereumChain: () => {
        throw { code: 4001, message: "User rejected the request." };
      },
    });

    await expect(withChainGuard(provider).request({ method: "eth_sendTransaction", params: [{}] })).rejects.toMatchObject({
      kind: "rejected",
    });
    expect(methods()).not.toContain("eth_sendTransaction");
  });

  it("passes reads straight through", async () => {
    const { provider, methods } = wallet(ETHEREUM);

    await withChainGuard(provider).request({ method: "eth_call", params: [] });

    expect(methods()).toEqual(["eth_call"]);
  });
});

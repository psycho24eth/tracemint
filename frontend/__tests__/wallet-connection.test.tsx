import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { watchWallets, type DiscoveredWallet } from "../lib/genlayer/eip6963";
import { GENLAYER_CHAIN_ID_HEX } from "../lib/genlayer/network";
import { useWallet, WalletProvider } from "../lib/genlayer/WalletProvider";

const ACCOUNT = "0x000000000000000000000000000000000000a11e";
const ETHEREUM = "0x1";
const installed: Array<() => void> = [];

type Handler = (params: any) => unknown;

/** A browser wallet that announces itself the way extensions do (EIP-6963). */
function installWallet({
  rdns = "io.metamask",
  name = "MetaMask",
  chainId = ETHEREUM,
  authorized = false,
  handlers = {} as Record<string, Handler>,
} = {}) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const state = { chainId, authorized };
  const emit = (event: string, ...args: unknown[]) => listeners.get(event)?.forEach((listener) => listener(...args));
  const request = vi.fn(async ({ method, params }: { method: string; params?: any }) => {
    if (method in handlers) return handlers[method](params);
    switch (method) {
      case "eth_requestAccounts":
        state.authorized = true;
        return [ACCOUNT];
      case "eth_accounts":
        return state.authorized ? [ACCOUNT] : [];
      case "eth_chainId":
        return state.chainId;
      case "wallet_switchEthereumChain":
        state.chainId = params[0].chainId;
        emit("chainChanged", state.chainId);
        return null;
      case "wallet_revokePermissions":
        state.authorized = false;
        return null;
      default:
        return null;
    }
  });
  const provider = {
    request,
    on: (event: string, listener: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(listener);
    },
    removeListener: (event: string, listener: (...args: unknown[]) => void) => listeners.get(event)?.delete(listener),
  };
  const announce = () =>
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({ info: { uuid: `uuid-${rdns}`, name, icon: "data:image/svg+xml,<svg/>", rdns }, provider }),
      }),
    );
  window.addEventListener("eip6963:requestProvider", announce);
  installed.push(() => window.removeEventListener("eip6963:requestProvider", announce));
  announce();
  return { state, request, emit, methods: () => request.mock.calls.map(([call]) => call.method) };
}

function Probe() {
  const wallet = useWallet();
  return (
    <>
      <output aria-label="wallets">{wallet.wallets.map((candidate) => candidate.info.name).join(", ")}</output>
      <output aria-label="status">
        {wallet.isRestoring
          ? "restoring"
          : wallet.isConnected
            ? `${wallet.address} ${wallet.isOnCorrectNetwork ? "on GenLayer" : "elsewhere"}`
            : "disconnected"}
      </output>
      <output aria-label="failure">{wallet.failure ? `${wallet.failure.action}:${wallet.failure.error.kind}` : "none"}</output>
      {wallet.wallets.map((candidate) => (
        <button key={candidate.info.rdns} type="button" onClick={() => void wallet.connect(candidate)}>
          Connect {candidate.info.name}
        </button>
      ))}
      <button type="button" onClick={wallet.disconnect}>
        Disconnect
      </button>
    </>
  );
}

const status = () => screen.getByRole("status", { name: "status" });

function renderWallet() {
  return render(
    <WalletProvider>
      <Probe />
    </WalletProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  installed.splice(0).forEach((uninstall) => uninstall());
  Reflect.deleteProperty(window, "ethereum");
});

describe("wallet discovery", () => {
  it("lists every wallet the browser announces, once each", () => {
    installWallet();
    installWallet({ rdns: "io.rabby", name: "Rabby Wallet" });
    const seen: DiscoveredWallet[][] = [];

    const stop = watchWallets((wallets) => seen.push(wallets));
    stop();

    expect(seen.at(-1)?.map((wallet) => wallet.info.name)).toEqual(["MetaMask", "Rabby Wallet"]);
  });

  it("falls back to window.ethereum, named from its flags, when nothing announces", () => {
    Object.defineProperty(window, "ethereum", { configurable: true, value: { isMetaMask: true, isRabby: true, request: vi.fn() } });
    let latest: DiscoveredWallet[] = [];

    watchWallets((wallets) => (latest = wallets))();

    expect(latest.map((wallet) => [wallet.info.name, wallet.info.rdns])).toEqual([["Rabby Wallet", "injected"]]);
  });
});

describe("WalletProvider", () => {
  it("connects the picked wallet, then switches it to GenLayer", async () => {
    const wallet = installWallet();
    renderWallet();

    fireEvent.click(await screen.findByRole("button", { name: "Connect MetaMask" }));

    await waitFor(() => expect(status()).toHaveTextContent(`${ACCOUNT} on GenLayer`));
    expect(wallet.methods()).toContain("eth_requestAccounts");
    expect(wallet.state.chainId).toBe(GENLAYER_CHAIN_ID_HEX);
    expect(window.localStorage.getItem("tracemint.wallet")).toBe("io.metamask");
  });

  it("stays connected but reports it when the network switch is declined", async () => {
    installWallet({
      handlers: {
        wallet_switchEthereumChain: () => {
          throw { code: 4001, message: "User rejected the request." };
        },
      },
    });
    renderWallet();

    fireEvent.click(await screen.findByRole("button", { name: "Connect MetaMask" }));

    await waitFor(() => expect(screen.getByRole("status", { name: "failure" })).toHaveTextContent("switch:rejected"));
    expect(status()).toHaveTextContent(`${ACCOUNT} elsewhere`);
  });

  it("explains a declined connection and stays disconnected", async () => {
    installWallet({
      handlers: {
        eth_requestAccounts: () => {
          throw { code: 4001, message: "User rejected the request." };
        },
      },
    });
    renderWallet();

    fireEvent.click(await screen.findByRole("button", { name: "Connect MetaMask" }));

    await waitFor(() => expect(screen.getByRole("status", { name: "failure" })).toHaveTextContent("connect:rejected"));
    expect(status()).toHaveTextContent("disconnected");
  });

  it("reconnects a returning visitor's wallet without a prompt", async () => {
    window.localStorage.setItem("tracemint.wallet", "io.metamask");
    const wallet = installWallet({ chainId: GENLAYER_CHAIN_ID_HEX, authorized: true });
    renderWallet();

    await waitFor(() => expect(status()).toHaveTextContent(`${ACCOUNT} on GenLayer`));
    expect(wallet.methods()).not.toContain("eth_requestAccounts");
  });

  it("follows network and account changes made inside the wallet", async () => {
    window.localStorage.setItem("tracemint.wallet", "io.metamask");
    const wallet = installWallet({ chainId: GENLAYER_CHAIN_ID_HEX, authorized: true });
    renderWallet();
    await waitFor(() => expect(status()).toHaveTextContent("on GenLayer"));

    act(() => wallet.emit("chainChanged", ETHEREUM));
    expect(status()).toHaveTextContent("elsewhere");

    act(() => wallet.emit("accountsChanged", []));
    expect(status()).toHaveTextContent("disconnected");
    expect(window.localStorage.getItem("tracemint.wallet")).toBeNull();
  });

  it("disconnects, revokes the site's access, and forgets the wallet", async () => {
    window.localStorage.setItem("tracemint.wallet", "io.metamask");
    const wallet = installWallet({ chainId: GENLAYER_CHAIN_ID_HEX, authorized: true });
    renderWallet();
    await waitFor(() => expect(status()).toHaveTextContent("on GenLayer"));

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(status()).toHaveTextContent("disconnected");
    expect(wallet.methods()).toContain("wallet_revokePermissions");
    expect(window.localStorage.getItem("tracemint.wallet")).toBeNull();
  });
});

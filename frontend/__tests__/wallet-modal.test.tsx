import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WalletError } from "../lib/genlayer/connection";
import type { DiscoveredWallet } from "../lib/genlayer/eip6963";

const GEN = 10n ** 18n;
const ACCOUNT = "0x000000000000000000000000000000000000a11e";

const metamask: DiscoveredWallet = {
  info: { uuid: "1", name: "MetaMask", icon: "data:image/svg+xml,<svg/>", rdns: "io.metamask" },
  provider: { request: vi.fn() },
};
const rabby: DiscoveredWallet = {
  info: { uuid: "2", name: "Rabby Wallet", icon: "data:image/svg+xml,<svg/>", rdns: "io.rabby" },
  provider: { request: vi.fn() },
};

const actions = vi.hoisted(() => ({
  connect: vi.fn(),
  cancel: vi.fn(),
  switchNetwork: vi.fn(),
  switchAccount: vi.fn(),
  disconnect: vi.fn(),
  openModal: vi.fn(),
  closeModal: vi.fn(),
}));

let wallet: Record<string, unknown>;
let balance: bigint | undefined;

vi.mock("@/lib/genlayer/wallet", () => ({ useWallet: () => wallet }));
vi.mock("@/lib/hooks/useGenBalance", () => ({ useGenBalance: () => ({ data: balance, isError: false }) }));
vi.mock("@/components/wallet/TestGenButton", () => ({ TestGenButton: () => <button type="button">Get 100 test GEN</button> }));
vi.mock("@/components/demo/DemoAccessPanel", () => ({ DemoAccessPanel: () => <p>Demo only panel</p> }));

import { WalletModal } from "../components/wallet/WalletModal";

function setWallet(overrides: Record<string, unknown>) {
  wallet = {
    wallets: [],
    wallet: null,
    pendingWallet: null,
    address: null,
    chainId: null,
    activity: "idle",
    failure: null,
    isConnected: false,
    isOnCorrectNetwork: false,
    isRestoring: false,
    provider: null,
    modal: { open: true, view: "connect" },
    ...actions,
    ...overrides,
  };
}

const connected = { isConnected: true, address: ACCOUNT, wallet: metamask.info, chainId: 61997, isOnCorrectNetwork: true };

beforeEach(() => {
  Object.values(actions).forEach((action) => action.mockReset());
  balance = 50n * GEN;
  setWallet({});
});

afterEach(cleanup);

describe("WalletModal", () => {
  it("lists the installed wallets, recommends MetaMask, and connects the one picked", () => {
    setWallet({ wallets: [rabby, metamask] });
    render(<WalletModal />);

    expect(screen.getByRole("dialog", { name: "Connect a wallet" })).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Demo only panel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Rabby Wallet/ }));

    expect(actions.connect).toHaveBeenCalledWith(rabby);
  });

  it("points a visitor without a wallet to installs", () => {
    render(<WalletModal />);

    expect(screen.getByText("No wallet in this browser yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Install MetaMask/ })).toHaveAttribute("href", "https://metamask.io/download/");
    expect(screen.getByRole("link", { name: /Rabby Wallet/ })).toHaveAttribute("href", "https://rabby.io/");
  });

  it("waits on the wallet, then offers a way back", () => {
    setWallet({ activity: "connecting", pendingWallet: metamask });
    render(<WalletModal />);

    expect(screen.getByRole("dialog", { name: "Waiting for MetaMask" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use another wallet" }));
    expect(actions.cancel).toHaveBeenCalled();
  });

  it("explains a declined connection and retries it", () => {
    setWallet({ pendingWallet: metamask, failure: { action: "connect", error: new WalletError("rejected", "declined") } });
    render(<WalletModal />);

    expect(screen.getByRole("dialog", { name: "Connection declined" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(actions.connect).toHaveBeenCalledWith(metamask);
  });

  it("shows the network's settings when the wallet can't add it", () => {
    setWallet({
      ...connected,
      chainId: 1,
      isOnCorrectNetwork: false,
      failure: { action: "switch", error: new WalletError("unsupported", "no") },
    });
    render(<WalletModal />);

    expect(screen.getByRole("dialog", { name: "MetaMask can't add GenLayer" })).toBeInTheDocument();
    expect(screen.getByText("61997")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy chain id" })).toBeInTheDocument();
  });

  it("finishes on the network with a balance, and offers test GEN to an empty wallet", () => {
    balance = 0n;
    setWallet(connected);
    render(<WalletModal />);

    expect(screen.getByRole("dialog", { name: "You're connected" })).toBeInTheDocument();
    expect(screen.getByText("0 GEN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get 100 test GEN" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(actions.closeModal).toHaveBeenCalled();
  });

  it("tells a wallet on the GenLayer testnet that its GEN stays there and Studio Next GEN is free", () => {
    setWallet({ ...connected, chainId: 4221, isOnCorrectNetwork: false });
    render(<WalletModal />);

    expect(screen.getByRole("dialog", { name: "Switch to GenLayer" })).toHaveAccessibleDescription(
      /on the GenLayer Testnet\. TraceMint runs on GenLayer Studio Next, a separate network with its own free GEN\. Your testnet GEN stays where it is\./,
    );
    fireEvent.click(screen.getByRole("button", { name: "Switch network" }));
    expect(actions.switchNetwork).toHaveBeenCalled();
  });

  it("labels the balance with the network it is counted on", () => {
    setWallet(connected);
    render(<WalletModal />);

    expect(screen.getByText("Studio Next balance")).toBeInTheDocument();
  });

  it("manages the connected account: switch network, change wallet, disconnect", () => {
    setWallet({ ...connected, chainId: 1, isOnCorrectNetwork: false, modal: { open: true, view: "account" } });
    render(<WalletModal />);

    expect(screen.getByRole("dialog", { name: "MetaMask" })).toBeInTheDocument();
    expect(screen.getByText("Ethereum")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch network" }));
    expect(actions.switchNetwork).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Change wallet" }));
    expect(actions.disconnect).toHaveBeenCalled();
    expect(actions.openModal).toHaveBeenCalledWith("connect");
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ role: null as null | "creator" | "site-owner", address: null as string | null }));

vi.mock("@/lib/demo/DemoModeProvider", () => ({ useDemoMode: () => ({ role: state.role, setRole: () => {} }) }));
vi.mock("@/lib/genlayer/wallet", () => ({
  useWallet: () => ({
    address: state.address,
    provider: null,
    isOnCorrectNetwork: true,
    openModal: vi.fn(),
    switchNetwork: vi.fn(),
  }),
}));
vi.mock("@/lib/hooks/useGenBalance", () => ({ useGenBalance: () => ({ data: undefined }) }));
vi.mock("@/lib/hooks/useLicenseHunter", () => ({ useRefreshLicenseHunter: () => vi.fn() }));
// A kit stands in for a connected wallet; these tests are about who may act, not about signing.
vi.mock("@/lib/genlayer/kit", () => ({ useTransactionKit: (address: string | null) => (address ? {} : null) }));
vi.mock("@/lib/genlayer/client", () => ({
  getContractAddress: () => "0x00000000000000000000000000000000000000c0",
  GENLAYER_NETWORK: { chainName: "GenLayer Studio Next" },
}));
vi.mock("@/lib/demo/roles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/demo/roles")>()),
  demoAddress: (role: string) => (role === "creator" ? CREATOR : SITE_OWNER),
}));

import { WatchlistEditor } from "@/components/WatchlistEditor";
import { walletOnlyReason } from "@/lib/actor";
import type { Work } from "@/lib/contracts/LicenseHunter";

const CREATOR = "0x1051C5430000000000000000000000000000C543";
const SITE_OWNER = "0x0000000000000000000000000000000000005170";
const STRANGER = "0x195cC081a8e97e8Ea524b890a7eBA97642184850";

const work: Work = {
  id: 1,
  creator: CREATOR,
  title: "Cybernetic Horizon",
  imageUrl: "https://example.com/a.png",
  portfolioUrl: "https://example.com",
  basePrice: 10n ** 19n,
  terms: "Non-exclusive web license, 12 months",
  watchUrls: ["https://example.com/demo/blog/glass-tide"],
  createdAt: 0,
};

afterEach(() => {
  cleanup();
  state.role = null;
  state.address = null;
});

describe("walletOnlyReason", () => {
  it("lets the wallet the contract expects through, whatever case it is written in", () => {
    const reason = walletOnlyReason({
      expected: CREATOR,
      actor: CREATOR.toLowerCase(),
      action: "change this watchlist",
      inDemoMode: false,
    });

    expect(reason).toBeNull();
  });

  it("names the wallet that may act, and how to become it", () => {
    expect(
      walletOnlyReason({ expected: CREATOR, actor: STRANGER, action: "change this watchlist", inDemoMode: false }),
    ).toBe("Only 0x1051…C543 can change this watchlist. Switch to that wallet and try again.");
    expect(
      walletOnlyReason({ expected: CREATOR, actor: STRANGER, action: "change this watchlist", inDemoMode: true }),
    ).toBe("Only 0x1051…C543 can change this watchlist. Exit demo mode and connect that wallet to continue.");
    expect(walletOnlyReason({ expected: CREATOR, actor: null, action: "dispute this notice", inDemoMode: false })).toBe(
      "Connect 0x1051…C543 to dispute this notice.",
    );
  });

  // The contract is the authority; a guess with nothing to compare against would only block real owners.
  it("blocks nothing when it cannot tell who is acting", () => {
    expect(walletOnlyReason({ expected: CREATOR, actor: null, action: "act", inDemoMode: true })).toBeNull();
    expect(walletOnlyReason({ expected: "", actor: STRANGER, action: "act", inDemoMode: false })).toBeNull();
  });
});

describe("WatchlistEditor", () => {
  it("refuses to send a save the contract would reject, and says whose watchlist it is", () => {
    state.address = STRANGER;
    render(<WatchlistEditor work={work} />);

    expect(screen.getByRole("button", { name: "Save watchlist" })).toBeDisabled();
    expect(screen.getByText(/Only 0x1051…C543 can change this watchlist/)).toBeInTheDocument();
    expect(screen.getByText(/only its watchlist is theirs to edit/)).toBeInTheDocument();
  });

  it("lets the creator save", () => {
    state.address = CREATOR.toLowerCase();
    render(<WatchlistEditor work={work} />);

    expect(screen.getByRole("button", { name: "Save watchlist" })).toBeEnabled();
    expect(screen.queryByText(/can change this watchlist/)).not.toBeInTheDocument();
  });

  it("lets the demo creator save the demo work", () => {
    state.role = "creator";
    render(<WatchlistEditor work={{ ...work, creator: CREATOR }} />);

    expect(screen.getByRole("button", { name: "Save watchlist" })).toBeEnabled();
  });
});

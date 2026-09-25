import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const GEN = 10n ** 18n;

const state = vi.hoisted(() => ({
  actingAddress: "0x1234567890123456789012345678901234567890" as string | null,
  writeActionProps: null as any,
  zeroEarnings: false,
  /** A connected wallet that has never registered anything: no works, no claims, no money. */
  empty: false,
  openModal: vi.fn(),
}));

vi.mock("@/lib/genlayer/wallet", () => ({ useWallet: () => ({ openModal: state.openModal }) }));

vi.mock("@/components/demo/DemoAccessPanel", () => ({
  DemoAccessPanel: () => <section aria-label="Demo access" />,
}));

vi.mock("@/components/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/demo/DemoModeProvider", () => ({
  useActingAddress: () => state.actingAddress,
}));

vi.mock("@/lib/hooks/useLicenseHunter", () => ({
  useEarnings: (creator: string | null) => ({
    data: creator && !state.zeroEarnings && !state.empty ? 43_650_000_000_000_000_000n : 0n,
    isLoading: false,
  }),
  useLicensesFor: () => ({ data: [], isLoading: false }),
  useWorks: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/hooks/useCreatorLedger", () => ({
  useCreatorLedger: (creator: string | null) => ({
    data: creator
      ? {
          works: [],
          claims: [],
          lifetimeEarnings: state.empty ? 0n : 43_650_000_000_000_000_000n,
          byStatus: { NOTICE_ISSUED: 0, NO_NOTICE: 0, PAID: state.empty ? 0 : 1, WITHDRAWN: 0, DISPUTE_REJECTED: 0 },
        }
      : null,
    isLoading: false,
  }),
}));

vi.mock("@/components/WriteAction", () => ({
  WriteAction: (props: any) => {
    state.writeActionProps = props;
    return <button disabled={props.disabled}>Withdraw</button>;
  },
}));

import DashboardPage from "../app/dashboard/page";

beforeEach(() => {
  state.actingAddress = "0x1234567890123456789012345678901234567890";
  state.writeActionProps = null;
  state.zeroEarnings = false;
  state.empty = false;
  state.openModal.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("Dashboard", () => {
  it("shows earnings of 43.65 GEN and enables the Withdraw button", () => {
    render(<DashboardPage />);
    const genTexts = screen.getAllByText("43.65 GEN");
    expect(genTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Withdraw" })).not.toBeDisabled();
    expect(state.writeActionProps).toMatchObject({
      method: "withdraw_earnings",
      args: [],
      label: "Withdraw",
      disabled: false,
    });
  });

  it("disables the Withdraw button when earnings are zero", () => {
    state.zeroEarnings = true;
    render(<DashboardPage />);
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeDisabled();
    expect(state.writeActionProps.disabled).toBe(true);
  });

  describe("with a connected wallet that has registered nothing", () => {
    // This is the page someone opens straight after connecting. It used to show five zeros, a dead
    // Withdraw button and no route onward at all, which is where new creators gave up.
    it("says there is nothing yet and offers the walkthrough first", () => {
      state.empty = true;
      render(<DashboardPage />);

      expect(screen.getByRole("heading", { level: 1, name: /Nothing here yet/ })).toBeInTheDocument();
      expect(screen.getByText(/haven't added a picture to watch over yet/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Show me how it works" })).toHaveAttribute("href", "/start");
      expect(screen.getByRole("link", { name: "Add a picture now" })).toHaveAttribute("href", "/works#register");
    });

    it("drops the zeros rather than showing a Withdraw button with nothing behind it", () => {
      state.empty = true;
      render(<DashboardPage />);

      expect(screen.queryByRole("button", { name: "Withdraw" })).not.toBeInTheDocument();
      expect(screen.queryByText("0 GEN")).not.toBeInTheDocument();
    });
  });

  it("keeps an unwithdrawn balance visible instead of hiding it behind onboarding", () => {
    // Works can be empty while earnings are not, and burying the money would be far worse than a
    // dull page. The empty state has to check the balance too, not just the works list.
    state.zeroEarnings = false;
    render(<DashboardPage />);

    expect(screen.queryByText(/Nothing here yet/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Withdraw" })).not.toBeDisabled();
  });

  it("offers a wallet or a demo code when there is no acting address", () => {
    state.actingAddress = null;
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(state.openModal).toHaveBeenCalledWith("connect");
    expect(screen.getByRole("region", { name: "Demo access" })).toBeInTheDocument();
  });
});

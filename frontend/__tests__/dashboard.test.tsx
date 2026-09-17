import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const GEN = 10n ** 18n;

const state = vi.hoisted(() => ({
  actingAddress: "0x1234567890123456789012345678901234567890" as string | null,
  writeActionProps: null as any,
  zeroEarnings: false,
}));

vi.mock("@/components/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/demo/DemoModeProvider", () => ({
  useActingAddress: () => state.actingAddress,
}));

vi.mock("@/lib/hooks/useLicenseHunter", () => ({
  useEarnings: (creator: string | null) => ({
    data: creator && !state.zeroEarnings ? 43_650_000_000_000_000_000n : 0n,
    isLoading: false,
  }),
}));

vi.mock("@/lib/hooks/useCreatorLedger", () => ({
  useCreatorLedger: (creator: string | null) => ({
    data: creator
      ? {
          works: [],
          claims: [],
          lifetimeEarnings: 43_650_000_000_000_000_000n,
          byStatus: { NOTICE_ISSUED: 0, NO_NOTICE: 0, PAID: 1, WITHDRAWN: 0, DISPUTE_REJECTED: 0 },
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

  it("shows the connect message when there is no acting address", () => {
    state.actingAddress = null;
    render(<DashboardPage />);
    expect(screen.getByText(/Connect a wallet or pick a demo role to see earnings/)).toBeInTheDocument();
  });
});

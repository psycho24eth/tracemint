import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  role: null as null | "creator" | "site-owner",
  address: null as string | null,
  refresh: vi.fn(),
}));

vi.mock("@/lib/demo/DemoModeProvider", () => ({ useDemoMode: () => ({ role: state.role, setRole: () => {} }) }));
vi.mock("@/lib/genlayer/wallet", () => ({ useWallet: () => ({ address: state.address }) }));
vi.mock("@/lib/genlayer/kit", async () => {
  const { createMockKit } = await import("@genlayer/transaction-kit-react");
  const kit = createMockKit({ delays: { estimate: 0, submit: 0, step: 0 } });
  return { useTransactionKit: (address: string | null) => (address ? kit : null) };
});
vi.mock("@/lib/genlayer/client", () => ({
  getContractAddress: () => "0x00000000000000000000000000000000000000c0",
  GENLAYER_NETWORK: { chainName: "GenLayer Studio Next" },
}));
vi.mock("@/lib/hooks/useLicenseHunter", () => ({ useRefreshLicenseHunter: () => state.refresh }));

import { WriteAction } from "../components/WriteAction";
import { UNDECIDED_MESSAGE } from "../lib/tx";

const HASH = `0x${"ef".repeat(32)}`;
const GEN = 10n ** 18n;

const reply = (body: unknown, httpStatus = 200) =>
  ({ ok: httpStatus < 400, status: httpStatus, json: async () => body }) as unknown as Response;

const decided = (overrides: Record<string, unknown> = {}) =>
  reply({ hash: HASH, status: "ACCEPTED", result: "FINISHED_WITH_RETURN", decided: true, successful: true, ...overrides });

const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
  url === "/api/demo/write" ? reply({ hash: HASH }) : decided(),
);

beforeEach(() => {
  state.role = null;
  state.address = null;
  state.refresh.mockClear();
  fetchMock.mockClear();
  fetchMock.mockImplementation(async (url: string) => (url === "/api/demo/write" ? reply({ hash: HASH }) : decided()));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WriteAction in demo mode", () => {
  it("signs through the demo API, waits for validators, and refreshes", async () => {
    state.role = "creator";
    const onSuccess = vi.fn();
    render(<WriteAction method="withdraw_earnings" args={[]} label="Withdraw" onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(await screen.findByText(/^Done\./)).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(state.refresh).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      role: "creator",
      method: "withdraw_earnings",
      args: [],
      value: "0",
    });
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/tx/${HASH}`);
  });

  it("sends a payment value as a wei string", async () => {
    state.role = "site-owner";
    render(<WriteAction method="pay_license" args={[7]} value={45n * GEN} label="Pay 45 GEN" />);

    fireEvent.click(screen.getByRole("button", { name: "Pay 45 GEN" }));

    await screen.findByText(/^Done\./);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      args: [7],
      value: "45000000000000000000",
    });
  });

  it("asks for the demo role that may call the method", () => {
    state.role = "creator";
    render(<WriteAction method="pay_license" args={[7]} value={45n * GEN} label="Pay 45 GEN" />);

    expect(screen.getByRole("button", { name: "Pay 45 GEN" })).toBeDisabled();
    expect(screen.getByText("Switch to the demo site owner role to do this.")).toBeInTheDocument();
  });

  it("explains when validators could not agree", async () => {
    state.role = "creator";
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/demo/write" ? reply({ hash: HASH }) : decided({ status: "UNDETERMINED", result: null, successful: false }),
    );
    const onSuccess = vi.fn();
    render(
      <WriteAction
        method="file_claim"
        args={[1, "https://a.example/p", "https://a.example/i.png"]}
        label="File claim"
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "File claim" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(UNDECIDED_MESSAGE);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("shows the API's error", async () => {
    state.role = "creator";
    fetchMock.mockImplementation(async () => reply({ error: "Demo mode is busy. Try again in a minute." }, 429));
    render(<WriteAction method="withdraw_earnings" args={[]} label="Withdraw" />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Demo mode is busy. Try again in a minute.");
  });

  it("does nothing when onBeforeSubmit returns false", () => {
    state.role = "creator";
    render(<WriteAction method="withdraw_earnings" args={[]} label="Withdraw" onBeforeSubmit={() => false} />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("WriteAction in wallet mode", () => {
  it("asks for a wallet when none is connected", () => {
    render(<WriteAction method="update_watchlist" args={[1, []]} label="Save watchlist" />);

    expect(screen.getByRole("button", { name: "Save watchlist" })).toBeDisabled();
    expect(screen.getByText("Connect your wallet to continue.")).toBeInTheDocument();
  });

  it("explains that wallet payouts go through the demo creator role", () => {
    state.address = "0x000000000000000000000000000000000000a11e";
    render(<WriteAction method="withdraw_earnings" args={[]} label="Withdraw" />);

    expect(screen.getByRole("button", { name: "Withdraw" })).toBeDisabled();
    expect(
      screen.getByText(
        "Withdrawing from a connected wallet isn't supported on Studio Next yet: payouts need a message fee allocation that wallet signing can't send.",
      ),
    ).toBeInTheDocument();
  });

  it("opens the transaction panel and finishes when the wallet flow succeeds", async () => {
    state.address = "0x000000000000000000000000000000000000a11e";
    const onSuccess = vi.fn();
    render(<WriteAction method="update_watchlist" args={[1, []]} label="Save watchlist" onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: "Save watchlist" }));
    const hold = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>("button.gltk-hold");
      if (!button) throw new Error("Hold to sign button was not rendered");
      expect(button).toBeEnabled();
      return button;
    });
    fireEvent.click(hold);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

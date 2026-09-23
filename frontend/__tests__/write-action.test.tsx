import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  role: null as null | "creator" | "site-owner",
  address: null as string | null,
  onGenLayer: true,
  balance: undefined as bigint | undefined,
  refresh: vi.fn(),
  openModal: vi.fn(),
  switchNetwork: vi.fn(async () => true),
}));

vi.mock("@/lib/demo/DemoModeProvider", () => ({ useDemoMode: () => ({ role: state.role, setRole: () => {} }) }));
vi.mock("@/lib/genlayer/wallet", () => ({
  useWallet: () => ({
    address: state.address,
    provider: state.address ? { request: vi.fn() } : null,
    isOnCorrectNetwork: state.onGenLayer,
    openModal: state.openModal,
    switchNetwork: state.switchNetwork,
  }),
}));
vi.mock("@/lib/hooks/useGenBalance", () => ({ useGenBalance: () => ({ data: state.balance }) }));
vi.mock("@/components/wallet/TestGenButton", () => ({ TestGenButton: () => <button type="button">Get test GEN</button> }));
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
  state.onGenLayer = true;
  state.balance = undefined;
  state.refresh.mockClear();
  state.openModal.mockClear();
  state.switchNetwork.mockReset().mockResolvedValue(true);
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

  it("times the wait and names the consensus step the validators are on", async () => {
    state.role = "creator";
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/demo/write" ? reply({ hash: HASH }) : decided({ status: "PROPOSING", result: null, decided: false, successful: null }),
    );
    render(<WriteAction method="withdraw_earnings" args={[]} label="Withdraw" />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(await screen.findByText("Leader proposes")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("0:00");
    expect(screen.getByRole("button", { name: /Validators vote/ })).toBeInTheDocument();
  });

  it("keeps the time the decision took", async () => {
    state.role = "creator";
    render(<WriteAction method="withdraw_earnings" args={[]} label="Withdraw" />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(await screen.findByText(/^Done\./)).toBeInTheDocument();
    expect(screen.getByText(/Decided in \d:\d\d/)).toBeInTheDocument();
    expect(screen.getByRole("timer")).toBeInTheDocument();
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
  it("opens the wallet picker when no wallet is connected", () => {
    render(<WriteAction method="update_watchlist" args={[1, []]} label="Save watchlist" />);

    expect(screen.getByText("Connect a wallet to continue.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save watchlist" }));

    expect(state.openModal).toHaveBeenCalledWith("connect");
  });

  it("switches the wallet to GenLayer before it opens the transaction panel", async () => {
    state.address = "0x000000000000000000000000000000000000a11e";
    state.onGenLayer = false;
    render(<WriteAction method="update_watchlist" args={[1, []]} label="Save watchlist" />);

    fireEvent.click(screen.getByRole("button", { name: "Save watchlist" }));

    await waitFor(() => expect(document.querySelector("button.gltk-hold")).not.toBeNull());
    expect(state.switchNetwork).toHaveBeenCalledTimes(1);
  });

  it("stops when the wallet stays on another network", async () => {
    state.address = "0x000000000000000000000000000000000000a11e";
    state.onGenLayer = false;
    state.switchNetwork.mockResolvedValue(false);
    render(<WriteAction method="update_watchlist" args={[1, []]} label="Save watchlist" />);

    fireEvent.click(screen.getByRole("button", { name: "Save watchlist" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your wallet is still on another network.");
    expect(document.querySelector("button.gltk-hold")).toBeNull();
  });

  it("shows the balance and offers test GEN beside a payment the wallet can't cover", async () => {
    state.address = "0x000000000000000000000000000000000000a11e";
    state.balance = 2n * GEN;
    render(<WriteAction method="pay_license" args={[7]} value={45n * GEN} label="Pay 45 GEN" />);

    fireEvent.click(screen.getByRole("button", { name: "Pay 45 GEN" }));

    expect(await screen.findByText(/not enough to send 45 GEN plus fees/)).toBeInTheDocument();
    expect(screen.getByText("2 GEN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get test GEN" })).toBeInTheDocument();
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

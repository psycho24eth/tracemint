import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Claim } from "@/lib/contracts/LicenseHunter";

const state = vi.hoisted(() => ({
  role: null as null | "creator" | "site-owner",
  setRole: vi.fn(),
  accessCode: "judge-code" as string | null,
  unlock: vi.fn(),
  exit: vi.fn(),
}));

/** What the contract currently says, which is what decides every step's state. */
const chain = vi.hoisted(() => ({
  claims: [] as unknown[],
  earnings: 0n,
}));

vi.mock("@/components/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// The real controls are exercised by their own suites; here we only care that the run offers them.
vi.mock("@/components/ScanNowButton", () => ({
  default: ({ workId }: { workId: number }) => <button data-testid="scan-now">Scan work {workId}</button>,
}));
vi.mock("@/components/WriteAction", () => ({
  WriteAction: ({ method, label }: { method: string; label: string }) => (
    <button data-testid={`write-${method}`}>{label}</button>
  ),
}));
vi.mock("@/components/DisputeForm", () => ({
  DisputeForm: () => <div data-testid="dispute-form" />,
}));

vi.mock("@/lib/demo/DemoModeProvider", () => ({
  useDemoMode: () => ({
    role: state.role,
    setRole: state.setRole,
    accessCode: state.accessCode,
    unlock: state.unlock,
    exit: state.exit,
  }),
}));

vi.mock("@/lib/demo/roles", async () => {
  const actual = await vi.importActual("@/lib/demo/roles");
  return { ...actual, demoAddress: (role: string) => (role === "creator" ? "0xaaaa" : "0xbbbb") };
});

vi.mock("@/lib/hooks/useLicenseHunter", () => ({
  useWorks: () => ({
    data: [
      {
        id: 1,
        creator: "0xaaaa",
        title: "Cybernetic Horizon",
        imageUrl: "http://example.com/image.png",
        portfolioUrl: "http://localhost:3000/demo/portfolio",
        basePrice: 10n * 10n ** 18n,
        terms: "CC-BY",
        watchUrls: [],
        createdAt: 0,
      },
    ],
    isLoading: false,
  }),
  useClaims: () => ({ data: chain.claims, isLoading: false }),
  useEarnings: () => ({ data: chain.earnings, isLoading: false }),
}));

vi.mock("@/lib/genlayer/client", () => ({
  getContractAddress: () => "0x00000000000000000000000000000000000000c0",
}));

const notice: Claim = {
  id: 37,
  workId: 1,
  pageUrl: "https://example.com/demo/shop",
  imageUrl: "https://example.com/found.jpg",
  filedBy: "0xagent",
  verdict: "COPY_UNLICENSED",
  usage: "ADS_MERCH",
  prominence: "PRIMARY",
  reasoning: "Same artwork on a product listing.",
  walletOnPage: "0xbbbb",
  fee: 45n * 10n ** 18n,
  status: "NOTICE_ISSUED",
  disputeProofUrl: "",
  createdAt: 0,
};

import JudgesPage from "../app/judges/page";

beforeEach(() => {
  state.role = "creator";
  state.accessCode = "judge-code";
  state.setRole.mockClear();
  state.unlock.mockReset();
  chain.claims = [];
  chain.earnings = 0n;
});

afterEach(() => cleanup());

/** The step whose heading matches, so an assertion cannot accidentally match the sidebar or a sibling step. */
function step(title: string) {
  const heading = screen.getByRole("heading", { level: 3, name: title });
  const item = heading.closest("li");
  if (!item) throw new Error(`No step found for "${title}"`);
  return within(item);
}

describe("the judge walkthrough, before unlocking", () => {
  beforeEach(() => {
    state.accessCode = null;
  });

  it("asks for the code and offers no roles yet", async () => {
    state.unlock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<JudgesPage />);

    expect(screen.queryByTestId("scan-now")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Judge access code")).toHaveAttribute("type", "password");

    await user.type(screen.getByLabelText("Judge access code"), " judge-code ");
    await user.click(screen.getByRole("button", { name: "Unlock and start" }));

    expect(state.unlock).toHaveBeenCalledWith("judge-code");
  });

  it("explains the two wallets it is about to hand over", () => {
    render(<JudgesPage />);
    expect(screen.getByText(/In real use nobody switches/)).toBeInTheDocument();
  });
});

describe("the judge walkthrough, running", () => {
  it("puts the real scan control in the first step instead of telling you where to find it", () => {
    render(<JudgesPage />);

    expect(screen.getByTestId("scan-now")).toHaveTextContent("Scan work 1");
    // The old page sent people off to /works/1 to do this themselves.
    expect(screen.queryByRole("link", { name: /Cybernetic Horizon/ })).not.toBeInTheDocument();
  });

  it("marks the scan done and shows the verdicts the contract recorded", () => {
    chain.claims = [notice];
    render(<JudgesPage />);

    expect(screen.queryByTestId("scan-now")).not.toBeInTheDocument();

    const verdicts = step("Read the verdicts");
    expect(verdicts.getByText("Unlicensed copy")).toBeInTheDocument();
    expect(verdicts.getByRole("link", { name: "#37" })).toHaveAttribute("href", "/notices/37");
    expect(verdicts.getByText("45 GEN")).toBeInTheDocument();
  });

  it("asks the creator to switch wallets rather than failing the payment", async () => {
    chain.claims = [notice];
    state.role = "creator";
    const user = userEvent.setup();
    render(<JudgesPage />);

    expect(screen.queryByTestId("write-pay_license")).not.toBeInTheDocument();

    const pay = step("Pay the licence");
    expect(pay.getByText(/You are acting as the demo creator/i)).toBeInTheDocument();
    await user.click(pay.getByRole("button", { name: /Act as Demo site owner/i }));
    expect(state.setRole).toHaveBeenCalledWith("site-owner");
  });

  it("offers the payment once the site owner is the one acting", () => {
    chain.claims = [notice];
    state.role = "site-owner";
    render(<JudgesPage />);

    expect(screen.getByTestId("write-pay_license")).toHaveTextContent("Pay 45 GEN and get a licence");
    expect(screen.getByTestId("dispute-form")).toBeInTheDocument();
  });

  it("offers the withdrawal only after a licence is paid, with the real balance", () => {
    chain.claims = [{ ...notice, status: "PAID" }];
    chain.earnings = 43_650n * 10n ** 15n;
    state.role = "creator";
    render(<JudgesPage />);

    expect(screen.getByTestId("write-withdraw_earnings")).toHaveTextContent("Withdraw 43.65 GEN");
  });

  it("keeps the contract address to hand", () => {
    render(<JudgesPage />);
    const link = screen.getByRole("link", { name: "0x00000000000000000000000000000000000000c0" });
    expect(link).toHaveAttribute("href", expect.stringContaining("/address/0x000000"));
  });

  it("walks five steps, each reporting whose turn it is", () => {
    render(<JudgesPage />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Scan for copies",
      "Read the verdicts",
      "Pay the licence",
      "Withdraw the earnings",
      "Optional: dispute a notice",
    ]);
  });
});

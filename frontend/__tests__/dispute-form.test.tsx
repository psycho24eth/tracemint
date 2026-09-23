import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DisputeForm } from "@/components/DisputeForm";
import type { Claim } from "@/lib/contracts/LicenseHunter";

vi.mock("@/components/WriteAction", () => ({
  WriteAction: ({ method, args, label, onBeforeSubmit }: any) => {
    const handleClick = () => {
      if (onBeforeSubmit) onBeforeSubmit();
    };
    return (
      <button data-testid={`write-action-${method}`} onClick={handleClick} data-method={method} data-args={JSON.stringify(args)}>
        {label}
      </button>
    );
  },
}));

// DisputeForm reads who is acting so it can hide a dispute the contract would refuse.
vi.mock("@/lib/demo/DemoModeProvider", () => ({ useDemoMode: () => ({ role: null, setRole: () => {} }) }));
vi.mock("@/lib/genlayer/wallet", () => ({
  useWallet: () => ({ address: null, provider: null, isOnCorrectNetwork: true, openModal: vi.fn(), switchNetwork: vi.fn() }),
}));

describe("DisputeForm", () => {
  beforeEach(() => cleanup());

  const claim: Claim = {
    id: 7,
    workId: 1,
    pageUrl: "https://example.com/page",
    imageUrl: "https://example.com/found.jpg",
    filedBy: "0xFiler",
    verdict: "COPY_UNLICENSED",
    usage: "ADS_MERCH",
    prominence: "PRIMARY",
    reasoning: "The images appear identical.",
    walletOnPage: "0xSiteOwner",
    fee: 45n * 10n ** 18n,
    status: "NOTICE_ISSUED",
    disputeProofUrl: "",
    createdAt: 2000,
  };

  it("shows error for http URL", () => {
    render(<DisputeForm claim={claim} />);

    const input = screen.getByLabelText("Proof URL");
    fireEvent.change(input, { target: { value: "http://site.example/demo/permission" } });

    const button = screen.getByTestId("write-action-dispute");
    fireEvent.click(button);

    expect(screen.getByText("The proof URL must start with https:// and contain no spaces.")).toBeInTheDocument();
  });

  it("passes valid HTTPS URL to WriteAction", () => {
    const { rerender } = render(<DisputeForm claim={claim} />);

    const input = screen.getByLabelText("Proof URL");
    fireEvent.change(input, { target: { value: "https://site.example/demo/permission" } });

    const button = screen.getByTestId("write-action-dispute");
    expect(button).toHaveAttribute("data-args", JSON.stringify([7, "https://site.example/demo/permission"]));
  });

  it("shows one-dispute hint", () => {
    render(<DisputeForm claim={claim} />);

    expect(screen.getByText("Only the wallet shown on the page can dispute, and each notice can be disputed once.")).toBeInTheDocument();
  });
});

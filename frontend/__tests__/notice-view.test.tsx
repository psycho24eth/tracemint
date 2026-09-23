import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NoticeView } from "@/components/NoticeView";
import type { Claim, Work, License } from "@/lib/contracts/LicenseHunter";

vi.mock("@/components/WriteAction", () => ({
  WriteAction: ({ method, args, value, label, onBeforeSubmit }: any) => {
    const handleClick = () => {
      if (onBeforeSubmit) onBeforeSubmit();
    };
    return (
      <button data-testid={`write-action-${method}`} onClick={handleClick} data-method={method} data-args={JSON.stringify(args)} data-value={value ? value.toString() : undefined}>
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

describe("NoticeView", () => {
  beforeEach(() => cleanup());

  const work: Work = {
    id: 1,
    creator: "0xCreator",
    title: "Test Work",
    imageUrl: "https://example.com/work.jpg",
    portfolioUrl: "https://example.com/portfolio",
    basePrice: 10n * 10n ** 18n,
    terms: "All rights reserved",
    watchUrls: [],
    createdAt: 1000,
  };

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

  const license: License = {
    id: 3,
    claimId: 7,
    workId: 1,
    licensee: "0xSiteOwner",
    pageUrl: "https://example.com/page",
    amount: 45n * 10n ** 18n,
    creatorAmount: 43650n * 10n ** 15n,
    issuedAt: 3000,
    expiresAt: 4000,
  };

  it("shows the fee breakdown with correct calculations", () => {
    render(<NoticeView claim={claim} work={work} license={null} />);

    expect(screen.getByText("10 GEN")).toBeInTheDocument();
    expect(screen.getByText("× 3")).toBeInTheDocument();
    expect(screen.getByText("× 1.5")).toBeInTheDocument();
    expect(screen.getByText("45 GEN")).toBeInTheDocument();
    expect(screen.getByText((content, element) => content.includes("43.65 GEN"))).toBeInTheDocument();
    expect(screen.getByText((content, element) => content.includes("1.35 GEN"))).toBeInTheDocument();
  });

  it("renders pay action with correct props for NOTICE_ISSUED", () => {
    render(<NoticeView claim={claim} work={work} license={null} />);

    const payButton = screen.getByTestId("write-action-pay_license");
    expect(payButton).toHaveAttribute("data-method", "pay_license");
    expect(payButton).toHaveAttribute("data-args", JSON.stringify([7]));
    expect(payButton).toHaveAttribute("data-value", (45n * 10n ** 18n).toString());
  });

  it("shows dispute form for NOTICE_ISSUED status", () => {
    render(<NoticeView claim={claim} work={work} license={null} />);

    expect(screen.getByText("Link a page that shows the creator's permission, such as a licence or an email.")).toBeInTheDocument();
  });

  it("links to license page when PAID with license", () => {
    const paidClaim = { ...claim, status: "PAID" as const };
    render(<NoticeView claim={paidClaim} work={work} license={license} />);

    const licenseLink = screen.getByRole("link", { name: "View license" });
    expect(licenseLink).toHaveAttribute("href", "/licenses/3");
  });

  it("shows no pay action when status is PAID", () => {
    const paidClaim = { ...claim, status: "PAID" as const };
    render(<NoticeView claim={paidClaim} work={work} license={license} />);

    expect(screen.queryByTestId("write-action-pay_license")).not.toBeInTheDocument();
  });

  it("shows no notice message for NO_NOTICE status", () => {
    const noNoticeClaim = { ...claim, status: "NO_NOTICE" as const, verdict: "COPY_LICENSED" as const, fee: 0n };
    render(<NoticeView claim={noNoticeClaim} work={work} license={null} />);

    expect(screen.getByText(/Validators decided this copy is licensed or a different work/)).toBeInTheDocument();
  });

  it("includes 'Not legal advice' message in all cases", () => {
    render(<NoticeView claim={claim} work={work} license={null} />);
    expect(screen.queryAllByText("Not legal advice.")).toHaveLength(1);
  });
});

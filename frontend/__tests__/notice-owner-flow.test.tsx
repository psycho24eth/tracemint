import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NoticeView } from "@/components/NoticeView";
import type { Claim, Work } from "@/lib/contracts/LicenseHunter";

vi.mock("@/components/WriteAction", () => ({
  WriteAction: ({ method, label }: { method: string; label: string }) => (
    <button data-testid={`write-action-${method}`}>{label}</button>
  ),
}));

vi.mock("@/lib/demo/DemoModeProvider", () => ({ useDemoMode: () => ({ role: null, setRole: () => {} }) }));

// Who is looking at the notice decides whether they are offered the creator's sending tools.
let connected: string | null = null;
vi.mock("@/lib/genlayer/wallet", () => ({
  useWallet: () => ({
    address: connected,
    provider: null,
    isOnCorrectNetwork: true,
    openModal: vi.fn(),
    switchNetwork: vi.fn(),
  }),
}));

const CREATOR = "0x1051000000000000000000000000000000001543";

const work: Work = {
  id: 1,
  creator: CREATOR,
  title: "Neon Garden",
  imageUrl: "https://example.com/work.jpg",
  portfolioUrl: "https://example.com/portfolio",
  basePrice: 10n * 10n ** 18n,
  terms: "Editorial use with credit is fine. Commercial use needs a licence.",
  watchUrls: [],
  createdAt: 1000,
};

const claim: Claim = {
  id: 7,
  workId: 1,
  pageUrl: "https://shop.example.com/posters/neon",
  imageUrl: "https://shop.example.com/found.jpg",
  filedBy: "0xAgent",
  verdict: "COPY_UNLICENSED",
  usage: "COMMERCIAL",
  prominence: "PRIMARY",
  reasoning: "The images are the same composition at a different crop.",
  walletOnPage: "",
  fee: 30n * 10n ** 18n,
  status: "NOTICE_ISSUED",
  disputeProofUrl: "",
  createdAt: 2000,
};

describe("a notice as a site owner sees it", () => {
  beforeEach(() => {
    cleanup();
    connected = null;
  });

  it("leads with what is on offer rather than the accusation", () => {
    render(<NoticeView claim={claim} work={work} license={null} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("A licence for this image");
    // The verdict is still stated, just not as the headline.
    expect(screen.getByText("Unlicensed copy")).toBeInTheDocument();
  });

  it("explains itself to someone who has never heard of TraceMint", () => {
    render(<NoticeView claim={claim} work={work} license={null} />);

    const brief = within(screen.getByRole("region", { name: /read this first/i }));
    expect(brief.getByText(/independent GenLayer validators/i)).toBeInTheDocument();
    expect(brief.getByText(/Disputing is free/i)).toBeInTheDocument();
  });

  it("answers what happens if the notice is ignored", async () => {
    const user = userEvent.setup();
    render(<NoticeView claim={claim} work={work} license={null} />);

    const disclosure = screen.getByRole("button", { name: /ignore this/i });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/reported to a credit agency/i)).not.toBeInTheDocument();

    await user.click(disclosure);

    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/reported to a credit agency/i)).toBeInTheDocument();
    expect(screen.getByText(/no such\s+mechanism/i)).toBeInTheDocument();
  });

  it("drops the brief once the notice is settled", () => {
    render(<NoticeView claim={{ ...claim, status: "PAID" }} work={work} license={null} />);

    expect(screen.queryByRole("region", { name: /read this first/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Licensed");
  });

  it("offers the sending tools to the creator only", () => {
    render(<NoticeView claim={claim} work={work} license={null} />);
    expect(screen.queryByRole("region", { name: "Send this notice" })).not.toBeInTheDocument();

    cleanup();
    connected = CREATOR.toUpperCase().replace("0X", "0x");
    render(<NoticeView claim={claim} work={work} license={null} />);

    const send = within(screen.getByRole("region", { name: "Send this notice" }));
    expect(send.getByText(/Nothing is sent automatically/i)).toBeInTheDocument();
    expect(send.getByText(/\/notices\/7$/)).toBeInTheDocument();
  });

  it("writes the creator a message that offers a licence instead of threatening one", () => {
    connected = CREATOR;
    render(<NoticeView claim={claim} work={work} license={null} />);

    const send = within(screen.getByRole("region", { name: "Send this notice" }));
    const message = send.getByText(/I'm the creator of "Neon Garden"/);
    expect(message).toHaveTextContent("shop.example.com/posters/neon");
    expect(message).toHaveTextContent("30 GEN");
    expect(message).toHaveTextContent(/license my work rather than send takedowns/);
  });
});

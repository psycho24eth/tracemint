import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ClaimsTable from "@/components/ClaimsTable";
import type { Claim } from "@/lib/contracts/LicenseHunter";

describe("ClaimsTable", () => {
  it("renders a claim with verdict, fee, status, and date", () => {
    const claims: Claim[] = [
      {
        id: 7,
        workId: 1,
        pageUrl: "https://example.com/page",
        imageUrl: "https://example.com/image.png",
        filedBy: "0x456def",
        verdict: "COPY_UNLICENSED",
        usage: "COMMERCIAL",
        prominence: "PRIMARY",
        reasoning: "Match found",
        walletOnPage: "0xabc123",
        fee: 45n * 10n ** 18n,
        status: "NOTICE_ISSUED",
        disputeProofUrl: "",
        createdAt: 1694966400,
      },
    ];

    render(<ClaimsTable claims={claims} />);

    expect(screen.getByText("Unlicensed copy")).toBeInTheDocument();
    expect(screen.getByText("45 GEN")).toBeInTheDocument();
    expect(screen.getByText("Notice issued")).toBeInTheDocument();
    expect(screen.getByText("2023-09-17 16:00 UTC")).toBeInTheDocument();

    const openLink = screen.getByText("Open");
    expect(openLink).toHaveAttribute("href", "/notices/7");
  });

  it("renders empty state when no claims", () => {
    render(<ClaimsTable claims={[]} />);
    expect(screen.getByText(/No claims yet. Run a scan to look for copies/)).toBeInTheDocument();
  });
});

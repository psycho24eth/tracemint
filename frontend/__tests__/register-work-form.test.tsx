import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import RegisterWorkForm, { validateWork } from "@/components/RegisterWorkForm";
import * as WriteActionModule from "@/components/WriteAction";

vi.mock("@/components/WriteAction");
vi.mock("@/lib/demo/DemoModeProvider", () => ({
  useActingAddress: () => "0x123abc...",
}));

describe("RegisterWorkForm", () => {
  it("validates work with correct args", () => {
    const error = validateWork({
      title: "Cybernetic Horizon",
      imageUrl: "https://site.example/demo/cybernetic-horizon.png",
      portfolioUrl: "https://site.example/demo/portfolio",
      basePriceText: "10",
      terms: "Non-exclusive web license, 12 months",
      watchUrlsText: "https://site.example/demo/shop",
    });
    expect(error).toBe(null);
  });

  it("shows error for http:// image URL", () => {
    const error = validateWork({
      title: "Test",
      imageUrl: "http://site.example/demo/image.png",
      portfolioUrl: "https://site.example/demo/portfolio",
      basePriceText: "10",
      terms: "Terms",
      watchUrlsText: "",
    });
    expect(error).toContain("https://");
  });

  it("shows error for invalid base price", () => {
    const error = validateWork({
      title: "Test",
      imageUrl: "https://site.example/image.png",
      portfolioUrl: "https://site.example/demo/portfolio",
      basePriceText: "abc",
      terms: "Terms",
      watchUrlsText: "",
    });
    expect(error).toContain("Enter an amount");
  });

  it("shows error for more than 10 watched URLs", () => {
    let urls = "";
    for (let i = 0; i < 11; i++) {
      urls += `https://site.example/${i}\n`;
    }
    const error = validateWork({
      title: "Test",
      imageUrl: "https://site.example/image.png",
      portfolioUrl: "https://site.example/demo/portfolio",
      basePriceText: "10",
      terms: "Terms",
      watchUrlsText: urls,
    });
    expect(error).toContain("At most 10");
  });

  it("displays acting address in hint", () => {
    vi.mocked(WriteActionModule.WriteAction).mockReturnValue(<button>Submit</button>);
    render(<RegisterWorkForm />);
    expect(screen.getByText(/Put this address on your portfolio page/)).toBeInTheDocument();
    expect(screen.getByText("0x123abc...")).toBeInTheDocument();
  });
});

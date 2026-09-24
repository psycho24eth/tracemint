import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import RegisterWorkForm, { validateWork } from "@/components/RegisterWorkForm";
import * as WriteActionModule from "@/components/WriteAction";

vi.mock("@/components/WriteAction");
vi.mock("@/lib/demo/DemoModeProvider", () => ({
  useActingAddress: () => "0x123abc...",
}));

// Auto-cleanup is off in this project, so renders would otherwise stack and every query find two.
afterEach(() => cleanup());

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

  it("says where the address has to go, and why", () => {
    vi.mocked(WriteActionModule.WriteAction).mockReturnValue(<button>Submit</button>);
    render(<RegisterWorkForm />);
    expect(screen.getByText(/Put this address in the visible text of your portfolio page/)).toBeInTheDocument();
    expect(screen.getByText("0x123abc...")).toBeInTheDocument();
    // The commonest mistake is pointing this at a page you cannot edit, such as a stock-photo listing.
    expect(screen.getByText(/a page you can edit/)).toBeInTheDocument();
  });

  it("says what the terms are for, since the label alone does not give it away", () => {
    vi.mocked(WriteActionModule.WriteAction).mockReturnValue(<button>Submit</button>);
    render(<RegisterWorkForm />);
    // The terms string is the only thing that separates COPY_LICENSED from COPY_UNLICENSED, so the
    // credit wording is what decides whether a page owner pays. That is worth spelling out.
    expect(screen.getByText(/credit line you want/)).toBeInTheDocument();
    expect(screen.getByText(/treated as licensed and pays nothing/)).toBeInTheDocument();
  });

  it("admits there is no web-wide search, and that the watchlist can wait", () => {
    vi.mocked(WriteActionModule.WriteAction).mockReturnValue(<button>Submit</button>);
    render(<RegisterWorkForm />);
    expect(screen.getByText(/no web-wide search/)).toBeInTheDocument();
    expect(screen.getByText(/leave this empty and add pages later/)).toBeInTheDocument();
  });

  it("explains the base price as a range, not a single number", () => {
    vi.mocked(WriteActionModule.WriteAction).mockReturnValue(<button>Submit</button>);
    render(<RegisterWorkForm />);
    // compute_fee multiplies by usage and prominence, so the list price is a floor of a quarter and
    // a ceiling of 4.5 times. Someone new has no way to know that from "Base price (GEN)".
    expect(screen.getByText(/a quarter of it for small personal use, up to 4.5× for an advert/)).toBeInTheDocument();
  });

  it("offers a way out for someone who does not know what happens next", () => {
    vi.mocked(WriteActionModule.WriteAction).mockReturnValue(<button>Submit</button>);
    render(<RegisterWorkForm />);
    expect(screen.getByRole("link", { name: /See what happens after you register/ })).toHaveAttribute(
      "href",
      "/how-it-works",
    );
  });
});

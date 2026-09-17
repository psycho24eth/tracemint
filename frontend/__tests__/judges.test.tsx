import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  role: null as null | "creator" | "site-owner",
  setRole: vi.fn(),
}));

vi.mock("@/components/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/demo/DemoModeProvider", () => {
  return {
    useDemoMode: () => ({
      role: state.role,
      setRole: state.setRole,
    }),
  };
});

vi.mock("@/lib/demo/roles", async () => {
  const actual = await vi.importActual("@/lib/demo/roles");
  return {
    ...actual,
    demoAddress: (role: string) => (role === "creator" ? "0xaaaa" : "0xbbbb"),
  };
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
        basePrice: 10n * (10n ** 18n),
        terms: "CC-BY",
        watchUrls: [],
        createdAt: 0,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/lib/genlayer/client", () => ({
  getContractAddress: () => "0x00000000000000000000000000000000000000c0",
}));

vi.mock("@/lib/format", () => ({
  addressLink: (addr: string) => `https://explorer.example.com/address/${addr}`,
  siteUrl: (path: string) => `http://localhost:3000${path}`,
  ...vi.importActual("@/lib/format"),
}));

import JudgesPage from "../app/judges/page";

beforeEach(() => {
  state.role = null;
  state.setRole.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("Judges guide", () => {
  it("displays the ordered list with six steps", () => {
    render(<JudgesPage />);
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(6);
  });

  it("shows the contract address and explorer link", () => {
    render(<JudgesPage />);
    expect(screen.getByText("0x00000000000000000000000000000000000000c0")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "0x00000000000000000000000000000000000000c0" });
    expect(link).toHaveAttribute("href", expect.stringContaining("explorer.example.com"));
  });

  it("calls setRole when Act as demo site owner is clicked", async () => {
    const user = userEvent.setup();
    render(<JudgesPage />);
    const buttons = screen.getAllByRole("button");
    const siteOwnerButton = buttons.find((btn) => btn.textContent?.includes("site owner"));
    expect(siteOwnerButton).toBeDefined();
    if (siteOwnerButton) {
      await user.click(siteOwnerButton);
      expect(state.setRole).toHaveBeenCalledWith("site-owner");
    }
  });

  it("links to the demo work at /works/1", () => {
    render(<JudgesPage />);
    const workLink = screen.getByRole("link", { name: /Cybernetic Horizon/ });
    expect(workLink).toHaveAttribute("href", "/works/1");
  });
});

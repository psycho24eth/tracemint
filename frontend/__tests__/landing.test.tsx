import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// vitest.config.ts does not set `test.globals`, so Testing Library's automatic
// afterEach cleanup never registers itself; without this, the second test's
// render() would leave the first test's DOM in place and every query below
// would match twice.
afterEach(() => {
  cleanup();
});

vi.mock("@/components/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// jsdom has no WebGL: replace the three.js backdrop with a static placeholder.
vi.mock("@/components/hero/HeroVisual", () => ({
  HeroVisual: () => <div data-testid="hero-visual-stub" />,
}));

// The live sections read the contract through React Query; this test covers the static copy.
vi.mock("@/components/landing/HeroStage", () => ({ HeroStage: () => <div data-testid="hero-stage-stub" /> }));
vi.mock("@/components/landing/LiveStats", () => ({ LiveStats: () => null }));
vi.mock("@/components/landing/LiveTicker", () => ({ LiveTicker: () => null }));
vi.mock("@/components/landing/CollectionPreview", () => ({ CollectionPreview: () => null }));

import LandingPage from "../app/page";

describe("landing page", () => {
  it("states the pitch with the corrected claims", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Trace. Judge. Mint." })).toBeInTheDocument();
    expect(screen.getByText(/Turn IP infringement into instant licensing/)).toBeInTheDocument();
    expect(screen.getByText(/checks the sites you watch every 30 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/on-chain, time-stamped notice with a pay link/)).toBeInTheDocument();
    expect(screen.getByText(/Creators keep 97% of every license/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Try the demo/ })).toHaveAttribute("href", "/judges");
    expect(screen.getByTestId("hero-stage-stub")).toBeInTheDocument();
  });

  it("renders all 4 how-it-works steps", () => {
    render(<LandingPage />);

    for (const title of ["Scan", "Notice", "License", "Withdraw"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });
});

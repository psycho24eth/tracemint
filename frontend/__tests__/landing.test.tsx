import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/PageShell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import LandingPage from "../app/page";

describe("landing page", () => {
  it("states the pitch with the corrected claims", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Turn IP infringement into instant licensing" })).toBeInTheDocument();
    expect(screen.getByText(/checks the sites you watch every 30 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/on-chain, time-stamped notice with a pay link/)).toBeInTheDocument();
    expect(screen.getByText(/Creators keep 97% of every license/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Try the demo/ })).toHaveAttribute("href", "/judges");
  });
});

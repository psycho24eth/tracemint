import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/genlayer/wallet", () => ({
  useWallet: () => ({ address: "0x000000000000000000000000000000000000a11e" }),
}));

import { DemoRoleSwitcher } from "../components/DemoRoleSwitcher";
import { DemoModeProvider, useActingAddress } from "../lib/demo/DemoModeProvider";

const CREATOR = "0xA11ce00000000000000000000000000000000001";
const SITE_OWNER = "0xb0b0000000000000000000000000000000000002";

function ActingAddress() {
  return <output>{useActingAddress() ?? "none"}</output>;
}

function renderSwitcher() {
  return render(
    <DemoModeProvider>
      <DemoRoleSwitcher />
      <ActingAddress />
    </DemoModeProvider>,
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DEMO_CREATOR_ADDRESS", CREATOR);
  vi.stubEnv("NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS", SITE_OWNER);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("demo mode", () => {
  it("acts as the connected wallet until a demo role is chosen", () => {
    renderSwitcher();

    expect(screen.getByRole("radio", { name: "Wallet" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent("0x000000000000000000000000000000000000a11e");
  });

  it("switches to a demo role and remembers it", () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole("radio", { name: "Site owner" }));

    expect(screen.getByRole("radio", { name: "Site owner" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent(SITE_OWNER);
    expect(window.localStorage.getItem("licensehunter.demoRole")).toBe("site-owner");
  });

  it("restores the saved role", async () => {
    window.localStorage.setItem("licensehunter.demoRole", "creator");

    renderSwitcher();

    expect(await screen.findByText(CREATOR)).toBeInTheDocument();
  });
});

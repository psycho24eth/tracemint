import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/genlayer/wallet", () => ({
  useWallet: () => ({ address: "0x000000000000000000000000000000000000a11e" }),
}));

import { JudgeModeBar } from "../components/JudgeModeBar";
import { DemoModeProvider, useActingAddress, useDemoMode } from "../lib/demo/DemoModeProvider";

const CREATOR = "0xA11ce00000000000000000000000000000000001";
const SITE_OWNER = "0xb0b0000000000000000000000000000000000002";
const fetchMock = vi.fn();

function Probe() {
  const { unlock } = useDemoMode();
  return (
    <>
      <output>{useActingAddress() ?? "none"}</output>
      <button type="button" onClick={() => unlock("judge-code").catch(() => {})}>
        unlock
      </button>
    </>
  );
}

function renderDemoMode() {
  return render(
    <DemoModeProvider>
      <JudgeModeBar />
      <Probe />
    </DemoModeProvider>,
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DEMO_CREATOR_ADDRESS", CREATOR);
  vi.stubEnv("NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS", SITE_OWNER);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("judge mode", () => {
  it("acts as the connected wallet and hides the judge bar until unlocked", () => {
    renderDemoMode();

    expect(screen.queryByRole("radiogroup", { name: "Act as" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0x000000000000000000000000000000000000a11e");
  });

  it("unlocks with a valid code, starts as the demo creator, and switches roles", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    renderDemoMode();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "unlock" })));

    expect(fetchMock).toHaveBeenCalledWith("/api/demo/access", expect.objectContaining({ method: "POST" }));
    expect(screen.getByRole("radio", { name: "Demo creator" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent(CREATOR);

    fireEvent.click(screen.getByRole("radio", { name: "Demo site owner" }));
    expect(screen.getByRole("status")).toHaveTextContent(SITE_OWNER);
    expect(window.localStorage.getItem("tracemint.judgeAccess")).toBe("judge-code");
    expect(window.localStorage.getItem("licensehunter.demoRole")).toBe("site-owner");
  });

  it("stays locked when the code is rejected", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "That access code is not valid." }, { status: 401 }));
    renderDemoMode();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "unlock" })));

    expect(screen.queryByRole("radiogroup", { name: "Act as" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem("tracemint.judgeAccess")).toBeNull();
  });

  it("restores judge mode from storage and exits back to the wallet", async () => {
    window.localStorage.setItem("tracemint.judgeAccess", "judge-code");
    window.localStorage.setItem("licensehunter.demoRole", "site-owner");
    renderDemoMode();

    expect(await screen.findByRole("radio", { name: "Demo site owner" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("button", { name: "Exit demo mode" }));
    expect(screen.queryByRole("radiogroup", { name: "Act as" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0x000000000000000000000000000000000000a11e");
    expect(window.localStorage.getItem("tracemint.judgeAccess")).toBeNull();
  });

  it("ignores a saved role without an access code", () => {
    window.localStorage.setItem("licensehunter.demoRole", "creator");
    renderDemoMode();

    expect(screen.getByRole("status")).toHaveTextContent("0x000000000000000000000000000000000000a11e");
  });
});

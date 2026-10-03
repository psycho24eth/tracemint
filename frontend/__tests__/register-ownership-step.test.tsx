import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RegisterWorkForm from "@/components/RegisterWorkForm";
import type { Check } from "@/lib/preflight";

const ADDRESS = "0x10516B67e54C3c252493b55d10Db1c779684C543";
const PAGE = "https://artist.example/about";

const acting = vi.hoisted(() => ({ address: null as string | null }));
vi.mock("@/lib/demo/DemoModeProvider", () => ({
  useActingAddress: () => acting.address,
  useDemoMode: () => ({ role: null, setRole: () => {} }),
}));

const registry = vi.hoisted(() => ({
  works: [] as { id: number; title: string; creator: string; portfolioUrl: string }[],
}));
vi.mock("@/lib/hooks/useLicenseHunter", () => ({
  useWorks: () => ({ data: registry.works, isLoading: false }),
}));

// The gate is part of what is tested here, so the write button reports whether it was disabled and why.
vi.mock("@/components/WriteAction", () => ({
  WriteAction: ({ label, unavailable }: { label: string; unavailable?: string | null }) => (
    <button data-testid="register" disabled={Boolean(unavailable)} title={unavailable ?? ""}>
      {label}
    </button>
  ),
}));

const FOUND: Check = {
  name: "Ownership proof",
  verdict: "pass",
  detail: "Your wallet address is in the text of this page, so the contract's ownership check will pass.",
};
const MISSING: Check = {
  name: "Ownership proof",
  verdict: "fail",
  detail: "Your wallet address does not appear anywhere in the text of this page.",
  fix: "It has to be visible text on a page you can edit.",
};
const BUSY = "busy" as const;

/** Answers each look at the ownership page in turn, repeating the last answer, and records every request. */
function server(...answers: (Check | typeof BUSY)[]) {
  const asked: Record<string, unknown>[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      asked.push(JSON.parse(String(init?.body)));
      const answer = answers[Math.min(asked.length - 1, answers.length - 1)];
      return answer === BUSY
        ? ({ ok: false, status: 429, json: async () => ({ error: "That is a lot of checks in a minute." }) } as unknown as Response)
        : ({ ok: true, status: 200, json: async () => ({ checks: [answer] }) } as unknown as Response);
    }),
  );
  return asked;
}

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

/** A paste: the whole link arrives in one change, the way it does from the clipboard. */
function pasteLink(url: string) {
  fireEvent.change(screen.getByLabelText("Ownership page"), { target: { value: url } });
}

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  acting.address = ADDRESS;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  registry.works = [];
  delete (document as unknown as Record<string, unknown>).visibilityState;
});


describe("step 1: proving the art is theirs", () => {
  it("asks for the proof before anything about the artwork, with the line to paste already there", () => {
    render(<RegisterWorkForm />);

    const ownership = screen.getByLabelText("Ownership page");
    expect(ownership.compareDocumentPosition(screen.getByLabelText("Title")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(`TraceMint wallet: ${ADDRESS}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy your line/ })).toBeInTheDocument();
  });

  it("asks them to connect first when there is no address to put on a page", () => {
    acting.address = null;
    render(<RegisterWorkForm />);

    expect(screen.getByText(/Connect a wallet, or start demo mode, to get your line/)).toBeInTheDocument();
    expect(screen.queryByText(/TraceMint wallet: 0x/)).not.toBeInTheDocument();
    // The steps still read 1, 2, 3, so the missing line reads as the first thing to sort out.
    expect(screen.getByText("1. Copy your line")).toBeInTheDocument();
  });

  it("looks at the page by itself once a link is pasted, asking about that page alone", async () => {
    const asked = server(FOUND);
    render(<RegisterWorkForm />);

    pasteLink(PAGE);
    await wait(1_000);

    expect(asked).toEqual([{ address: ADDRESS, portfolioUrl: PAGE }]);
    expect(screen.getByText(/Found your line on artist\.example\/about/)).toBeInTheDocument();
  });

  it("keeps looking every 10 seconds while they add the line", async () => {
    const asked = server(MISSING, MISSING, FOUND);
    render(<RegisterWorkForm />);

    pasteLink(PAGE);
    await wait(1_000);
    expect(screen.getByText(/Not on artist\.example\/about yet/)).toBeInTheDocument();

    await wait(10_000);
    expect(asked).toHaveLength(2);
    await wait(10_000);
    expect(asked).toHaveLength(3);
    expect(screen.getByText(/Found your line/)).toBeInTheDocument();
  });

  it("stops after ten minutes, then looks again when asked", async () => {
    const asked = server(MISSING);
    render(<RegisterWorkForm />);

    pasteLink(PAGE);
    await wait(1_000);
    await wait(10 * 60_000);
    expect(screen.getByText(/Stopped looking/)).toBeInTheDocument();

    const looks = asked.length;
    await wait(60_000);
    expect(asked).toHaveLength(looks);

    fireEvent.click(screen.getByRole("button", { name: "Check now" }));
    await wait(1_000);
    expect(asked).toHaveLength(looks + 1);
  });

  it("keeps going when TraceMint is busy, instead of giving up", async () => {
    const asked = server(BUSY, FOUND);
    render(<RegisterWorkForm />);

    pasteLink(PAGE);
    await wait(1_000);
    await wait(10_000);

    expect(asked).toHaveLength(2);
    expect(screen.getByText(/Found your line/)).toBeInTheDocument();
  });

  it("holds Register until the line is found", async () => {
    server(MISSING, FOUND);
    render(<RegisterWorkForm />);

    pasteLink(PAGE);
    await wait(1_000);
    expect(screen.getByTestId("register")).toBeDisabled();
    expect(screen.getByTestId("register")).toHaveAttribute("title", expect.stringContaining("step 1"));

    await wait(10_000);
    expect(screen.getByTestId("register")).toBeEnabled();
  });

  it("starts over when the link changes, so an old answer cannot open Register", async () => {
    const asked = server(FOUND, MISSING);
    render(<RegisterWorkForm />);

    pasteLink(PAGE);
    await wait(1_000);
    expect(screen.getByText(/Found your line/)).toBeInTheDocument();

    pasteLink("https://artist.example/contact");
    expect(screen.queryByText(/Found your line/)).not.toBeInTheDocument();
    expect(screen.getByTestId("register")).toBeDisabled();

    await wait(1_000);
    expect(asked.at(-1)).toEqual({ address: ADDRESS, portfolioUrl: "https://artist.example/contact" });
  });

  it("fills in the page from their newest work and checks it straight away", async () => {
    registry.works = [
      { id: 2, title: "Koi Current", creator: ADDRESS, portfolioUrl: "https://artist.example/old" },
      { id: 5, title: "Glass Tide", creator: ADDRESS.toLowerCase(), portfolioUrl: PAGE },
      { id: 6, title: "Not theirs", creator: "0x000000000000000000000000000000000000dEaD", portfolioUrl: "https://elsewhere.example/" },
    ];
    const asked = server(FOUND);
    render(<RegisterWorkForm />);

    expect(screen.getByLabelText("Ownership page")).toHaveValue(PAGE);
    await wait(1_000);
    expect(asked).toEqual([{ address: ADDRESS, portfolioUrl: PAGE }]);
    expect(screen.getByTestId("register")).toBeEnabled();
  });

  it("does not look while the tab is hidden, and looks again as soon as it is back", async () => {
    const asked = server(MISSING, FOUND);
    render(<RegisterWorkForm />);

    pasteLink(PAGE);
    await wait(1_000);
    setVisibility("hidden");
    await wait(30_000);
    expect(asked).toHaveLength(1);

    setVisibility("visible");
    await wait(0);
    expect(asked).toHaveLength(2);
    expect(screen.getByText(/Found your line/)).toBeInTheDocument();
  });

  it("keeps the ways out on screen while the line is missing", async () => {
    server(MISSING);
    render(<RegisterWorkForm />);

    pasteLink(PAGE);
    await wait(1_000);

    expect(screen.getByRole("link", { name: "public gist" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /demo creator/ })).toHaveAttribute("href", "/judges");
    // A page that builds its text with JavaScript can show the line to a browser and not to this check.
    fireEvent.click(screen.getByRole("button", { name: /Register anyway/ }));
    expect(screen.getByTestId("register")).toBeEnabled();
  });
});

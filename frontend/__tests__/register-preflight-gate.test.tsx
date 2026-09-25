import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RegisterWorkForm from "@/components/RegisterWorkForm";
import type { PreflightResult } from "@/lib/preflight";

const ADDRESS = "0x10516B67e54C3c252493b55d10Db1c779684C543";

vi.mock("@/lib/demo/DemoModeProvider", () => ({
  useActingAddress: () => ADDRESS,
  useDemoMode: () => ({ role: null, setRole: () => {} }),
}));

vi.mock("@/lib/hooks/useLicenseHunter", () => ({
  // The form resolves the id of the work it just created from this list.
  useWorks: () => ({ data: [], isLoading: false }),
}));

// The gate is the point of this suite, so the write button reports whether it was disabled and why.
vi.mock("@/components/WriteAction", () => ({
  WriteAction: ({ label, unavailable }: { label: string; unavailable?: string | null }) => (
    <button data-testid="register" disabled={Boolean(unavailable)} title={unavailable ?? ""}>
      {label}
    </button>
  ),
}));

const answer = (checks: PreflightResult["checks"]) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => ({ checks }) } as unknown as Response);

const PASSES: PreflightResult["checks"] = [
  { name: "Ownership proof", verdict: "pass", detail: "Your wallet address is in the text of this page." },
  { name: "Image URL", verdict: "pass", detail: "Serves an image (image/jpeg)." },
];

const OWNERSHIP_FAILS: PreflightResult["checks"] = [
  {
    name: "Ownership proof",
    verdict: "fail",
    detail: "Your wallet address does not appear anywhere in the text of this page.",
    fix: "Paste the address into text a visitor can actually see.",
  },
  { name: "Image URL", verdict: "warn", detail: "This serves text/html, so it looks like a web page." },
];

async function fillUrls(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Image URL"), "https://example.com/art.jpg");
  await user.type(screen.getByLabelText("Portfolio URL"), "https://example.com/about");
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => cleanup());

describe("checking a registration before it costs anything", () => {
  it("cannot run until there is a wallet and both URLs", async () => {
    render(<RegisterWorkForm />);
    expect(screen.getByRole("button", { name: /Run the check/ })).toBeDisabled();
    expect(screen.getByText("Fill in both URLs first.")).toBeInTheDocument();
  });

  it("reports a pass for each check and leaves registration open", async () => {
    vi.stubGlobal("fetch", answer(PASSES));
    const user = userEvent.setup();
    render(<RegisterWorkForm />);
    await fillUrls(user);

    await user.click(screen.getByRole("button", { name: /Run the check/ }));

    await waitFor(() => expect(screen.getByText("Ready to register")).toBeInTheDocument());
    expect(screen.getAllByText("Pass")).toHaveLength(2);
    expect(screen.getByTestId("register")).toBeEnabled();
  });

  it("blocks registration when the ownership check would fail, and says why", async () => {
    vi.stubGlobal("fetch", answer(OWNERSHIP_FAILS));
    const user = userEvent.setup();
    render(<RegisterWorkForm />);
    await fillUrls(user);

    await user.click(screen.getByRole("button", { name: /Run the check/ }));

    await waitFor(() => expect(screen.getByText("Would be rejected")).toBeInTheDocument());
    expect(screen.getByText("Fail")).toBeInTheDocument();
    expect(screen.getByText(/does not appear anywhere in the text/)).toBeInTheDocument();

    const register = screen.getByTestId("register");
    expect(register).toBeDisabled();
    expect(register).toHaveAttribute("title", expect.stringContaining("charges a fee before refusing"));
  });

  it("a warning alone does not block, because the contract would still accept it", async () => {
    vi.stubGlobal(
      "fetch",
      answer([
        { name: "Ownership proof", verdict: "pass", detail: "Found." },
        { name: "Image URL", verdict: "warn", detail: "This serves text/html." },
      ]),
    );
    const user = userEvent.setup();
    render(<RegisterWorkForm />);
    await fillUrls(user);

    await user.click(screen.getByRole("button", { name: /Run the check/ }));

    await waitFor(() => expect(screen.getByText("Ready to register")).toBeInTheDocument());
    expect(screen.getByText("Check this")).toBeInTheDocument();
    expect(screen.getByTestId("register")).toBeEnabled();
  });

  it("lets someone past a failure they know is wrong, for a page rendered by JavaScript", async () => {
    vi.stubGlobal("fetch", answer(OWNERSHIP_FAILS));
    const user = userEvent.setup();
    render(<RegisterWorkForm />);
    await fillUrls(user);

    await user.click(screen.getByRole("button", { name: /Run the check/ }));
    await waitFor(() => expect(screen.getByTestId("register")).toBeDisabled());

    await user.click(screen.getByRole("button", { name: /Register anyway/ }));
    expect(screen.getByTestId("register")).toBeEnabled();
  });

  it("closes the gate again when a URL is edited, so the answer cannot go stale", async () => {
    vi.stubGlobal("fetch", answer(PASSES));
    const user = userEvent.setup();
    render(<RegisterWorkForm />);
    await fillUrls(user);

    await user.click(screen.getByRole("button", { name: /Run the check/ }));
    await waitFor(() => expect(screen.getByText("Ready to register")).toBeInTheDocument());

    await user.type(screen.getByLabelText("Portfolio URL"), "/changed");

    expect(screen.queryByText("Ready to register")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run the check/ })).toBeInTheDocument();
  });
});

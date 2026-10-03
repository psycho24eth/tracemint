import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RegisterWorkForm from "@/components/RegisterWorkForm";
import type { Check } from "@/lib/preflight";

const ADDRESS = "0x10516B67e54C3c252493b55d10Db1c779684C543";
const PAGE = "https://artist.example/about";
const IMAGE = "https://artist.example/crane.png";

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

const OWNERSHIP_FOUND: Check = {
  name: "Ownership proof",
  verdict: "pass",
  detail: "Your wallet address is in the text of this page, so the contract's ownership check will pass.",
};
const IMAGE_PASSES: Check = { name: "Image URL", verdict: "pass", detail: "Serves an image (image/png)." };
const IMAGE_FAILS: Check = {
  name: "Image URL",
  verdict: "fail",
  detail: "The image URL answered 404, so validators will not be able to load it.",
  fix: "Use a link that opens the image directly in a browser with nothing signed in.",
};
const IMAGE_WARNS: Check = { name: "Image URL", verdict: "warn", detail: "This serves text/html." };

/** Step 1 always finds the line here, so every test is about the image alone. Records each request. */
function server(image: Check) {
  const asked: Record<string, unknown>[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      asked.push(body);
      const checks = body.portfolioUrl ? [OWNERSHIP_FOUND] : [image];
      return { ok: true, status: 200, json: async () => ({ checks }) } as unknown as Response;
    }),
  );
  return asked;
}

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

async function fillIn() {
  fireEvent.change(screen.getByLabelText("Ownership page"), { target: { value: PAGE } });
  fireEvent.change(screen.getByLabelText("Image URL"), { target: { value: IMAGE } });
  await wait(1_000);
}

async function runCheck() {
  fireEvent.click(screen.getByRole("button", { name: /Run the check/ }));
  await wait(0);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("checking the image before registering", () => {
  it("cannot run until there is an image URL", () => {
    render(<RegisterWorkForm />);

    expect(screen.getByRole("button", { name: /Run the check/ })).toBeDisabled();
    expect(screen.getByText("Fill in the image URL first.")).toBeInTheDocument();
  });

  it("checks the image alone, since step 1 has already checked the ownership page", async () => {
    const asked = server(IMAGE_PASSES);
    render(<RegisterWorkForm />);
    await fillIn();

    await runCheck();

    expect(asked.at(-1)).toEqual({ imageUrl: IMAGE });
  });

  it("leaves registration open when the image passes", async () => {
    server(IMAGE_PASSES);
    render(<RegisterWorkForm />);
    await fillIn();

    await runCheck();

    expect(screen.getByText("Image ready")).toBeInTheDocument();
    expect(screen.getByTestId("register")).toBeEnabled();
  });

  it("blocks registration when validators could not load the image, and says why", async () => {
    server(IMAGE_FAILS);
    render(<RegisterWorkForm />);
    await fillIn();

    await runCheck();

    expect(screen.getByText("Image would fail")).toBeInTheDocument();
    expect(screen.getByText(/answered 404/)).toBeInTheDocument();
    const register = screen.getByTestId("register");
    expect(register).toBeDisabled();
    expect(register).toHaveAttribute("title", expect.stringContaining("validators could not load"));
    // The way past a page built by JavaScript has nothing to do with an image that does not load.
    expect(screen.queryByRole("button", { name: /Register anyway/ })).not.toBeInTheDocument();
  });

  it("a warning alone does not block, because the contract would still accept it", async () => {
    server(IMAGE_WARNS);
    render(<RegisterWorkForm />);
    await fillIn();

    await runCheck();

    expect(screen.getByText("Check this")).toBeInTheDocument();
    expect(screen.getByTestId("register")).toBeEnabled();
  });

  it("forgets the answer when the image URL is edited, so it cannot go stale", async () => {
    server(IMAGE_PASSES);
    render(<RegisterWorkForm />);
    await fillIn();
    await runCheck();
    expect(screen.getByText("Image ready")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Image URL"), { target: { value: `${IMAGE}?v=2` } });

    expect(screen.queryByText("Image ready")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run the check/ })).toBeInTheDocument();
  });
});

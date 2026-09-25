import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pathname: "/", modalOpen: false, push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@/lib/genlayer/wallet", () => ({ useWallet: () => ({ modal: { open: state.modalOpen } }) }));

import { TourProvider, useTour } from "../components/tour/GuidedTour";

function StartButton() {
  const tour = useTour();
  return (
    <button type="button" onClick={tour.start}>
      Guide
    </button>
  );
}

/** The home page as the tour sees it: only the named targets are on screen. */
function renderTour(targets: string[]) {
  return render(
    <TourProvider>
      {targets.map((target) => (
        <a key={target} href="#" data-tour={target}>
          {target}
        </a>
      ))}
      <StartButton />
    </TourProvider>,
  );
}

const card = () => screen.queryByRole("dialog");

beforeEach(() => {
  state.pathname = "/";
  state.modalOpen = false;
  state.push.mockClear();
  window.localStorage.clear();
  // jsdom has no layout: give tour targets a box, and stub the browser APIs the overlay measures with.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return this.dataset.tour ? new DOMRect(100, 120, 140, 40) : new DOMRect(0, 0, 0, 0);
  });
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("guided tour", () => {
  it("offers itself on a first visit to the home page and remembers a skip", () => {
    vi.useFakeTimers();
    renderTour(["nav-works"]);
    expect(card()).toBeNull();

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("dialog", { name: "Welcome to TraceMint" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));
    expect(card()).toBeNull();
    expect(window.localStorage.getItem("tracemint.tour")).toBe("seen");
  });

  it("doesn't start on its own once seen, or away from the home page", () => {
    vi.useFakeTimers();
    window.localStorage.setItem("tracemint.tour", "seen");
    renderTour(["nav-works"]);
    act(() => vi.advanceTimersByTime(5000));
    expect(card()).toBeNull();

    cleanup();
    window.localStorage.clear();
    state.pathname = "/works";
    renderTour(["nav-works"]);
    act(() => vi.advanceTimersByTime(5000));
    expect(card()).toBeNull();
  });

  it("walks the stops that are on screen, with Back, Next, and the arrow keys", () => {
    renderTour(["nav-works", "guide"]);
    fireEvent.click(screen.getByRole("button", { name: "Guide" }));

    expect(screen.getByRole("dialog", { name: "Welcome to TraceMint" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show me around" }));
    expect(screen.getByRole("dialog", { name: "Register your art" })).toBeInTheDocument();
    expect(screen.getByText("01 / 02 · Works")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "Come back anytime" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous step" }));
    expect(screen.getByRole("dialog", { name: "Register your art" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    // The last stop hands the visitor on to the walkthrough rather than offering to replay itself.
    expect(screen.getByRole("link", { name: /Show me one, start to finish/ })).toHaveAttribute("href", "/start");

    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));
    expect(card()).toBeNull();
    expect(window.localStorage.getItem("tracemint.tour")).toBe("seen");
  });

  it("closes on Escape", () => {
    renderTour(["nav-works"]);
    fireEvent.click(screen.getByRole("button", { name: "Guide" }));

    fireEvent.keyDown(window, { key: "Escape" });

    expect(card()).toBeNull();
  });

  it("steps aside while the wallet menu is open, then comes back instead of ending", () => {
    const tree = () => (
      <TourProvider>
        <a href="#" data-tour="nav-works">
          nav-works
        </a>
        <StartButton />
      </TourProvider>
    );
    const view = renderTour(["nav-works", "wallet"]);
    fireEvent.click(screen.getByRole("button", { name: "Guide" }));
    expect(card()).not.toBeNull();

    state.modalOpen = true;
    view.rerender(tree());
    expect(card()).toBeNull();

    // The whole point: connecting a wallet used to destroy the only guidance on the site, at the moment
    // a newcomer most needs telling what happens next. It must return, and must not count as finished.
    state.modalOpen = false;
    view.rerender(tree());
    expect(card()).not.toBeNull();
    expect(window.localStorage.getItem("tracemint.tour")).toBeNull();
  });

  it("goes to the home page first when started elsewhere", () => {
    state.pathname = "/notices";
    renderTour(["nav-works"]);

    fireEvent.click(screen.getByRole("button", { name: "Guide" }));

    expect(state.push).toHaveBeenCalledWith("/");
  });
});

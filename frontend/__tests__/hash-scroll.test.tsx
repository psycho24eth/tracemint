import { cleanup, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHashScroll } from "@/lib/hooks/useHashScroll";

/** A page shaped like /works: an anchor sitting below a list that arrives later. */
function Page({ items }: { items: number }) {
  useHashScroll();
  return (
    <>
      <ul>
        {Array.from({ length: items }, (_, index) => (
          <li key={index}>item {index}</li>
        ))}
      </ul>
      <div id="register">Register a work</div>
    </>
  );
}

const scrollIntoView = vi.fn();

/** jsdom has no ResizeObserver, so the page-grew signal is delivered by hand. */
const observers: Array<() => void> = [];

beforeEach(() => {
  scrollIntoView.mockClear();
  observers.length = 0;
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private readonly callback: () => void) {}
      observe() {
        observers.push(this.callback);
      }
      disconnect() {
        const at = observers.indexOf(this.callback);
        if (at !== -1) observers.splice(at, 1);
      }
    },
  );
  window.location.hash = "";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** What the browser does when the list lands and the page gets taller. */
const pageGrew = () => act(() => observers.forEach((notify) => notify()));

describe("arriving at a #hash on a page that loads its content", () => {
  it("re-aligns when the content lands and pushes the anchor down", () => {
    window.location.hash = "#register";
    render(<Page items={0} />);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    // Instant, not smooth: the page sets scroll-behavior: smooth, and a glide would race the growth.
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "instant" });

    pageGrew();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("leaves the page alone when the URL names nothing", () => {
    render(<Page items={7} />);
    pageGrew();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("leaves the page alone when the hash names something that is not there", () => {
    window.location.hash = "#nowhere";
    render(<Page items={7} />);
    pageGrew();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("stops the moment the visitor scrolls for themselves", () => {
    window.location.hash = "#register";
    render(<Page items={0} />);
    scrollIntoView.mockClear();

    window.dispatchEvent(new Event("wheel"));
    pageGrew();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("gives up after a few seconds rather than owning the scroll forever", () => {
    vi.useFakeTimers();
    window.location.hash = "#register";
    render(<Page items={0} />);
    scrollIntoView.mockClear();

    act(() => vi.advanceTimersByTime(9_000));
    pageGrew();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("stops watching the page once it is gone", () => {
    window.location.hash = "#register";
    const view = render(<Page items={0} />);
    expect(observers).toHaveLength(1);

    view.unmount();

    expect(observers).toHaveLength(0);
  });
});

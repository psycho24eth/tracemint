import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHashScroll } from "@/lib/hooks/useHashScroll";

/** A page shaped like /works: an anchor sitting below a list that arrives later. */
function Page({ ready }: { ready: boolean }) {
  useHashScroll(ready);
  return (
    <>
      <div>{ready ? "the list" : "loading"}</div>
      <div id="register">Register a work</div>
    </>
  );
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  window.location.hash = "";
});

afterEach(() => cleanup());

describe("arriving at a #hash on a page that loads its content", () => {
  it("waits for the content instead of jumping while the anchor is still moving", () => {
    window.location.hash = "#register";
    const { rerender } = render(<Page ready={false} />);

    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(<Page ready={true} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("leaves the page alone when the URL names nothing", () => {
    render(<Page ready={true} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("leaves the page alone when the hash names something that is not there", () => {
    window.location.hash = "#nowhere";
    render(<Page ready={true} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("does not yank somebody who has already started scrolling", () => {
    window.location.hash = "#register";
    const { rerender } = render(<Page ready={false} />);

    window.dispatchEvent(new Event("wheel"));
    rerender(<Page ready={true} />);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls once, not on every later render", () => {
    window.location.hash = "#register";
    const { rerender } = render(<Page ready={false} />);

    rerender(<Page ready={true} />);
    rerender(<Page ready={false} />);
    rerender(<Page ready={true} />);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

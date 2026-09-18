import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { coverPattern, LicenseCover } from "@/components/cards/LicenseCover";

afterEach(() => {
  cleanup();
});

describe("LicenseCover", () => {
  it("draws the same cover for the same license, so server and browser agree", () => {
    const first = render(<LicenseCover seed="1:1:0xa417" />).container.innerHTML;
    const second = render(<LicenseCover seed="1:1:0xa417" />).container.innerHTML;

    expect(first).toBe(second);
  });

  it("gives different licenses different covers", () => {
    const covers = new Set(
      Array.from({ length: 8 }, (_, index) => render(<LicenseCover seed={`${index + 1}:${index + 7}:0xa417`} />).container.innerHTML),
    );
    const patterns = new Set(Array.from({ length: 16 }, (_, index) => coverPattern(`${index + 1}:${index + 7}:0xa417`)));

    expect(covers.size).toBe(8);
    expect(patterns.size).toBeGreaterThan(1);
  });
});

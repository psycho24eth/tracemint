// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createKeyedRateLimiter } from "@/lib/server/rate-limit";

describe("a rate limit per visitor", () => {
  it("gives each visitor a budget of their own", () => {
    const tryAcquire = createKeyedRateLimiter(2, 60_000, () => 0);

    expect(tryAcquire("203.0.113.1")).toBe(true);
    expect(tryAcquire("203.0.113.1")).toBe(true);
    expect(tryAcquire("203.0.113.1")).toBe(false);
    // One visitor using up their checks must not lock out the next person.
    expect(tryAcquire("203.0.113.2")).toBe(true);
  });

  it("gives a visitor their budget back once the window has passed", () => {
    let time = 0;
    const tryAcquire = createKeyedRateLimiter(1, 60_000, () => time);

    expect(tryAcquire("203.0.113.1")).toBe(true);
    time = 59_999;
    expect(tryAcquire("203.0.113.1")).toBe(false);
    time = 60_000;
    expect(tryAcquire("203.0.113.1")).toBe(true);
  });

  it("counts only the calls still inside the window", () => {
    let time = 0;
    const tryAcquire = createKeyedRateLimiter(2, 60_000, () => time);

    expect(tryAcquire("203.0.113.1")).toBe(true);
    time = 30_000;
    expect(tryAcquire("203.0.113.1")).toBe(true);
    // The first call has left the window and the second has not, so exactly one more fits.
    time = 60_000;
    expect(tryAcquire("203.0.113.1")).toBe(true);
    expect(tryAcquire("203.0.113.1")).toBe(false);
  });
});

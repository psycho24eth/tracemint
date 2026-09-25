import { describe, expect, it } from "vitest";

import {
  balanceCheck,
  demoModeCheck,
  formatGen,
  GEN,
  MIN_BALANCE,
  scanCheck,
  worstLevel,
} from "../../deploy/demoHealth";

const NOW = new Date("2026-09-25T18:00:00Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

describe("wallet balances", () => {
  it("treats an empty wallet as broken, not as a warning", () => {
    const check = balanceCheck("Demo creator wallet", 0n);
    expect(check.level).toBe("fail");
    expect(check.detail).toMatch(/npm run accounts/);
  });

  it("warns on the way down, while there is still time to top it up", () => {
    expect(balanceCheck("Agent wallet", MIN_BALANCE - 1n).level).toBe("warn");
  });

  it("passes a funded wallet and says how much is in it", () => {
    const check = balanceCheck("Demo creator wallet", 1_044n * GEN);
    expect(check.level).toBe("pass");
    expect(check.detail).toBe("1,044.00 GEN");
  });

  it("agrees with the floor that npm run accounts tops up to", () => {
    expect(MIN_BALANCE).toBe(100n * GEN);
    expect(balanceCheck("Agent wallet", MIN_BALANCE).level).toBe("pass");
  });
});

describe("formatting", () => {
  it("groups thousands and keeps two decimals", () => {
    expect(formatGen(1_044_648_700_000_000_000_000n)).toBe("1,044.64 GEN");
    expect(formatGen(0n)).toBe("0.00 GEN");
  });
});

describe("demo mode", () => {
  it("fails when the deployment has it switched off", () => {
    const check = demoModeCheck({ status: 503 }, NOW.getTime());
    expect(check.level).toBe("fail");
    expect(check.detail).toMatch(/DEMO_ACCESS_CODE/);
  });

  it("does not claim anything either way when rate limited", () => {
    expect(demoModeCheck({ status: 429 }, NOW.getTime()).level).toBe("warn");
  });

  it("passes when a code is issued, and reports only how long it lasts", () => {
    const check = demoModeCheck({ status: 200, expiresAt: NOW.getTime() + 24 * 3_600_000 }, NOW.getTime());
    expect(check.level).toBe("pass");
    expect(check.detail).toBe("Issuing codes, each good for 24 hours.");
  });

  it("never repeats the code itself, which is a live credential", () => {
    const check = demoModeCheck({ status: 200, expiresAt: NOW.getTime() + 3_600_000 }, NOW.getTime());
    expect(JSON.stringify(check)).not.toMatch(/tracemint-|code:/i);
  });

  it("fails an already-expired code rather than reporting negative hours", () => {
    expect(demoModeCheck({ status: 200, expiresAt: NOW.getTime() - 1 }, NOW.getTime()).level).toBe("fail");
  });
});

describe("the scheduled scan", () => {
  it("fails when the last run did not succeed", () => {
    const check = scanCheck({ conclusion: "failure", status: "completed", createdAt: hoursAgo(0.3) }, NOW);
    expect(check.level).toBe("fail");
    expect(check.detail).toMatch(/"failure"/);
  });

  it("passes a recent success", () => {
    expect(scanCheck({ conclusion: "success", status: "completed", createdAt: hoursAgo(0.4) }, NOW).level).toBe("pass");
  });

  it("does not call a run in progress a failure", () => {
    const check = scanCheck({ conclusion: null, status: "in_progress", createdAt: hoursAgo(0.05) }, NOW);
    expect(check.level).toBe("pass");
  });

  it("tolerates the gaps GitHub actually leaves, rather than the gap the cron asks for", () => {
    // Measured gaps between real scheduled runs ran from 2.2h to 5.7h, all of them successful.
    expect(scanCheck({ conclusion: "success", status: "completed", createdAt: hoursAgo(5.7) }, NOW).level).toBe("pass");
  });

  it("warns once a gap is longer than dropped turns explain", () => {
    expect(scanCheck({ conclusion: "success", status: "completed", createdAt: hoursAgo(9) }, NOW).level).toBe("warn");
  });

  it("fails after a day, because GitHub disables schedules on quiet repositories", () => {
    const check = scanCheck({ conclusion: "success", status: "completed", createdAt: hoursAgo(30) }, NOW);
    expect(check.level).toBe("fail");
    expect(check.detail).toMatch(/still enabled/);
  });

  it("fails when the workflow has never run", () => {
    expect(scanCheck(null, NOW).level).toBe("fail");
  });
});

describe("the overall verdict", () => {
  it("reports the worst news, not the average", () => {
    expect(worstLevel([{ name: "a", level: "pass", detail: "" }, { name: "b", level: "fail", detail: "" }])).toBe("fail");
    expect(worstLevel([{ name: "a", level: "pass", detail: "" }, { name: "b", level: "warn", detail: "" }])).toBe("warn");
    expect(worstLevel([{ name: "a", level: "pass", detail: "" }])).toBe("pass");
  });

  it("passes an empty set rather than inventing a problem", () => {
    expect(worstLevel([])).toBe("pass");
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkAccessCode, newDemoCode } from "../lib/server/demo-access";
import { checkDemoCode, DEMO_CODE_TTL_HOURS, issueDemoCode } from "../lib/server/demo-codes";

const SECRET = "judge-code";
const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 8, 19, 12, 30);

describe("demo codes", () => {
  it("issues a different, well-formed code every time", () => {
    const codes = new Set(Array.from({ length: 50 }, () => issueDemoCode(SECRET, NOW).code));

    expect(codes.size).toBe(50);
    for (const code of codes) expect(code).toMatch(/^DEMO-[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
  });

  it("accepts a fresh code, retyped in lower case with look-alike letters", () => {
    const { code, expiresAt } = issueDemoCode(SECRET, NOW);
    const retyped = code.toLowerCase().replace(/0/g, "o").replace(/1/g, "l");

    expect(checkDemoCode(code, SECRET, NOW)).toBe("valid");
    expect(checkDemoCode(retyped, SECRET, NOW)).toBe("valid");
    expect(expiresAt).toBeGreaterThan(NOW);
  });

  it("expires a code after a day and rejects one signed with another secret", () => {
    const { code } = issueDemoCode(SECRET, NOW);

    expect(checkDemoCode(code, SECRET, NOW + (DEMO_CODE_TTL_HOURS - 1) * HOUR)).toBe("valid");
    expect(checkDemoCode(code, SECRET, NOW + (DEMO_CODE_TTL_HOURS + 1) * HOUR)).toBe("expired");
    expect(checkDemoCode(code, "another-secret", NOW)).toBe("invalid");
  });

  it("rejects a code with any character changed", () => {
    const { code } = issueDemoCode(SECRET, NOW);
    const last = code.at(-1) === "A" ? "B" : "A";

    expect(checkDemoCode(`${code.slice(0, -1)}${last}`, SECRET, NOW)).toBe("invalid");
    expect(checkDemoCode("DEMO-0000-0000-0000-0000", SECRET, NOW)).toBe("invalid");
    expect(checkDemoCode("not a code", SECRET, NOW)).toBe("invalid");
  });
});

describe("checkAccessCode", () => {
  beforeEach(() => vi.stubEnv("DEMO_ACCESS_CODE", SECRET));
  afterEach(() => vi.unstubAllEnvs());

  it("accepts the judge code and generated demo codes", () => {
    const issued = newDemoCode();

    expect(checkAccessCode(SECRET)).toBe("valid");
    expect(issued && checkAccessCode(issued.code)).toBe("valid");
    expect(checkAccessCode("guess")).toBe("invalid");
    expect(checkAccessCode(undefined)).toBe("invalid");
  });

  it("issues and accepts nothing when demo mode is switched off", () => {
    const issued = newDemoCode();
    vi.stubEnv("DEMO_ACCESS_CODE", "");

    expect(newDemoCode()).toBeNull();
    expect(checkAccessCode(issued?.code)).toBe("invalid");
  });
});

import { describe, expect, it } from "vitest";

import {
  addressAppears,
  blocking,
  imageCheck,
  MAX_IMAGE_BYTES,
  portfolioCheck,
  visibleText,
  type Check,
} from "@/lib/preflight";

const ADDRESS = "0x10516B67e54C3c252493b55d10Db1c779684C543";

describe("reading a page the way the contract reads it", () => {
  it("keeps the text a visitor would see", () => {
    const html = `<h1>Ada Studio</h1><p>Contact: ${ADDRESS}</p>`;
    expect(visibleText(html)).toBe(`Ada Studio Contact: ${ADDRESS}`);
  });

  it("drops script and style bodies, which a browser never paints", () => {
    const html = `<style>.a{content:"${ADDRESS}"}</style><script>var a="${ADDRESS}";</script><p>Hello</p>`;
    const text = visibleText(html);
    expect(text).toBe("Hello");
    expect(addressAppears(text, ADDRESS)).toBe(false);
  });

  it("does not count an address hidden in an attribute or a comment", () => {
    expect(addressAppears(visibleText(`<div data-wallet="${ADDRESS}">art</div>`), ADDRESS)).toBe(false);
    expect(addressAppears(visibleText(`<!-- ${ADDRESS} --><p>art</p>`), ADDRESS)).toBe(false);
  });

  it("matches regardless of case, like the contract's lowercased compare", () => {
    expect(addressAppears(`wallet ${ADDRESS.toLowerCase()} here`, ADDRESS)).toBe(true);
    expect(addressAppears(`wallet ${ADDRESS.toUpperCase()} here`, ADDRESS)).toBe(true);
  });

  it("unescapes entities so an escaped address still counts", () => {
    expect(addressAppears(visibleText(`<p>&#48;x10516B67e54C3c252493b55d10Db1c779684C543</p>`), ADDRESS)).toBe(true);
  });
});

describe("the ownership check", () => {
  it("passes when the address is in the text", () => {
    const check = portfolioCheck({ text: `Ada Studio. Wallet ${ADDRESS}.`, address: ADDRESS, truncated: false });
    expect(check.verdict).toBe("pass");
  });

  it("fails, and says what to do, when it is not", () => {
    const check = portfolioCheck({ text: "A pile of rusted metal rings", address: ADDRESS, truncated: false });
    expect(check.verdict).toBe("fail");
    expect(check.detail).toMatch(/does not appear/i);
    expect(check.fix).toMatch(/page you can edit/i);
  });

  it("says so when the page was longer than the contract reads", () => {
    const check = portfolioCheck({ text: "x".repeat(10), address: ADDRESS, truncated: true });
    expect(check.verdict).toBe("fail");
    expect(check.detail).toMatch(/first 50,000 characters/);
  });

  it("only looks as far into the page as the contract does", () => {
    const padded = `${"x".repeat(50_000)} ${ADDRESS}`;
    expect(portfolioCheck({ text: padded, address: ADDRESS, truncated: false }).verdict).toBe("fail");
  });
});

describe("the image check", () => {
  it("passes a real image", () => {
    const check = imageCheck({ status: 200, contentType: "image/jpeg", bytes: 120_000, truncated: false });
    expect(check.verdict).toBe("pass");
    expect(check.detail).toContain("image/jpeg");
  });

  it("warns rather than blocks on a web page, because the contract screenshots it anyway", () => {
    const check = imageCheck({ status: 200, contentType: "text/html; charset=utf-8", bytes: 40_000, truncated: false });
    expect(check.verdict).toBe("warn");
    expect(check.detail).toMatch(/web page rather than an image file/i);
    expect(blocking([check])).toHaveLength(0);
  });

  it("fails an unreachable image", () => {
    expect(imageCheck({ status: 404, contentType: "", bytes: 0, truncated: false }).verdict).toBe("fail");
  });

  it("fails an empty body, which the contract rejects outright", () => {
    const check = imageCheck({ status: 200, contentType: "image/png", bytes: 0, truncated: false });
    expect(check.verdict).toBe("fail");
    expect(check.detail).toMatch(/empty/i);
  });

  it("fails a file over the contract's size ceiling", () => {
    const check = imageCheck({
      status: 200,
      contentType: "image/png",
      bytes: MAX_IMAGE_BYTES + 1,
      truncated: false,
    });
    expect(check.verdict).toBe("fail");
    expect(check.detail).toMatch(/over the 5 MB/);
  });
});

describe("what stops a registration", () => {
  it("counts failures only, so a warning stays the creator's call", () => {
    const checks: Check[] = [
      { name: "Ownership proof", verdict: "pass", detail: "" },
      { name: "Image URL", verdict: "warn", detail: "" },
    ];
    expect(blocking(checks)).toHaveLength(0);

    checks[0] = { name: "Ownership proof", verdict: "fail", detail: "" };
    expect(blocking(checks).map((check) => check.name)).toEqual(["Ownership proof"]);
  });
});

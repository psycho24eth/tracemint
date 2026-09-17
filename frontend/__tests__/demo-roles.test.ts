import { describe, expect, it } from "vitest";

import { DEMO_METHODS, DemoRequestError, encodeArgs, parseDemoWriteRequest, roleForMethod } from "../lib/demo/roles";

const GEN = 10n ** 18n;

function rejection(body: unknown): DemoRequestError {
  try {
    parseDemoWriteRequest(body);
  } catch (error) {
    if (error instanceof DemoRequestError) return error;
    throw error;
  }
  throw new Error("expected the request to be rejected");
}

describe("demo write allowlist", () => {
  it("matches the spec", () => {
    expect(DEMO_METHODS).toEqual({
      creator: ["register_work", "update_watchlist", "file_claim", "withdraw_earnings"],
      "site-owner": ["pay_license", "dispute"],
    });
  });

  it("finds the role allowed to call a method", () => {
    expect(roleForMethod("withdraw_earnings")).toBe("creator");
    expect(roleForMethod("pay_license")).toBe("site-owner");
    expect(roleForMethod("set_agent")).toBeNull();
  });

  it.each([
    ["creator", "pay_license"],
    ["creator", "dispute"],
    ["creator", "withdraw_protocol_fees"],
    ["site-owner", "register_work"],
    ["site-owner", "withdraw_earnings"],
    ["site-owner", "set_agent"],
  ])("refuses the %s role calling %s with 403", (role, method) => {
    expect(rejection({ role, method, args: [] }).status).toBe(403);
  });

  it("rejects an unknown role with 400", () => {
    expect(rejection({ role: "owner", method: "pay_license" }).status).toBe(400);
  });
});

describe("parseDemoWriteRequest", () => {
  it("parses a license payment with its value", () => {
    expect(
      parseDemoWriteRequest({ role: "site-owner", method: "pay_license", args: [7], value: (45n * GEN).toString() }),
    ).toEqual({ role: "site-owner", method: "pay_license", args: [7], value: 45n * GEN });
  });

  it("round-trips bigint and list arguments through JSON", () => {
    const args = [
      "Cybernetic Horizon",
      "https://site.example/demo/cybernetic-horizon.png",
      "https://site.example/demo/portfolio",
      10n * GEN,
      "Web license, 12 months",
      ["https://site.example/demo/shop"],
    ];
    const body = JSON.parse(JSON.stringify({ role: "creator", method: "register_work", args: encodeArgs(args) }));

    expect(parseDemoWriteRequest(body)).toEqual({ role: "creator", method: "register_work", args, value: 0n });
  });

  it.each([
    [{ role: "creator", method: "withdraw_earnings", value: "5" }, "Only pay_license accepts a value"],
    [{ role: "site-owner", method: "pay_license", args: [1], value: "-1" }, "value must be a whole number of wei"],
    [{ role: "creator", method: "file_claim", args: "1" }, "args must be a list of at most 8 values"],
    [{ role: "creator", method: "file_claim", args: [{ nested: true }] }, "Unsupported argument value"],
    [{ role: "creator", method: "file_claim", args: ["x".repeat(2_001)] }, "Unsupported argument value"],
  ])("rejects %j with 400", (body, message) => {
    const error = rejection(body);
    expect(error.status).toBe(400);
    expect(error.message).toBe(message);
  });
});

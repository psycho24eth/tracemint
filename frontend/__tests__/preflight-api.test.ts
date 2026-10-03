// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Check } from "@/lib/preflight";

const ADDRESS = "0x10516B67e54C3c252493b55d10Db1c779684C543";
const PAGE = "https://artist.example/about";
const IMAGE = "https://artist.example/crane.png";

// The real fetch resolves DNS and opens sockets, so it is the one thing replaced here.
const fetchPublicUrl = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/safe-fetch", () => ({ fetchPublicUrl }));

const page = (text: string) => ({
  ok: true,
  status: 200,
  contentType: "text/html; charset=utf-8",
  bytes: text.length + 26,
  body: `<html><body><p>${text}</p></body></html>`,
  truncated: false,
});
const PNG = { ok: true, status: 200, contentType: "image/png", bytes: 74_137, body: "", truncated: false };

/** A fresh module per test, so each starts with an empty rate limit. */
async function route() {
  vi.resetModules();
  return (await import("../app/api/preflight/route")).POST;
}

let visitors = 0;
const ask = (body: unknown, ip = `203.0.113.${++visitors}`) =>
  new Request("http://localhost/api/preflight", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

const verdicts = async (response: Response) =>
  ((await response.json()) as { checks: Check[] }).checks.map((check) => [check.name, check.verdict]);

beforeEach(() => {
  fetchPublicUrl.mockReset();
});

describe("POST /api/preflight", () => {
  it("checks only the ownership page when no image is sent", async () => {
    fetchPublicUrl.mockResolvedValue(page(`TraceMint wallet: ${ADDRESS}`));
    const POST = await route();

    const response = await POST(ask({ address: ADDRESS, portfolioUrl: PAGE }));

    expect(response.status).toBe(200);
    expect(await verdicts(response)).toEqual([["Ownership proof", "pass"]]);
    expect(fetchPublicUrl).toHaveBeenCalledTimes(1);
    expect(fetchPublicUrl).toHaveBeenCalledWith(PAGE, expect.any(Number));
  });

  it("checks only the image when no ownership page is sent", async () => {
    fetchPublicUrl.mockResolvedValue(PNG);
    const POST = await route();

    const response = await POST(ask({ imageUrl: IMAGE }));

    expect(response.status).toBe(200);
    expect(await verdicts(response)).toEqual([["Image URL", "pass"]]);
    expect(fetchPublicUrl).toHaveBeenCalledTimes(1);
    expect(fetchPublicUrl).toHaveBeenCalledWith(IMAGE, expect.any(Number));
  });

  it("still checks both when both are sent", async () => {
    fetchPublicUrl.mockImplementation(async (url: string) => (url === IMAGE ? PNG : page("no address here")));
    const POST = await route();

    const response = await POST(ask({ address: ADDRESS, portfolioUrl: PAGE, imageUrl: IMAGE }));

    expect(await verdicts(response)).toEqual([
      ["Ownership proof", "fail"],
      ["Image URL", "pass"],
    ]);
  });

  it("refuses a request with nothing to check", async () => {
    const POST = await route();

    const response = await POST(ask({ address: ADDRESS }));

    expect(response.status).toBe(400);
    expect(fetchPublicUrl).not.toHaveBeenCalled();
  });

  it("needs the address it is meant to look for on the ownership page", async () => {
    const POST = await route();

    const response = await POST(ask({ portfolioUrl: PAGE }));

    expect(response.status).toBe(400);
    expect(fetchPublicUrl).not.toHaveBeenCalled();
  });

  it("lets one visitor keep checking while they edit their page", async () => {
    fetchPublicUrl.mockResolvedValue(page("not yet"));
    const POST = await route();

    // A minute of the form's own re-checking, every 10 seconds, plus a few presses of Check now.
    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) statuses.push((await POST(ask({ address: ADDRESS, portfolioUrl: PAGE }, "198.51.100.7"))).status);

    expect(statuses).toEqual(Array(10).fill(200));
  });

  it("turns away a visitor who hammers the check, without slowing anyone else", async () => {
    fetchPublicUrl.mockResolvedValue(page("not yet"));
    const POST = await route();

    const statuses: number[] = [];
    for (let i = 0; i < 60; i++) statuses.push((await POST(ask({ address: ADDRESS, portfolioUrl: PAGE }, "198.51.100.7"))).status);

    expect(statuses.at(-1)).toBe(429);
    expect((await POST(ask({ address: ADDRESS, portfolioUrl: PAGE }, "198.51.100.8"))).status).toBe(200);
  });
});

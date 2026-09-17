import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

import DemoBlogPage from "../app/demo/blog/page";
import DemoPermissionPage from "../app/demo/permission/page";
import DemoPortfolioPage from "../app/demo/portfolio/page";
import DemoShopPage from "../app/demo/shop/page";

const CREATOR = "0x10516B67e54C3c252493b55d10Db1c779684C543";
const SITE_OWNER = "0xa417D08dA1B8C07c2CBBa5947b8d10874b45a3F6";

const ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/g;
const ALLOWED_IMAGE_SRCS = ["/demo/cybernetic-horizon.png", "/demo/synth-hoodie-banner.jpg"];

function addressesIn(text: string): string[] {
  return text.match(ADDRESS_PATTERN) ?? [];
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DEMO_CREATOR_ADDRESS", CREATOR);
  vi.stubEnv("NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS", SITE_OWNER);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("demo portfolio page", () => {
  it("shows the creator address as the only 0x-prefixed string", () => {
    const { container } = render(<DemoPortfolioPage />);
    const text = container.textContent ?? "";

    expect(text).toContain(`Wallet: ${CREATOR}`);
    expect(addressesIn(text)).toEqual([CREATOR]);
  });
});

describe("demo shop page", () => {
  it("shows the site owner address as the only 0x-prefixed string, with no licence/permission wording", () => {
    const { container } = render(<DemoShopPage />);
    const text = container.textContent ?? "";

    expect(text).toContain(`Pay us in GEN: ${SITE_OWNER}`);
    expect(addressesIn(text)).toEqual([SITE_OWNER]);
    expect(/licensed|licence|license|permission/i.test(text)).toBe(false);
  });
});

describe("demo blog page", () => {
  it("credits the creator and carries no wallet address", () => {
    const { container } = render(<DemoBlogPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("Licensed from Demo Creator via LicenseHunter");
    expect(addressesIn(text)).toEqual([]);
  });
});

describe("demo permission page", () => {
  it("contains the full permission sentence", () => {
    const { container } = render(<DemoPermissionPage />);
    const text = container.textContent ?? "";

    expect(text).toContain(
      'PERMISSION LETTER: Demo Creator grants Neon Threads permission to use the artwork "Cybernetic Horizon" on its synth hoodie product page for 12 months.',
    );
  });
});

describe("demo page images", () => {
  it("only ever points <img> src at the two generated demo art files", () => {
    const pages = [DemoPortfolioPage, DemoShopPage, DemoBlogPage, DemoPermissionPage];

    for (const Page of pages) {
      const { container, unmount } = render(<Page />);
      const sources = Array.from(container.querySelectorAll("img")).map((img) => img.getAttribute("src"));
      for (const src of sources) {
        expect(ALLOWED_IMAGE_SRCS).toContain(src);
      }
      unmount();
    }
  });
});

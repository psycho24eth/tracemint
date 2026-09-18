import { existsSync } from "node:fs";
import path from "node:path";

import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

import DemoBlogArticlePage from "../app/demo/blog/[slug]/page";
import DemoBlogPage from "../app/demo/blog/page";
import DemoPermissionPage from "../app/demo/permission/page";
import DemoPortfolioPage from "../app/demo/portfolio/page";
import DemoShopProductPage from "../app/demo/shop/[slug]/page";
import DemoShopPage from "../app/demo/shop/page";
import { blogCopies, demoImages, LICENSE_CREDIT, shopCopies } from "../lib/demo/catalog";

const CREATOR = "0x10516B67e54C3c252493b55d10Db1c779684C543";
const SITE_OWNER = "0xa417D08dA1B8C07c2CBBa5947b8d10874b45a3F6";

const ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/g;
const LICENCE_WORDING = /licensed|licence|license|permission/i;

function addressesIn(text: string): string[] {
  return text.match(ADDRESS_PATTERN) ?? [];
}

const shopProduct = (slug: string) => DemoShopProductPage({ params: Promise.resolve({ slug }) });
const blogArticle = (slug: string) => DemoBlogArticlePage({ params: Promise.resolve({ slug }) });

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

  it("shows every work in the collection", () => {
    const { container } = render(<DemoPortfolioPage />);
    const sources = Array.from(container.querySelectorAll("img")).map((img) => img.getAttribute("src"));

    expect(sources).toContain("/demo/cybernetic-horizon.png");
    expect(sources).toContain("/demo/koi-current.png");
    expect(sources).toHaveLength(6);
  });
});

describe("demo shop pages", () => {
  it("shows the site owner address as the only 0x-prefixed string, with no licence/permission wording", () => {
    const { container } = render(<DemoShopPage />);
    const text = container.textContent ?? "";

    expect(text).toContain(`Pay us in GEN: ${SITE_OWNER}`);
    expect(addressesIn(text)).toEqual([SITE_OWNER]);
    expect(LICENCE_WORDING.test(text)).toBe(false);
  });

  it.each(shopCopies().map(({ copy }) => copy.slug))("product %s follows the same rules", async (slug) => {
    const { container } = render(await shopProduct(slug));
    const text = container.textContent ?? "";

    expect(text).toContain(`Pay us in GEN: ${SITE_OWNER}`);
    expect(addressesIn(text)).toEqual([SITE_OWNER]);
    expect(LICENCE_WORDING.test(text)).toBe(false);
  });
});

describe("demo blog pages", () => {
  it("credits the creator and carries no wallet address", () => {
    const { container } = render(<DemoBlogPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("Licensed from Demo Creator via TraceMint");
    expect(addressesIn(text)).toEqual([]);
  });

  it.each(blogCopies().map(({ copy }) => [copy.slug, Boolean(copy.credit)] as const))(
    "article %s carries no wallet address and credits the creator only when licensed (%s)",
    async (slug, credited) => {
      const { container } = render(await blogArticle(slug));
      const text = container.textContent ?? "";

      expect(addressesIn(text)).toEqual([]);
      expect(text.includes(LICENSE_CREDIT)).toBe(credited);
      expect(LICENCE_WORDING.test(text)).toBe(credited);
    },
  );
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
  it("only ever points <img> src at generated demo art that exists on disk", async () => {
    const pages: ReactElement[] = [
      <DemoPortfolioPage key="portfolio" />,
      <DemoShopPage key="shop" />,
      <DemoBlogPage key="blog" />,
      <DemoPermissionPage key="permission" />,
      ...(await Promise.all(shopCopies().map(({ copy }) => shopProduct(copy.slug)))),
      ...(await Promise.all(blogCopies().map(({ copy }) => blogArticle(copy.slug)))),
    ];

    for (const page of pages) {
      const { container, unmount } = render(page);
      const sources = Array.from(container.querySelectorAll("img")).map((img) => img.getAttribute("src"));
      expect(sources.length).toBeGreaterThan(0);
      for (const src of sources) {
        expect(demoImages()).toContain(src);
      }
      unmount();
    }
  });

  it("has every catalog image in the public folder", () => {
    for (const image of demoImages()) {
      // Tests run from the frontend workspace, locally and in CI.
      expect(existsSync(path.join(process.cwd(), "public", image))).toBe(true);
    }
  });
});

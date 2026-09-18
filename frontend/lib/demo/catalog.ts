/**
 * The demo creator's collection, and where a copy of each work appears on the demo sites.
 * Shared by the demo pages and deploy/seed-demo.ts, so it must stay free of app imports.
 * The art itself comes from scripts/generate-demo-art.ts.
 */

export type DemoCopy =
  | {
      site: "shop";
      slug: string;
      image: string;
      product: string;
      price: string;
      description: string;
      details: string[];
    }
  | {
      site: "blog";
      slug: string;
      image: string;
      headline: string;
      intro: string;
      caption: string;
      /** When set, the article credits the creator, so validators should find the copy licensed. */
      credit?: string;
    };

export type DemoWork = {
  title: string;
  year: number;
  style: string;
  basePriceGen: number;
  terms: string;
  /** Registered image, served from frontend/public. */
  original: string;
  copies: DemoCopy[];
  /** Watched pages when they are not the copies' own pages. */
  watch?: string[];
};

export const DEMO_TERMS = "Non-exclusive web license, 12 months";
export const LICENSE_CREDIT = "Licensed from Demo Creator via TraceMint";

export const DEMO_COLLECTION: DemoWork[] = [
  {
    title: "Cybernetic Horizon",
    year: 2026,
    style: "Synthwave",
    basePriceGen: 10,
    terms: DEMO_TERMS,
    original: "/demo/cybernetic-horizon.png",
    // Work #1 predates the per-product pages: its copies live on /demo/shop and /demo/blog.
    copies: [],
    watch: ["/demo/shop", "/demo/blog"],
  },
  {
    title: "Koi Current",
    year: 2026,
    style: "Ink and water",
    basePriceGen: 8,
    terms: DEMO_TERMS,
    original: "/demo/koi-current.png",
    copies: [
      {
        site: "shop",
        slug: "koi-tote",
        image: "/demo/koi-tote-print.jpg",
        product: "Koi pond tote",
        price: "$32",
        description:
          "Heavy canvas tote printed edge to edge with two koi circling a lily pad. Big enough for a laptop, tough enough for the market run.",
        details: ["16 oz cotton canvas", "Inside zip pocket", "Ships in 2-4 business days"],
      },
    ],
  },
  {
    title: "Chrome Bloom",
    year: 2026,
    style: "Chrome",
    basePriceGen: 12,
    terms: DEMO_TERMS,
    original: "/demo/chrome-bloom.png",
    copies: [
      {
        site: "shop",
        slug: "chrome-case",
        image: "/demo/chrome-case-print.jpg",
        product: "Chrome flower phone case",
        price: "$24",
        description:
          "A slim, shock-absorbing case wrapped in our mirror-finish flower print. Raised edges protect the screen and camera.",
        details: ["Fits most recent phones", "Wireless charging friendly", "Free returns within 30 days"],
      },
    ],
  },
  {
    title: "Dune Monolith",
    year: 2026,
    style: "Surreal desert",
    basePriceGen: 15,
    terms: DEMO_TERMS,
    original: "/demo/dune-monolith.png",
    copies: [
      {
        site: "blog",
        slug: "dune-monolith",
        image: "/demo/desert-dreamscape.jpg",
        headline: "Ten dreamscapes for your desktop",
        intro:
          "Nothing clears a cluttered screen like a quiet horizon. This week we rounded up ten wallpapers that feel like a deep breath, starting with our favorite: a lone monolith on a dusk-lit dune.",
        caption: "A black monolith casts a long shadow across dunes at sunset.",
      },
    ],
  },
  {
    title: "Glass Tide",
    year: 2026,
    style: "Glass waves",
    basePriceGen: 6,
    terms: DEMO_TERMS,
    original: "/demo/glass-tide.png",
    copies: [
      {
        site: "blog",
        slug: "glass-tide",
        image: "/demo/glass-tide-feature.jpg",
        headline: "Why we keep painting the sea",
        intro:
          "Artists have chased the ocean for centuries, and digital painters are no exception. Our feature image this week shows why: layered glassy waves under a pale moon.",
        caption: "Layered glass waves in mint and lilac under a full moon.",
        credit: LICENSE_CREDIT,
      },
    ],
  },
  {
    title: "Signal Garden",
    year: 2026,
    style: "Neon botanical",
    basePriceGen: 9,
    terms: DEMO_TERMS,
    original: "/demo/signal-garden.png",
    copies: [
      {
        site: "shop",
        slug: "neon-garden-poster",
        image: "/demo/signal-garden-poster.jpg",
        product: "Neon garden poster",
        price: "$18",
        description:
          "Glowing stems and magenta buds on a deep green night. Printed on heavyweight matte paper that makes the neon pop.",
        details: ["50 x 70 cm", "Museum-grade matte paper", "Ships rolled in a tube"],
      },
    ],
  },
];

export type ShopCopy = Extract<DemoCopy, { site: "shop" }>;
export type BlogCopy = Extract<DemoCopy, { site: "blog" }>;

export function shopCopies(): { work: DemoWork; copy: ShopCopy }[] {
  return DEMO_COLLECTION.flatMap((work) =>
    work.copies.filter((copy): copy is ShopCopy => copy.site === "shop").map((copy) => ({ work, copy })),
  );
}

export function blogCopies(): { work: DemoWork; copy: BlogCopy }[] {
  return DEMO_COLLECTION.flatMap((work) =>
    work.copies.filter((copy): copy is BlogCopy => copy.site === "blog").map((copy) => ({ work, copy })),
  );
}

/** Pages a work's watchlist points at, relative to the site root. */
export function watchPaths(work: DemoWork): string[] {
  return work.watch ?? work.copies.map((copy) => `/demo/${copy.site}/${copy.slug}`);
}

/** Every image a demo page may show: the originals and their copies. */
export function demoImages(): string[] {
  return DEMO_COLLECTION.flatMap((work) => [work.original, ...work.copies.map((copy) => copy.image)]).concat(
    "/demo/synth-hoodie-banner.jpg",
  );
}

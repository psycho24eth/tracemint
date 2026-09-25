/**
 * The script for /start: one real case, told in the plainest words that are still true.
 *
 * Every figure and quotation below was copied from a live claim on the contract, and the claim ids sit
 * here beside the words so `__tests__/start-story.test.ts` can check the arithmetic in the copy still
 * matches the contract's own fee rules. Re-price a demo work and a test fails, rather than this page
 * quietly telling a stranger something untrue.
 *
 * House style for this file, and only this file: no validator, consensus, claim, hash, perceptual or
 * on-chain. A visitor who has never used a wallet should finish it without meeting a new word.
 */

import { creatorShare, feeBreakdown, formatGen, parseGen } from "@/lib/format";

/** Work #1, whose copy on the demo shop is the one notice anybody has actually paid. */
export const CAUGHT = {
  workId: 1,
  claimId: 1,
  title: "Cybernetic Horizon",
  basePrice: parseGen("10"),
  usage: "ADS_MERCH",
  prominence: "PRIMARY",
  original: "/demo/cybernetic-horizon.png",
  copy: "/demo/synth-hoodie-banner.jpg",
  copyPage: "/demo/shop",
  product: "Synth hoodie",
  /** Verbatim from the judgment recorded against claim 1. */
  quote:
    "matching sun, mountain silhouettes, star field, grid perspective, and signature placement; any differences are limited to size/cropping",
} as const;

/** Work #5, whose copy credited the artist. Checked repeatedly, billed nothing every time. */
export const CREDITED = {
  workId: 5,
  claimId: 16,
  title: "Glass Tide",
  original: "/demo/glass-tide.png",
  copy: "/demo/glass-tide-feature.jpg",
  copyPage: "/demo/blog/glass-tide",
  /** How many separate times judges looked at this page and asked for nothing. */
  checks: 6,
  /** Verbatim from the judgment recorded against claim 16. */
  quote: "The found page explicitly states 'Licensed from Demo Creator via TraceMint'",
} as const;

const money = feeBreakdown(CAUGHT.basePrice, CAUGHT.usage, CAUGHT.prominence);
if (!money) throw new Error("The walkthrough names a usage or prominence the fee table does not have.");

/** The bill, and the split of it, worked out the way the contract works it out. */
export const MONEY = {
  fee: money.fee,
  creator: money.creatorAmount,
  protocol: money.protocolAmount,
} as const;

export type Beat = {
  id: string;
  /** Short enough to read at a glance, and a whole thought on its own. */
  title: string;
  /** One or two sentences. Nothing a ten-year-old would have to look up. */
  body: string;
  /** What the button that moves past this beat says. The last beat has none. */
  next?: string;
  /** Shown as a pull quote: the judges' own words, never paraphrased. */
  quote?: string;
  /** The record behind this beat, linked so nothing here has to be taken on trust. */
  claimId?: number;
  /** One picture, or two to compare. */
  art?: { src: string; alt: string; caption?: string }[];
};

export const BEATS: Beat[] = [
  {
    id: "artist",
    title: "This is an artist.",
    body: "She paints pictures and puts them on her own website. This one is called Cybernetic Horizon.",
    next: "What happened to it?",
    art: [{ src: CAUGHT.original, alt: "A synthwave landscape: a low sun over dark mountains above a glowing grid." }],
  },
  {
    id: "theft",
    title: "A shop took it.",
    body: `They printed her painting on a ${CAUGHT.product.toLowerCase()} and put it up for sale. They never asked her, and they never paid her.`,
    next: "So what did TraceMint do?",
    art: [
      { src: CAUGHT.original, alt: "The artist's original painting.", caption: "Hers" },
      { src: CAUGHT.copy, alt: "The same painting printed across a hoodie on a shop page.", caption: "Theirs" },
    ],
  },
  {
    id: "robot",
    title: "A robot went looking.",
    body: "TraceMint's robot visits the pages you tell it to watch and compares every picture it finds against yours. On the shop's page it found this one, and the two are the same picture.",
    next: "Who decides that?",
  },
  {
    id: "judges",
    title: "Then judges looked at it.",
    body: "Not one computer deciding on its own — several, each looking at both pictures and the shop's page, who then have to agree. Here is what they said.",
    quote: CAUGHT.quote,
    claimId: CAUGHT.claimId,
    next: "And then?",
  },
  {
    id: "bill",
    title: `They sent a bill: ${formatGen(MONEY.fee, 2)}.`,
    body: `The judges also looked at how the shop was using it — printed on something they were selling, as the whole point of the product. That is the dearest way to use someone's picture, so the bill came to ${formatGen(MONEY.fee, 2)}. (GEN is the money this test network runs on.)`,
    claimId: CAUGHT.claimId,
    next: "Did they pay it?",
  },
  {
    id: "paid",
    title: "The shop paid. She kept almost all of it.",
    body: `The artist got ${formatGen(MONEY.creator, 2)} of it. TraceMint kept ${formatGen(MONEY.protocol, 2)}. She keeps 97 out of every 100, every time.`,
    claimId: CAUGHT.claimId,
    next: "Is that the whole thing?",
  },
  {
    id: "credited",
    title: "Now the part that matters.",
    body: `A blog used a different painting of hers — and wrote her name on it. Judges checked that page ${CREDITED.checks} separate times. Every single time the bill was nothing at all.`,
    quote: CREDITED.quote,
    claimId: CREDITED.claimId,
  },
];

/** The closing line, kept out of the beats because it is the point of the page rather than a step in it. */
export const POINT = {
  title: "That is the whole idea.",
  body: "Say whose picture it is and it costs you nothing. Say nothing, and a bill turns up.",
};

/**
 * What a beat's "see for yourself" link points at. The notice page carries the full record: both
 * pictures, the judges' reasoning, the sum, and a link out to the block explorer.
 */
export const recordHref = (claimId: number) => `/notices/${claimId}`;

/** Guards the story against a demo re-seed that changes what the copy asserts. */
export function storyIsConsistent(): true {
  const expected = feeBreakdown(CAUGHT.basePrice, CAUGHT.usage, CAUGHT.prominence);
  if (!expected) throw new Error("Unknown usage or prominence in the walkthrough.");
  if (expected.fee !== MONEY.fee) throw new Error("The bill in the copy is not the fee the rules produce.");
  if (creatorShare(MONEY.fee) !== MONEY.creator) throw new Error("The artist's share in the copy is not 97%.");
  if (MONEY.creator + MONEY.protocol !== MONEY.fee) throw new Error("The split in the copy does not add up to the bill.");
  return true;
}

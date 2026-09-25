import { describe, expect, it } from "vitest";

import { formatGen } from "@/lib/format";
import { BEATS, CAUGHT, CREDITED, MONEY, POINT, recordHref, storyIsConsistent } from "@/lib/start/story";

/**
 * The walkthrough states figures as plain sentences, so nothing in the UI would notice if the copy and
 * the contract's fee rules drifted apart. These tests are that noticing.
 */
describe("the numbers in the story", () => {
  it("are the ones the fee rules produce", () => {
    expect(storyIsConsistent()).toBe(true);
  });

  it("match the case recorded on chain: 10 GEN on merchandise, as the whole product, bills 45", () => {
    expect(formatGen(CAUGHT.basePrice)).toBe("10 GEN");
    expect(formatGen(MONEY.fee)).toBe("45 GEN");
    expect(formatGen(MONEY.creator)).toBe("43.65 GEN");
    expect(formatGen(MONEY.protocol)).toBe("1.35 GEN");
  });

  it("names the bill in the beat that announces it, so the heading cannot disagree with the sum", () => {
    const bill = BEATS.find((beat) => beat.id === "bill");
    expect(bill?.title).toContain(formatGen(MONEY.fee, 2));
    expect(bill?.body).toContain(formatGen(MONEY.fee, 2));
  });

  it("splits the bill in the beat that announces the payout", () => {
    const paid = BEATS.find((beat) => beat.id === "paid");
    expect(paid?.body).toContain(formatGen(MONEY.creator, 2));
    expect(paid?.body).toContain(formatGen(MONEY.protocol, 2));
  });
});

describe("the story's shape", () => {
  it("ends on the credited copy, because that is the lesson rather than the bill", () => {
    expect(BEATS.at(-1)?.id).toBe("credited");
    expect(BEATS.at(-1)?.next).toBeUndefined();
    expect(POINT.body).toMatch(/costs you nothing/);
  });

  it("gives every beat but the last something to press", () => {
    for (const beat of BEATS.slice(0, -1)) expect(beat.next, `beat ${beat.id}`).toBeTruthy();
  });

  it("uses unique ids, so the progress bar and the reveal cannot desync", () => {
    expect(new Set(BEATS.map((beat) => beat.id)).size).toBe(BEATS.length);
  });

  it("quotes the judges verbatim only where a record backs the quote", () => {
    for (const beat of BEATS.filter((candidate) => candidate.quote)) {
      expect(beat.claimId, `beat ${beat.id} quotes without citing a record`).toBeTypeOf("number");
    }
  });

  it("points each citation at the notice that holds the full record", () => {
    expect(recordHref(CAUGHT.claimId)).toBe("/notices/1");
    expect(recordHref(CREDITED.claimId)).toBe("/notices/16");
  });

  it("describes every picture, since the page is mostly pictures", () => {
    for (const image of BEATS.flatMap((beat) => beat.art ?? [])) {
      expect(image.alt.length, `alt for ${image.src}`).toBeGreaterThan(10);
    }
  });
});

/**
 * The whole point of this page is that a stranger meets no new vocabulary. A word that creeps back in
 * here is a regression, even though nothing would crash.
 */
describe("the words the story is not allowed to use", () => {
  const BANNED = /\b(validator|validators|consensus|on-chain|blockchain|perceptual|hash|wei|smart contract|dApp)\b/i;

  it.each(BEATS)("keeps beat $id free of jargon", (beat) => {
    expect(beat.title).not.toMatch(BANNED);
    expect(beat.body).not.toMatch(BANNED);
  });

  it("keeps the closing line free of jargon too", () => {
    expect(POINT.title).not.toMatch(BANNED);
    expect(POINT.body).not.toMatch(BANNED);
  });

  it("says judges and robot, the words it replaced them with", () => {
    const prose = BEATS.map((beat) => `${beat.title} ${beat.body}`).join(" ");
    expect(prose).toMatch(/judges/i);
    expect(prose).toMatch(/robot/i);
  });
});

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { differenceHash, hammingDistance, isMatch, MATCH_THRESHOLD } from "../src/phash";
import { cropEachSide, recompress, resize, scene } from "./images";

describe("hammingDistance", () => {
  it("counts differing bits", () => {
    expect(hammingDistance(0b1011n, 0b0010n)).toBe(2);
    expect(hammingDistance(0n, (1n << 64n) - 1n)).toBe(64);
  });
});

describe("isMatch", () => {
  it("matches at the threshold and not above it", () => {
    expect(MATCH_THRESHOLD).toBe(10);
    expect(isMatch(10)).toBe(true);
    expect(isMatch(11)).toBe(false);
  });
});

describe("differenceHash", () => {
  it("matches identical, resized, recompressed, and lightly cropped copies", async () => {
    const original = await scene("artwork");
    const base = await differenceHash(original);
    const copies: Record<string, Buffer> = {
      identical: original,
      resized: await resize(original, 320, 240),
      recompressed: await recompress(original, 60),
      croppedFivePercentEachSide: await cropEachSide(original, 0.05),
    };
    for (const [name, image] of Object.entries(copies)) {
      const distance = hammingDistance(base, await differenceHash(image));
      expect(isMatch(distance), `${name} distance ${distance}`).toBe(true);
    }
  });

  it("does not match unrelated images", async () => {
    const base = await differenceHash(await scene("artwork"));
    for (const kind of ["stripes", "shapes"] as const) {
      const distance = hammingDistance(base, await differenceHash(await scene(kind)));
      expect(distance, `${kind} distance ${distance}`).toBeGreaterThanOrEqual(20);
    }
  });

  it("gives the same hash to an image with an alpha channel", async () => {
    const original = await scene("artwork");
    const withAlpha = await sharp(original).ensureAlpha().png().toBuffer();
    expect(await differenceHash(withAlpha)).toBe(await differenceHash(original));
  });
});

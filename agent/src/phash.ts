import sharp from "sharp";

export const MATCH_THRESHOLD = 10;

/** 64-bit difference hash: flatten, grayscale, shrink to 9×8, and record whether each pixel is brighter than its right neighbour. */
export async function differenceHash(image: Uint8Array): Promise<bigint> {
  const pixels = await sharp(image)
    .flatten({ background: "#ffffff" })
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer();
  let hash = 0n;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const left = pixels[row * 9 + col];
      const right = pixels[row * 9 + col + 1];
      hash = (hash << 1n) | (left > right ? 1n : 0n);
    }
  }
  return hash;
}

export function hammingDistance(a: bigint, b: bigint): number {
  let diff = a ^ b;
  let count = 0;
  while (diff > 0n) {
    count += Number(diff & 1n);
    diff >>= 1n;
  }
  return count;
}

export function isMatch(distance: number, threshold = MATCH_THRESHOLD): boolean {
  return distance <= threshold;
}

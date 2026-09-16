import sharp from "sharp";

export type SceneKind = "artwork" | "stripes" | "shapes";

/** Deterministic synthetic PNGs: an "artwork" and two unrelated images. */
export async function scene(kind: SceneKind, width = 640, height = 480): Promise<Buffer> {
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      let r = Math.round((255 * x) / width);
      let g = Math.round((255 * y) / height);
      let b = 128;
      if (kind === "artwork") {
        if ((x - width * 0.35) ** 2 + (y - height * 0.45) ** 2 < (height * 0.22) ** 2) [r, g, b] = [250, 220, 40];
        if (x > width * 0.6 && x < width * 0.85 && y > height * 0.2 && y < height * 0.7) [r, g, b] = [30, 40, 200];
      } else if (kind === "stripes") {
        const stripe = Math.floor(x / (width / 8)) % 2 === 0;
        [r, g, b] = [stripe ? 200 : 40, (x * 3 + y) % 256, stripe ? 60 : 220];
      } else {
        if ((x - width * 0.7) ** 2 + (y - height * 0.3) ** 2 < (height * 0.3) ** 2) [r, g, b] = [20, 200, 90];
        if (y > height * 0.65) [r, g, b] = [90, 30, 30];
      }
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
  return sharp(data, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

export const resize = (image: Buffer, width: number, height: number) =>
  sharp(image).resize(width, height).png().toBuffer();

export const recompress = (image: Buffer, quality: number) => sharp(image).jpeg({ quality }).toBuffer();

export async function cropEachSide(image: Buffer, fraction: number): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(image).metadata();
  const left = Math.round(width * fraction);
  const top = Math.round(height * fraction);
  return sharp(image)
    .extract({ left, top, width: width - 2 * left, height: height - 2 * top })
    .png()
    .toBuffer();
}

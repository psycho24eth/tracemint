/**
 * Generates the two demo art files that the seeded demo work relies on:
 *  - frontend/public/demo/cybernetic-horizon.png  (the "original", on the creator's portfolio and blog)
 *  - frontend/public/demo/synth-hoodie-banner.jpg (the "infringing copy", on the demo shop's product page)
 *
 * The banner is a light crop + resize + recompress of the horizon art, so the scanning
 * agent's perceptual hash (see @licensehunter/agent/phash) reports the two as a match.
 *
 * Run with: npm run demo-art
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { differenceHash, hammingDistance, MATCH_THRESHOLD } from "@licensehunter/agent/phash";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(SCRIPT_DIR, "..");
const OUT_DIR = path.join(REPO_ROOT, "frontend", "public", "demo");
const PNG_PATH = path.join(OUT_DIR, "cybernetic-horizon.png");
const JPEG_PATH = path.join(OUT_DIR, "synth-hoodie-banner.jpg");

const WIDTH = 1200;
const HEIGHT = 800;
const MAX_BYTES = 5 * 1024 * 1024;

// Crop fraction per side for the "edited copy". The brief's default 5% (60px left/right, 40px
// top/bottom on a 1200x800 canvas) measured a Hamming distance of 12 on this art -- over
// MATCH_THRESHOLD (10) -- once the sun gradient was tuned to run fully cyan-to-magenta across
// the visible arc (a bigger crop clips more of that high-contrast curved edge, moving more bits
// of the 8x8 difference hash). Per the brief's fallback, this was lowered to 3% per side (36px
// left/right, 24px top/bottom), which measured a distance of 9 -- at MATCH_THRESHOLD. Keep this
// at 0.03 unless the art changes again; if a future edit pushes the distance back over 10, lower
// it further and rerun.
const CROP_FRACTION = 0.03;

function buildSvg(): string {
  const horizonY = 520;
  const sunCenter = { x: 600, y: horizonY };
  const sunRadius = 190;

  const stars = [
    [110, 70, 1.6], [260, 130, 1.1], [180, 210, 1.8], [340, 90, 1.3],
    [420, 190, 1.1], [70, 260, 1.4], [520, 60, 1.6], [900, 100, 1.5],
    [980, 200, 1.1], [1060, 70, 1.8], [1130, 160, 1.2], [780, 150, 1.1],
    [850, 240, 1.6], [1000, 300, 1.1], [150, 320, 1.2], [1100, 280, 1.4],
  ]
    .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f1f5f9" opacity="0.85" />`)
    .join("\n      ");

  // Perspective grid: horizontal rungs packed tight near the horizon and spreading out toward
  // the viewer; verticals fan out from the sun's centre (the vanishing point) to the bottom edge.
  const rungYs = [horizonY, 536, 556, 582, 616, 662, 726, HEIGHT];
  const horizontals = rungYs
    .map((y) => `<line x1="0" y1="${y}" x2="${WIDTH}" y2="${y}" stroke="#00f2fe" stroke-width="1.5" opacity="0.55" />`)
    .join("\n      ");
  const vanishX = sunCenter.x;
  const bottomXs = [-600, -200, 100, 350, 600, 850, 1100, 1400, 1800];
  const verticals = bottomXs
    .map((x) => `<line x1="${vanishX}" y1="${horizonY}" x2="${x}" y2="${HEIGHT}" stroke="#00f2fe" stroke-width="1.5" opacity="0.5" />`)
    .join("\n      ");

  // Retro sun scanlines: a handful of ground-coloured bars over the lower sun to give the
  // classic vaporwave "sliced sun" look.
  const sunBars = [horizonY - 26, horizonY - 54, horizonY - 86, horizonY - 122]
    .map((y, i) => `<rect x="${sunCenter.x - 165 + i * 6}" y="${y}" width="${330 - i * 12}" height="9" fill="#05070d" />`)
    .join("\n      ");

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0e2a" />
      <stop offset="55%" stop-color="#1a0b2e" />
      <stop offset="100%" stop-color="#05070d" />
    </linearGradient>
    <linearGradient id="sun" gradientUnits="userSpaceOnUse" x1="${sunCenter.x}" y1="${sunCenter.y - sunRadius}" x2="${sunCenter.x}" y2="${sunCenter.y}">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="55%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#ff2fd6" />
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)" />

  <g>
      ${stars}
  </g>

  <circle cx="${sunCenter.x}" cy="${sunCenter.y}" r="${sunRadius}" fill="url(#sun)" />
  <g>
      ${sunBars}
  </g>

  <polygon points="0,486 120,430 230,478 360,404 460,470 560,420 640,468 760,398 880,462 1000,418 1120,472 ${WIDTH},440 ${WIDTH},${horizonY} 0,${horizonY}" fill="#0c1224" />
  <polygon points="0,${horizonY} 90,468 210,506 330,458 470,500 600,456 730,502 860,462 980,500 1100,466 ${WIDTH},498 ${WIDTH},${horizonY}" fill="#080d1a" />

  <rect x="0" y="${horizonY}" width="${WIDTH}" height="${HEIGHT - horizonY}" fill="#05070d" />

  <g>
      ${horizontals}
      ${verticals}
  </g>

  <text x="${WIDTH - 40}" y="${HEIGHT - 30}" text-anchor="end" font-family="monospace" font-size="22" fill="#94a3b8" font-style="italic">Demo Creator</text>
</svg>`;
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const svg = buildSvg();
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(PNG_PATH, pngBuffer);

  const cropLeftRight = Math.round(WIDTH * CROP_FRACTION);
  const cropTopBottom = Math.round(HEIGHT * CROP_FRACTION);
  const jpegBuffer = await sharp(pngBuffer)
    .extract({
      left: cropLeftRight,
      top: cropTopBottom,
      width: WIDTH - cropLeftRight * 2,
      height: HEIGHT - cropTopBottom * 2,
    })
    .resize(960)
    .jpeg({ quality: 82 })
    .toBuffer();
  await writeFile(JPEG_PATH, jpegBuffer);

  console.log(`${path.relative(REPO_ROOT, PNG_PATH)}: ${pngBuffer.length} bytes`);
  console.log(`${path.relative(REPO_ROOT, JPEG_PATH)}: ${jpegBuffer.length} bytes`);

  let failed = false;
  if (pngBuffer.length >= MAX_BYTES || jpegBuffer.length >= MAX_BYTES) {
    console.error("One of the demo images is at or over the 5 MB contract cap.");
    failed = true;
  }

  const originalHash = await differenceHash(pngBuffer);
  const copyHash = await differenceHash(jpegBuffer);
  const distance = hammingDistance(originalHash, copyHash);
  console.log(`Hamming distance (original vs. edited copy): ${distance} (MATCH_THRESHOLD = ${MATCH_THRESHOLD})`);

  if (distance > MATCH_THRESHOLD) {
    console.error(
      `Hamming distance ${distance} is above MATCH_THRESHOLD ${MATCH_THRESHOLD}. Reduce CROP_FRACTION and rerun.`,
    );
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }
}

await main();

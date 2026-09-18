/**
 * Generates the demo art collection that the seeded demo works rely on. Every work has:
 *  - an "original" PNG, shown on the creator's portfolio and registered on-chain
 *  - a "copy" JPEG, shown on a demo shop or blog page
 *
 * A copy is a light crop + resize + recompress of its original, so the scanning agent's perceptual
 * hash (see @licensehunter/agent/phash) reports the pair as a match. The script also checks that no
 * image comes near another work's original, so a scan never matches the wrong work.
 *
 * Files are only rewritten when their bytes change, so re-running leaves registered art untouched.
 *
 * Run with: npm run demo-art
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { differenceHash, hammingDistance, MATCH_THRESHOLD } from "@licensehunter/agent/phash";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(SCRIPT_DIR, "..");
const OUT_DIR = path.join(REPO_ROOT, "frontend", "public", "demo");

const WIDTH = 1200;
const HEIGHT = 800;
const MAX_BYTES = 5 * 1024 * 1024;

// Copies must sit comfortably inside the match threshold, and unrelated works comfortably outside it.
const COPY_MAX_DISTANCE = MATCH_THRESHOLD - 1;
const UNRELATED_MIN_DISTANCE = MATCH_THRESHOLD + 8;

type Artwork = {
  original: string;
  copy: string;
  svg: () => string;
  /** Crop fractions per side to try for the copy, first one that stays within COPY_MAX_DISTANCE wins. */
  cropFractions: number[];
};

// Cybernetic Horizon keeps its original 3% crop: 5% measured a distance of 12 on this art (the
// crop clips the high-contrast sun arc), 3% measured 9. Its files are registered on-chain as work #1.
const ARTWORKS: Artwork[] = [
  { original: "cybernetic-horizon.png", copy: "synth-hoodie-banner.jpg", svg: cyberneticHorizonSvg, cropFractions: [0.03] },
  { original: "koi-current.png", copy: "koi-tote-print.jpg", svg: koiCurrentSvg, cropFractions: [0.03, 0.02, 0.01] },
  { original: "chrome-bloom.png", copy: "chrome-case-print.jpg", svg: chromeBloomSvg, cropFractions: [0.03, 0.02, 0.01] },
  { original: "dune-monolith.png", copy: "desert-dreamscape.jpg", svg: duneMonolithSvg, cropFractions: [0.03, 0.02, 0.01] },
  { original: "glass-tide.png", copy: "glass-tide-feature.jpg", svg: glassTideSvg, cropFractions: [0.03, 0.02, 0.01] },
  { original: "signal-garden.png", copy: "signal-garden-poster.jpg", svg: signalGardenSvg, cropFractions: [0.03, 0.02, 0.01] },
];

function cyberneticHorizonSvg(): string {
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

// The collection below is drawn on a 300x200 grid and rendered at 1200x800.
function artSvg(defs: string, body: string, signatureColor: string): string {
  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
  <defs>${defs}</defs>
  ${body}
  <text x="290" y="193" text-anchor="end" font-family="monospace" font-size="5.5" fill="${signatureColor}" font-style="italic">Demo Creator</text>
</svg>`;
}

function koiCurrentSvg(): string {
  return artSvg(
    `<radialGradient id="water" cx="45%" cy="40%" r="80%">
      <stop offset="0" stop-color="#0f5566" /><stop offset="0.6" stop-color="#083340" /><stop offset="1" stop-color="#031217" />
    </radialGradient>
    <linearGradient id="koi-a" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff6a2b" /><stop offset="0.55" stop-color="#ffb27a" /><stop offset="1" stop-color="#fff1e4" />
    </linearGradient>
    <linearGradient id="koi-b" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff6ec" /><stop offset="0.5" stop-color="#ffffff" /><stop offset="1" stop-color="#e8432e" />
    </linearGradient>`,
    `<rect width="300" height="200" fill="url(#water)" />
  <g fill="none" stroke="#8ff0e8" stroke-opacity="0.22" stroke-width="1.2">
    <circle cx="84" cy="53" r="14" /><circle cx="84" cy="53" r="26" /><circle cx="84" cy="53" r="40" /><circle cx="84" cy="53" r="55" />
    <circle cx="226" cy="150" r="12" /><circle cx="226" cy="150" r="24" /><circle cx="226" cy="150" r="38" />
  </g>
  <ellipse cx="250" cy="38" rx="26" ry="17" fill="#2e8c5a" />
  <path d="M250 38 L276 31 L274 45 Z" fill="#0b4a58" />
  <path d="M52 128 C84 101 150 96 190 113 C205 120 210 127 194 133 C160 149 96 152 52 128 Z" fill="url(#koi-a)" />
  <path d="M56 128 L26 109 Q36 128 26 147 Z" fill="#ff6a2b" opacity="0.9" />
  <path d="M118 108 Q132 89 154 101 Z" fill="#ffb27a" opacity="0.85" />
  <path d="M112 137 Q124 154 142 142 Z" fill="#ff6a2b" opacity="0.7" />
  <path d="M100 118 q10 -7 22 -2 q-8 9 -22 2 Z" fill="#e8432e" opacity="0.85" />
  <circle cx="184" cy="120" r="2.6" fill="#031217" />
  <g transform="rotate(180 150 100)">
    <path d="M70 128 C100 106 158 103 192 118 C205 124 208 129 195 135 C166 147 110 150 70 128 Z" fill="url(#koi-b)" />
    <path d="M73 128 L46 112 Q55 128 46 144 Z" fill="#fff6ec" />
    <path d="M140 116 q14 -9 26 0 q-12 9 -26 0 Z" fill="#e8432e" />
    <circle cx="187" cy="124" r="2.4" fill="#031217" />
  </g>`,
    "#8fb9bf",
  );
}

function chromeBloomSvg(): string {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315]
    .map((angle) => `<ellipse rx="18" ry="50" cy="-43" transform="rotate(${angle})" />`)
    .join("");
  const innerPetals = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5]
    .map((angle) => `<ellipse rx="11" ry="32" cy="-27" transform="rotate(${angle})" />`)
    .join("");
  return artSvg(
    `<radialGradient id="void" cx="50%" cy="50%" r="70%">
      <stop offset="0" stop-color="#1a1b20" /><stop offset="1" stop-color="#050506" />
    </radialGradient>
    <linearGradient id="petal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" /><stop offset="0.3" stop-color="#a7adb6" /><stop offset="0.55" stop-color="#23262c" />
      <stop offset="0.8" stop-color="#d9dde3" /><stop offset="1" stop-color="#6d737c" />
    </linearGradient>
    <linearGradient id="inner-petal" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9ecf0" /><stop offset="0.5" stop-color="#3a3e46" /><stop offset="1" stop-color="#b6bbc3" />
    </linearGradient>
    <radialGradient id="core">
      <stop offset="0" stop-color="#ffe3a3" /><stop offset="0.45" stop-color="#ff5a1f" /><stop offset="1" stop-color="#4a1405" />
    </radialGradient>`,
    `<rect width="300" height="200" fill="url(#void)" />
  <g transform="translate(150 96)">
    <g fill="url(#petal)">${petals}</g>
    <g fill="url(#inner-petal)">${innerPetals}</g>
    <circle r="15" fill="url(#core)" />
    <circle r="15" fill="none" stroke="#ffe3a3" stroke-opacity="0.5" />
  </g>`,
    "#6d737c",
  );
}

function duneMonolithSvg(): string {
  return artSvg(
    `<linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1d1438" /><stop offset="0.45" stop-color="#7b3f7a" /><stop offset="0.8" stop-color="#f29a6b" /><stop offset="1" stop-color="#ffd6a0" />
    </linearGradient>
    <linearGradient id="dune-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0a06a" /><stop offset="1" stop-color="#b85a3c" /></linearGradient>
    <linearGradient id="dune-mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4613f" /><stop offset="1" stop-color="#6e2c2a" /></linearGradient>
    <linearGradient id="dune-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a3230" /><stop offset="1" stop-color="#2a1016" /></linearGradient>`,
    `<rect width="300" height="200" fill="url(#dusk)" />
  <g fill="#ffe3a3" opacity="0.5">
    <circle cx="40" cy="26" r="1" /><circle cx="90" cy="15" r="1.2" /><circle cx="150" cy="34" r="0.9" />
    <circle cx="250" cy="20" r="1.1" /><circle cx="280" cy="51" r="0.8" /><circle cx="20" cy="60" r="0.8" />
  </g>
  <circle cx="206" cy="101" r="29" fill="#ffe3a3" opacity="0.95" />
  <path d="M0 128 C60 109 120 116 170 125 C220 133 260 120 300 113 L300 200 L0 200 Z" fill="url(#dune-near)" />
  <path d="M0 150 C70 133 130 145 190 154 C240 161 270 147 300 142 L300 200 L0 200 Z" fill="url(#dune-mid)" />
  <path d="M0 174 C60 162 140 169 200 180 C240 186 270 176 300 171 L300 200 L0 200 Z" fill="url(#dune-far)" />
  <polygon points="118,147 128,55 146,53 140,150" fill="#0a0a0c" />
  <polygon points="140,150 146,53 150,56 146,150" fill="#2a2a30" />
  <polygon points="118,147 140,150 250,176 196,181" fill="#2a1016" opacity="0.55" />`,
    "#f0c9a0",
  );
}

function glassTideSvg(): string {
  return artSvg(
    `<linearGradient id="deep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1330" /><stop offset="1" stop-color="#0d3b4f" /></linearGradient>
    <linearGradient id="wave-mint" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9bf0c8" stop-opacity="0.85" /><stop offset="1" stop-color="#2f7bd8" stop-opacity="0.6" />
    </linearGradient>
    <linearGradient id="wave-lilac" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b9a7ff" stop-opacity="0.8" /><stop offset="1" stop-color="#1b4db0" stop-opacity="0.6" />
    </linearGradient>
    <linearGradient id="crest" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e6fbff" stop-opacity="0.9" /><stop offset="1" stop-color="#6fd3e8" stop-opacity="0.5" />
    </linearGradient>`,
    `<rect width="300" height="200" fill="url(#deep)" />
  <circle cx="222" cy="50" r="29" fill="#e6fbff" opacity="0.08" />
  <circle cx="222" cy="50" r="19" fill="#e6fbff" opacity="0.9" />
  <path d="M0 103 C40 82 80 120 130 101 C180 82 220 116 300 92 L300 200 L0 200 Z" fill="url(#wave-lilac)" />
  <path d="M0 125 C50 106 100 144 150 123 C200 103 240 140 300 118 L300 200 L0 200 Z" fill="url(#wave-mint)" />
  <path d="M0 150 C40 137 90 168 150 149 C210 130 250 164 300 145 L300 200 L0 200 Z" fill="url(#wave-lilac)" opacity="0.9" />
  <path d="M0 173 C60 159 110 188 170 171 C220 157 260 183 300 169 L300 200 L0 200 Z" fill="url(#wave-mint)" />
  <g fill="none" stroke="url(#crest)" stroke-width="1.4">
    <path d="M0 126 C50 107 100 145 150 124 C200 104 240 141 300 119" />
    <path d="M0 151 C40 138 90 169 150 150 C210 131 250 165 300 146" />
  </g>`,
    "#a9d8e6",
  );
}

function signalGardenSvg(): string {
  return artSvg(
    `<radialGradient id="night" cx="50%" cy="100%" r="100%"><stop offset="0" stop-color="#0e2a1e" /><stop offset="1" stop-color="#050a08" /></radialGradient>`,
    `<rect width="300" height="200" fill="url(#night)" />
  <g fill="#9bf0c8" opacity="0.5">
    <circle cx="30" cy="34" r="1.2" /><circle cx="60" cy="60" r="0.9" /><circle cx="260" cy="34" r="1.1" />
    <circle cx="220" cy="171" r="1" /><circle cx="36" cy="180" r="1" /><circle cx="120" cy="26" r="0.8" />
  </g>
  <line x1="0" y1="162" x2="300" y2="162" stroke="#ff4fd8" stroke-opacity="0.35" stroke-dasharray="2 4" />
  <g fill="none" stroke-linecap="round">
    <path d="M150 200 C150 154 140 120 150 60" stroke="#9bf0c8" stroke-width="2.4" />
    <path d="M150 128 C120 111 100 103 70 106" stroke="#9bf0c8" stroke-width="1.6" />
    <path d="M150 103 C180 85 204 82 236 87" stroke="#9bf0c8" stroke-width="1.6" />
    <path d="M100 200 C96 171 84 150 60 137" stroke="#ff4fd8" stroke-width="1.8" />
    <path d="M210 200 C214 168 226 147 250 128" stroke="#ff4fd8" stroke-width="1.8" />
  </g>
  <path d="M150 60 C128 48 124 29 150 15 C176 29 172 48 150 60 Z" fill="#9bf0c8" opacity="0.9" />
  <path d="M70 106 C58 91 66 77 88 75 C94 92 88 104 70 106 Z" fill="#9bf0c8" opacity="0.75" />
  <path d="M236 87 C250 74 268 75 276 91 C258 101 244 99 236 87 Z" fill="#9bf0c8" opacity="0.75" />
  <circle cx="60" cy="137" r="14" fill="#ff4fd8" opacity="0.18" /><circle cx="60" cy="137" r="8" fill="#ff4fd8" />
  <circle cx="250" cy="128" r="14" fill="#ff4fd8" opacity="0.18" /><circle cx="250" cy="128" r="8" fill="#ff4fd8" />
  <circle cx="150" cy="38" r="3.5" fill="#050a08" />`,
    "#7fb8a0",
  );
}

async function makeCopy(original: Buffer, cropFraction: number): Promise<Buffer> {
  const cropLeftRight = Math.round(WIDTH * cropFraction);
  const cropTopBottom = Math.round(HEIGHT * cropFraction);
  return sharp(original)
    .extract({
      left: cropLeftRight,
      top: cropTopBottom,
      width: WIDTH - cropLeftRight * 2,
      height: HEIGHT - cropTopBottom * 2,
    })
    .resize(960)
    .jpeg({ quality: 82 })
    .toBuffer();
}

async function writeIfChanged(file: string, buffer: Buffer): Promise<string> {
  const target = path.join(OUT_DIR, file);
  const existing = await readFile(target).catch(() => null);
  if (existing?.equals(buffer)) return "unchanged";
  await writeFile(target, buffer);
  return existing ? "updated" : "created";
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  let failed = false;
  const rendered: { name: string; original: Buffer; copy: Buffer; originalHash: bigint; copyHash: bigint }[] = [];

  for (const artwork of ARTWORKS) {
    const original = await sharp(Buffer.from(artwork.svg())).png().toBuffer();
    const originalHash = await differenceHash(original);

    let copy: Buffer | null = null;
    let copyHash = 0n;
    let distance = Number.POSITIVE_INFINITY;
    for (const fraction of artwork.cropFractions) {
      copy = await makeCopy(original, fraction);
      copyHash = await differenceHash(copy);
      distance = hammingDistance(originalHash, copyHash);
      if (distance <= COPY_MAX_DISTANCE) break;
    }

    console.log(
      `${artwork.original} (${await writeIfChanged(artwork.original, original)}, ${original.length} bytes) -> ` +
        `${artwork.copy} (${await writeIfChanged(artwork.copy, copy!)}, ${copy!.length} bytes), distance ${distance}`,
    );
    if (distance > COPY_MAX_DISTANCE) {
      console.error(`  ${artwork.copy} is ${distance} bits from its original; it must be at most ${COPY_MAX_DISTANCE}.`);
      failed = true;
    }
    if (original.length >= MAX_BYTES || copy!.length >= MAX_BYTES) {
      console.error(`  ${artwork.original} or its copy is at or over the 5 MB contract cap.`);
      failed = true;
    }
    rendered.push({ name: artwork.original, original, copy: copy!, originalHash, copyHash });
  }

  // A scan compares every image on a watched page with one work's original, so neither another
  // original nor another work's copy may come close to it.
  let closest = Number.POSITIVE_INFINITY;
  for (const work of rendered) {
    for (const other of rendered) {
      if (other === work) continue;
      for (const [label, hash] of [["original", other.originalHash], ["copy", other.copyHash]] as const) {
        const distance = hammingDistance(work.originalHash, hash);
        closest = Math.min(closest, distance);
        if (distance < UNRELATED_MIN_DISTANCE) {
          console.error(`${other.name} (${label}) is only ${distance} bits from ${work.name}; keep unrelated works at least ${UNRELATED_MIN_DISTANCE} apart.`);
          failed = true;
        }
      }
    }
  }
  console.log(`Closest pair of unrelated works: ${closest} bits (MATCH_THRESHOLD = ${MATCH_THRESHOLD})`);

  if (failed) process.exit(1);
}

await main();

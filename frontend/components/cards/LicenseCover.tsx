/**
 * A cover generated from a license's identity, so every license in the collection looks different.
 * Deterministic: the same seed draws the same cover on the server and in every browser.
 */

const PALETTES = [
  ["#FF5A1F", "#FFB8E0", "#FFE3A3", "#9BF0C8", "#B9A7FF"],
  ["#9BF0C8", "#B9A7FF", "#6FD3E8", "#FFE3A3", "#FF5A1F"],
  ["#FFE3A3", "#FFC46B", "#FF9A3C", "#6F8CFF", "#2F4BD8"],
  ["#B9A7FF", "#FFB8E0", "#9BF0C8", "#FFE3A3", "#FF5A1F"],
];
const BACKGROUNDS = ["#150a06", "#08111a", "#0f0a14", "#0b0913", "#0d1210"];
const PATTERNS = ["rings", "grid", "waves", "hex"] as const;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const between = (rand: Rand, min: number, max: number) => min + rand() * (max - min);
const pick = <T,>(rand: Rand, items: readonly T[]) => items[Math.floor(rand() * items.length)];

function Rings({ rand, palette }: { rand: Rand; palette: string[] }) {
  return (
    <g transform={`translate(150 112) rotate(${Math.round(between(rand, 0, 360))})`} fill="none" strokeLinecap="round">
      {[98, 80, 64, 48, 33, 19].map((radius) => (
        <circle
          key={radius}
          r={radius}
          stroke={pick(rand, palette)}
          strokeWidth={between(rand, 3, 10).toFixed(1)}
          strokeDasharray={`${Math.round(between(rand, 10, 120))} ${Math.round(between(rand, 8, 40))} ${Math.round(between(rand, 10, 90))} ${Math.round(between(rand, 8, 60))}`}
          opacity={between(rand, 0.7, 0.95).toFixed(2)}
        />
      ))}
      <circle r="5" fill={palette[2]} />
    </g>
  );
}

function Grid({ rand, palette }: { rand: Rand; palette: string[] }) {
  const cells = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={46 + col * 26}
          y={8 + row * 26}
          width="22"
          height="22"
          rx="4"
          fill={rand() > 0.5 ? palette[0] : palette[1]}
          opacity={between(rand, 0.12, 0.95).toFixed(2)}
        />,
      );
    }
  }
  return <g>{cells}</g>;
}

function Waves({ rand, palette }: { rand: Rand; palette: string[] }) {
  const amplitude = between(rand, 16, 34);
  const phase = between(rand, 0, 80);
  return (
    <g fill="none" strokeWidth="3" strokeLinecap="round">
      {Array.from({ length: 8 }, (_, index) => {
        const y = 36 + index * 24;
        return (
          <path
            key={index}
            d={`M-10 ${y} C ${40 + phase} ${y - amplitude}, ${80 + phase} ${y + amplitude}, 130 ${y} S ${220 - phase} ${y - amplitude}, 310 ${y}`}
            stroke={palette[index % palette.length]}
            opacity={(0.95 - index * 0.03).toFixed(2)}
          />
        );
      })}
    </g>
  );
}

function Hexes({ rand, palette }: { rand: Rand; palette: string[] }) {
  const hexagon = (radius: number) =>
    Array.from({ length: 6 }, (_, index) => {
      const angle = (Math.PI / 3) * index - Math.PI / 2;
      return `${(radius * Math.cos(angle)).toFixed(1)},${(radius * Math.sin(angle)).toFixed(1)}`;
    }).join(" ");
  return (
    <g transform={`translate(150 112) rotate(${Math.round(between(rand, 0, 60))})`} fill="none" strokeWidth="2">
      {[100, 80, 60, 40].map((radius, index) => (
        <polygon key={radius} points={hexagon(radius)} stroke={palette[(index + 1) % palette.length]} opacity={(0.5 + index * 0.13).toFixed(2)} />
      ))}
      <polygon points={hexagon(20)} fill={palette[0]} stroke="none" />
      <g stroke={palette[4]} opacity="0.35">
        <line x1="0" y1="-100" x2="0" y2="100" />
        <line x1="-87" y1="-50" x2="87" y2="50" />
        <line x1="-87" y1="50" x2="87" y2="-50" />
      </g>
    </g>
  );
}

export function LicenseCover({ seed, className = "" }: { seed: string; className?: string }) {
  const rand = random(hashSeed(seed));
  const pattern = pick(rand, PATTERNS);
  const palette = pick(rand, PALETTES);
  const background = pick(rand, BACKGROUNDS);

  return (
    <svg viewBox="0 0 300 225" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <rect width="300" height="225" fill={background} />
      {pattern === "rings" && <Rings rand={rand} palette={palette} />}
      {pattern === "grid" && <Grid rand={rand} palette={palette} />}
      {pattern === "waves" && <Waves rand={rand} palette={palette} />}
      {pattern === "hex" && <Hexes rand={rand} palette={palette} />}
    </svg>
  );
}

/** Exposed for tests: which pattern a seed draws. */
export function coverPattern(seed: string): (typeof PATTERNS)[number] {
  return pick(random(hashSeed(seed)), PATTERNS);
}

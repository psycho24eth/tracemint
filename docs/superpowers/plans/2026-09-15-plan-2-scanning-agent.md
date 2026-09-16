# LicenseHunter Plan 2 of 4: Scanning Agent

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@licensehunter/agent`, a TypeScript package that finds copies of registered works on watched pages with perceptual hashing and files claims on the LicenseHunter contract. It runs every 30 minutes from GitHub Actions, and the web app's "Scan now" route can import it.

**Architecture:**
- **Pure modules, unit-tested.** URL rules, HTML image extraction, difference hashing, candidate discovery, and the scan policy take their I/O as injected functions, so tests never touch the network or the chain.
- **Two thin I/O modules.**
  - `http.ts` wraps `fetch` with timeouts, size caps, and private-host blocking.
  - `genlayer.ts` is the Studio Next client helper moved out of `deploy/studio-next.ts`, which then re-exports it.
- **A contract adapter maps contract rows to agent types.** A CLI and a scheduled workflow run the scan.

**Tech Stack:** Node 22+, TypeScript (ESM, run with tsx, no build step), sharp `0.35.4`, cheerio `1.2.0`, genlayer-js `2.0.0-rc.1`, Vitest `^4.1.8`.

**Spec:** `docs/superpowers/specs/2026-09-15-licensehunter-genlayer-design.md`, section 7 (agent) and section 10 (agent tests).

**Depends on Plan 1:**
- `deploy/studio-next.ts` (Plan 1 Task 2)
- `LICENSE_HUNTER_ADDRESS` and `AGENT_PRIVATE_KEY` in `.env.local`
- Contract views `list_works() -> list` and `list_claims(work_id: int) -> list`, and write `file_claim(work_id: int, page_url: str, image_url: str) -> int`. Rows use the snake_case keys from `work_to_dict` and `claim_to_dict`.

## Global Constraints

- **Network:** Studio Next, RPC `https://studio-next.genlayer.com/api`, chain ID `61997`, explorer `https://explorer-studio-dev.genlayer.com/`.
- **SDK version:** `genlayer-js` stays at exactly `2.0.0-rc.1` everywhere it is listed.
- **Agent limits (spec section 7):**
  - 10-second timeout per request
  - 5 MB maximum per image
  - at most 5 claims per run
  - at most 50 images per page
  - a 64-bit difference hash, with a match when the Hamming distance is **≤ 10**
- **URLs:**
  - Only public `https://` URLs are fetched. Localhost, private, link-local, and credential-bearing URLs are refused.
  - `ipfs://CID/path` becomes `https://ipfs.io/ipfs/CID/path`.
  - A run id is appended as the query parameter `run=<runId>`, keeping any existing query.
- **Claim key:** `"<workId>|<pageUrl>|<imageUrl>"`, identical to the contract's `claim_key`.
- **Waiting:**
  - The scheduled scan waits for each claim's validator decision before submitting the next.
  - "Scan now" in the web app submits without waiting (Plan 3).
- **Secrets:** `AGENT_PRIVATE_KEY` comes only from the environment (`.env.local` locally, a GitHub secret in Actions) and is never logged.
- **Web search mode (Task 9):** built last, and only if the controller's time check allows. No Google Cloud Vision key exists yet.
- **Git:**
  - Work on branch `feat/genlayer-rebuild`, commit locally after each task, and do not push.
  - Commit messages end with the line `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Deadline:** submissions close 2026-09-17 21:01 IST.
- **Shell:** Git Bash on Windows, run from the repo root `D:/GenlayerProject`.

## Measured Hash Distances (sharp 0.35.4, 640×480 synthetic artwork, 2026-09-15)

identical 0 · resized to 50% 1 · JPEG quality 60 1 · brightness +15% 1 · 5% crop on each side 7 · 10% crop on each side 16 · resized onto a padded banner 16 · unrelated images 23 and 36. The tests below assert these as ranges.

## File Structure

| Path | Responsibility | Task |
|---|---|---|
| `agent/package.json`, `agent/tsconfig.json`, `agent/vitest.config.ts` | Workspace package setup | 1 |
| `agent/src/types.ts` | Shared types and the `LicenseHunterClient` interface | 1 |
| `agent/src/genlayer.ts` | Studio Next client helpers (moved from `deploy/studio-next.ts`) | 1, 8 |
| `deploy/studio-next.ts` | Env file helpers, plus a re-export of `agent/src/genlayer.ts` | 1 |
| `agent/src/urls.ts` | URL safety, resolution, IPFS rewrite, run id | 2 |
| `agent/src/html.ts` | Image URL extraction from HTML | 3 |
| `agent/src/phash.ts` | Difference hash and Hamming distance | 4 |
| `agent/test/images.ts` | Synthetic test images | 4 |
| `agent/src/http.ts` | Fetch with timeout, size cap, URL safety | 5 |
| `agent/src/candidates.ts` | Per-work discovery of matching images | 6 |
| `agent/src/scan.ts` | Scan policy: dedupe, per-run cap, filing | 7 |
| `agent/src/contract.ts` | LicenseHunter adapter over `genlayer.ts` | 8 |
| `agent/src/index.ts`, `agent/src/cli.ts` | Package exports and CLI | 8 |
| `.github/workflows/agent-scan.yml` | 30-minute schedule | 8 |
| `.github/workflows/ci.yml`, `package.json` | Agent CI job, workspace, `scan` script | 1, 8 |
| `agent/src/websearch.ts` | Optional Cloud Vision web detection | 9 |

---

### Task 1: Agent package scaffold and shared GenLayer helpers

**Files:**
- Create: `agent/package.json`, `agent/tsconfig.json`, `agent/vitest.config.ts`, `agent/src/types.ts`, `agent/src/genlayer.ts`, `agent/test/genlayer.test.ts`
- Modify: `deploy/studio-next.ts`, `package.json` (root), `.github/workflows/ci.yml`, `package-lock.json`

**Interfaces:**
- Consumes: every export of `deploy/studio-next.ts` from Plan 1.
- Produces:
  - `agent/src/genlayer.ts` exports everything `deploy/studio-next.ts` exported except `ENV_FILE`, `loadEnv`, `upsertEnv`, `requireEnv`. That includes `clientFor`, `StudioClient`, `Hex`, `LIGHT_FEES`, `HEAVY_FEES`, `FeePreset`, `quoteFees`, `quoteMessageFees`, `json`, `describeTx`, `txLink`, `addressLink`, `waitDecided`, `deploy`, `write`, `read`, `toPlain`, `createAccount`, and `generatePrivateKey`.
  - `deploy/studio-next.ts` keeps the four env exports and re-exports the rest, so Plan 1 scripts keep working unchanged.
  - `agent/src/types.ts` exports:
    - `FetchLike = (url: string, init?: RequestInit) => Promise<Response>`
    - `Work { id: number; creator: string; title: string; imageUrl: string; watchUrls: string[] }`
    - `Claim { id: number; workId: number; pageUrl: string; imageUrl: string; status: string }`
    - `Candidate { workId: number; pageUrl: string; imageUrl: string; distance: number }`
    - `FileClaimResult { txHash: string; ok: boolean | null }`
    - `FiledClaim = Candidate & FileClaimResult`
    - `ScanSummary { worksScanned: number; candidates: Candidate[]; filed: FiledClaim[]; skipped: Candidate[]; errors: string[] }`
    - `interface LicenseHunterClient { listWorks(): Promise<Work[]>; listClaims(workId: number): Promise<Claim[]>; fileClaim(workId: number, pageUrl: string, imageUrl: string, options: { wait: boolean }): Promise<FileClaimResult> }`

- [ ] **Step 1: Create the package manifest and configs**

`agent/package.json`:

```json
{
  "name": "@licensehunter/agent",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./genlayer": "./src/genlayer.ts",
    "./phash": "./src/phash.ts"
  },
  "scripts": {
    "scan": "tsx src/cli.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "cheerio": "1.2.0",
    "genlayer-js": "2.0.0-rc.1",
    "sharp": "0.35.4"
  },
  "devDependencies": {
    "@types/node": "^24.9.1",
    "tsx": "^4.23.13",
    "typescript": "^5.9.3",
    "vitest": "^4.1.8"
  }
}
```

`agent/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "types": ["node"]
  },
  "include": ["src", "test", "vitest.config.ts"]
}
```

`agent/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
```

In the root `package.json`, change `"workspaces": ["frontend"]` to `"workspaces": ["frontend", "agent"]`, and add `"scan": "npm run scan --workspace agent"` to `scripts`.

- [ ] **Step 2: Install**

```bash
npm install --no-audit --no-fund
```

Expected: completes without errors, and `package-lock.json` gains `agent` entries.

- [ ] **Step 3: Write `agent/src/types.ts`**

```ts
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type Work = {
  id: number;
  creator: string;
  title: string;
  imageUrl: string;
  watchUrls: string[];
};

export type Claim = {
  id: number;
  workId: number;
  pageUrl: string;
  imageUrl: string;
  status: string;
};

export type Candidate = {
  workId: number;
  pageUrl: string;
  imageUrl: string;
  distance: number;
};

export type FileClaimResult = {
  txHash: string;
  /** null when the claim was submitted without waiting for validators */
  ok: boolean | null;
};

export type FiledClaim = Candidate & FileClaimResult;

export type ScanSummary = {
  worksScanned: number;
  candidates: Candidate[];
  filed: FiledClaim[];
  skipped: Candidate[];
  errors: string[];
};

export interface LicenseHunterClient {
  listWorks(): Promise<Work[]>;
  listClaims(workId: number): Promise<Claim[]>;
  fileClaim(workId: number, pageUrl: string, imageUrl: string, options: { wait: boolean }): Promise<FileClaimResult>;
}
```

- [ ] **Step 4: Write the failing test `agent/test/genlayer.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import { addressLink, toPlain, txLink } from "../src/genlayer";

describe("toPlain", () => {
  it("turns nested Maps from readContract into plain objects", () => {
    const row = new Map<string, unknown>([
      ["id", 1n],
      ["watch_urls", ["https://shop.example.com/p"]],
      ["meta", new Map([["ok", true]])],
    ]);
    expect(toPlain(row)).toEqual({ id: 1n, watch_urls: ["https://shop.example.com/p"], meta: { ok: true } });
  });

  it("maps lists of rows", () => {
    expect(toPlain([new Map([["id", 2n]])])).toEqual([{ id: 2n }]);
  });
});

describe("explorer links", () => {
  it("point at the Studio Next explorer", () => {
    expect(txLink("0xabc")).toBe("https://explorer-studio-dev.genlayer.com/tx/0xabc");
    expect(addressLink("0xdef")).toBe("https://explorer-studio-dev.genlayer.com/address/0xdef");
  });
});
```

If `docs/platform-checks.md` records different working explorer link formats, assert those instead.

Run: `npm test --workspace agent`
Expected: FAIL with a module-not-found error for `../src/genlayer`.

- [ ] **Step 5: Move the helpers**

1. Create `agent/src/genlayer.ts` containing every line of `deploy/studio-next.ts` **except**:
   - the `ENV_FILE` constant and the `loadEnv`, `upsertEnv`, and `requireEnv` functions
   - `existsSync` and `writeFileSync` in the `node:fs` import (keep `readFileSync`, which `deploy` uses)
2. Replace the whole of `deploy/studio-next.ts` with:

```ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export * from "../agent/src/genlayer";

export const ENV_FILE = ".env.local";

export function loadEnv(): void {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
}

export function upsertEnv(key: string, value: string): void {
  const kept = existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, "utf8")
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith(`${key}=`))
    : [];
  kept.push(`${key}=${value}`);
  writeFileSync(ENV_FILE, `${kept.join("\n")}\n`);
  process.env[key] = value;
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key} in ${ENV_FILE}. Run "npm run accounts" first.`);
  return value;
}
```

If Plan 1 changed the bodies of these three env functions, keep Plan 1's versions rather than the text above.

- [ ] **Step 6: Verify the move**

```bash
npm test --workspace agent
npm run typecheck --workspace agent
npm run smoke
```

Expected: 3 tests pass; `tsc` prints nothing; `npm run smoke` still prints `smoke ok` against the Plan 1 deployment.

- [ ] **Step 7: Add the agent CI job**

Append this job under `jobs:` in `.github/workflows/ci.yml`, at the same indentation as the existing jobs:

```yaml
  agent:
    name: Agent Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci --no-audit --no-fund
      - run: npm run typecheck --workspace agent
      - run: npm test --workspace agent
```

- [ ] **Step 8: Commit**

```bash
git add agent package.json package-lock.json deploy/studio-next.ts .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
feat(agent): scaffold agent package and share Studio Next helpers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: URL rules

**Files:**
- Create: `agent/src/urls.ts`, `agent/test/urls.test.ts`

**Interfaces:**
- Produces: `isSafeHttpsUrl(raw: string): boolean`, `toHttps(url: string): string`, `resolveUrl(base: string, reference: string): string | null`, `withRunId(url: string, runId?: string): string`.

- [ ] **Step 1: Write the failing test `agent/test/urls.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import { isSafeHttpsUrl, resolveUrl, toHttps, withRunId } from "../src/urls";

describe("isSafeHttpsUrl", () => {
  it.each([
    "https://shop.example.com/products/hoodie",
    "https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  ])("accepts %s", (url) => {
    expect(isSafeHttpsUrl(url)).toBe(true);
  });

  it.each([
    "http://shop.example.com/page",
    "ftp://files.example.com/a.png",
    "https://localhost/admin",
    "https://127.0.0.1/",
    "https://10.1.2.3/",
    "https://172.20.0.5/",
    "https://192.168.1.10/",
    "https://169.254.169.254/latest/meta-data",
    "https://0.0.0.0/",
    "https://[::1]/",
    "https://[fd12:3456::1]/",
    "https://user:secret@example.com/",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isSafeHttpsUrl(url)).toBe(false);
  });
});

describe("toHttps", () => {
  it("rewrites ipfs links to the ipfs.io gateway", () => {
    expect(toHttps("ipfs://bafyexample/art/cat.png")).toBe("https://ipfs.io/ipfs/bafyexample/art/cat.png");
    expect(toHttps("ipfs://ipfs/bafyexample")).toBe("https://ipfs.io/ipfs/bafyexample");
  });

  it("leaves other URLs unchanged", () => {
    expect(toHttps("https://a.example/x.png")).toBe("https://a.example/x.png");
  });
});

describe("resolveUrl", () => {
  const page = "https://shop.example.com/products/hoodie";

  it("resolves relative and root-relative references against the page", () => {
    expect(resolveUrl(page, "img/banner.png")).toBe("https://shop.example.com/products/img/banner.png");
    expect(resolveUrl(page, "/static/banner.png")).toBe("https://shop.example.com/static/banner.png");
  });

  it("keeps absolute URLs and rewrites ipfs references", () => {
    expect(resolveUrl(page, "https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(resolveUrl(page, "ipfs://bafyexample/a.png")).toBe("https://ipfs.io/ipfs/bafyexample/a.png");
  });

  it("skips empty references and inline data images", () => {
    expect(resolveUrl(page, "  ")).toBeNull();
    expect(resolveUrl(page, "data:image/png;base64,AAAA")).toBeNull();
  });
});

describe("withRunId", () => {
  it("adds a run parameter", () => {
    expect(withRunId("https://site.example/demo/shop", "abc123")).toBe("https://site.example/demo/shop?run=abc123");
  });

  it("keeps existing query parameters", () => {
    expect(withRunId("https://site.example/demo/shop?lang=en", "r1")).toBe("https://site.example/demo/shop?lang=en&run=r1");
  });

  it("returns the URL unchanged without a run id", () => {
    expect(withRunId("https://site.example/demo/shop")).toBe("https://site.example/demo/shop");
  });
});
```

Run: `npm test --workspace agent -- urls`
Expected: FAIL, cannot find module `../src/urls`.

- [ ] **Step 2: Write `agent/src/urls.ts`**

```ts
const PRIVATE_HOSTS = [
  /^localhost$/,
  /^0\./,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[::1?\]$/,
  /^\[f[cd][0-9a-f]{2}:/,
  /^\[fe80:/,
];

export function toHttps(url: string): string {
  if (!url.startsWith("ipfs://")) return url;
  return `https://ipfs.io/ipfs/${url.slice("ipfs://".length).replace(/^ipfs\//, "")}`;
}

export function isSafeHttpsUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  return !PRIVATE_HOSTS.some((pattern) => pattern.test(host));
}

export function resolveUrl(base: string, reference: string): string | null {
  const trimmed = reference.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  try {
    return new URL(toHttps(trimmed), base).toString();
  } catch {
    return null;
  }
}

export function withRunId(url: string, runId?: string): string {
  if (!runId) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("run", runId);
  return parsed.toString();
}
```

- [ ] **Step 3: Run the tests**

Run: `npm test --workspace agent`
Expected: `26 passed` (3 from Task 1 plus 23 in `urls.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add agent/src/urls.ts agent/test/urls.test.ts
git commit -m "$(cat <<'EOF'
feat(agent): add URL safety, resolution, IPFS, and run id rules

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Image URL extraction from HTML

**Files:**
- Create: `agent/src/html.ts`, `agent/test/html.test.ts`

**Interfaces:**
- Consumes: `resolveUrl` (Task 2).
- Produces: `MAX_IMAGES_PER_PAGE = 50`, `extractImageUrls(html: string, pageUrl: string, limit?: number): string[]`. Order: `og:image` and `twitter:image` meta tags, then each `<img>` (largest `srcset` candidate, then `src`), then `<source srcset>` elements. Output is absolute, de-duplicated, and capped.

- [ ] **Step 1: Write the failing test `agent/test/html.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import { extractImageUrls } from "../src/html";

const PAGE = "https://shop.example.com/products/hoodie";

describe("extractImageUrls", () => {
  it("collects meta images, img src, and the largest srcset candidates", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://cdn.example.com/og.png">
        <meta name="twitter:image" content="/static/twitter.png">
      </head><body>
        <img src="/img/hero-small.png" srcset="/img/hero-400.png 400w, /img/hero-1200.png 1200w">
        <img src="thumbs/cat.jpg">
        <picture><source srcset="/img/pic-1x.webp 1x, /img/pic-2x.webp 2x"><img src="/img/pic.png"></picture>
      </body></html>`;

    expect(extractImageUrls(html, PAGE)).toEqual([
      "https://cdn.example.com/og.png",
      "https://shop.example.com/static/twitter.png",
      "https://shop.example.com/img/hero-1200.png",
      "https://shop.example.com/img/hero-small.png",
      "https://shop.example.com/products/thumbs/cat.jpg",
      "https://shop.example.com/img/pic.png",
      "https://shop.example.com/img/pic-2x.webp",
    ]);
  });

  it("removes duplicates and inline data images", () => {
    const html = `<img src="/a.png"><img src="/a.png"><img src="data:image/png;base64,AAAA">`;
    expect(extractImageUrls(html, PAGE)).toEqual(["https://shop.example.com/a.png"]);
  });

  it("rewrites ipfs images", () => {
    expect(extractImageUrls(`<img src="ipfs://bafyexample/art.png">`, PAGE)).toEqual([
      "https://ipfs.io/ipfs/bafyexample/art.png",
    ]);
  });

  it("caps the number of images per page", () => {
    const html = Array.from({ length: 60 }, (_, i) => `<img src="/img/${i}.png">`).join("");
    const urls = extractImageUrls(html, PAGE);
    expect(urls).toHaveLength(50);
    expect(urls[0]).toBe("https://shop.example.com/img/0.png");
  });

  it("returns nothing for a page without images", () => {
    expect(extractImageUrls("<p>No pictures here</p>", PAGE)).toEqual([]);
  });
});
```

Run: `npm test --workspace agent -- html`
Expected: FAIL, cannot find module `../src/html`.

- [ ] **Step 2: Write `agent/src/html.ts`**

```ts
import { load } from "cheerio";

import { resolveUrl } from "./urls";

export const MAX_IMAGES_PER_PAGE = 50;

const META_IMAGE_SELECTOR = [
  'meta[property="og:image"]',
  'meta[name="og:image"]',
  'meta[name="twitter:image"]',
  'meta[property="twitter:image"]',
].join(", ");

function largestSrcsetCandidate(srcset: string | undefined): string | undefined {
  if (!srcset) return undefined;
  let best: { url: string; size: number } | undefined;
  for (const entry of srcset.split(",")) {
    const [url, descriptor = "1x"] = entry.trim().split(/\s+/);
    if (!url) continue;
    const size = Number.parseFloat(descriptor) || 1;
    if (!best || size > best.size) best = { url, size };
  }
  return best?.url;
}

export function extractImageUrls(html: string, pageUrl: string, limit = MAX_IMAGES_PER_PAGE): string[] {
  const $ = load(html);
  const found: string[] = [];
  const add = (reference: string | undefined) => {
    if (!reference) return;
    const resolved = resolveUrl(pageUrl, reference);
    if (resolved && !found.includes(resolved)) found.push(resolved);
  };

  $(META_IMAGE_SELECTOR).each((_, element) => add($(element).attr("content")));
  $("img").each((_, element) => {
    add(largestSrcsetCandidate($(element).attr("srcset")));
    add($(element).attr("src"));
  });
  $("source[srcset]").each((_, element) => add(largestSrcsetCandidate($(element).attr("srcset"))));

  return found.slice(0, limit);
}
```

- [ ] **Step 3: Run the tests**

Run: `npm test --workspace agent`
Expected: `31 passed` (26 earlier plus 5 in `html.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add agent/src/html.ts agent/test/html.test.ts
git commit -m "$(cat <<'EOF'
feat(agent): extract candidate image URLs from watched pages

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Difference hash

**Files:**
- Create: `agent/src/phash.ts`, `agent/test/images.ts`, `agent/test/phash.test.ts`

**Interfaces:**
- Produces:
  - `MATCH_THRESHOLD = 10`
  - `differenceHash(image: Uint8Array): Promise<bigint>`: flatten on white, grayscale, resize to 9×8, one bit per horizontal neighbour pair
  - `hammingDistance(a: bigint, b: bigint): number`
  - `isMatch(distance: number, threshold?: number): boolean` (true when `distance <= threshold`)
- Produces for tests (`agent/test/images.ts`): `scene(kind: "artwork" | "stripes" | "shapes", width?: number, height?: number): Promise<Buffer>`, `resize(image, width, height)`, `recompress(image, quality)`, `cropEachSide(image, fraction)`.

- [ ] **Step 1: Write the test image helpers `agent/test/images.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing test `agent/test/phash.test.ts`**

```ts
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
```

Run: `npm test --workspace agent -- phash`
Expected: FAIL, cannot find module `../src/phash`.

- [ ] **Step 3: Write `agent/src/phash.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests**

Run: `npm test --workspace agent`
Expected: `36 passed` (31 earlier plus 5 in `phash.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add agent/src/phash.ts agent/test/images.ts agent/test/phash.test.ts
git commit -m "$(cat <<'EOF'
feat(agent): add 64-bit difference hash for matching copies

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: HTTP fetching with limits

**Files:**
- Create: `agent/src/http.ts`, `agent/test/http.test.ts`

**Interfaces:**
- Consumes: `isSafeHttpsUrl` (Task 2), `FetchLike` (Task 1).
- Produces: `FETCH_TIMEOUT_MS = 10_000`, `MAX_IMAGE_BYTES = 5_000_000`, `MAX_PAGE_BYTES = 2_000_000`, `class FetchError extends Error`, `fetchText(url: string, fetchFn?: FetchLike): Promise<string>`, `fetchImage(url: string, fetchFn?: FetchLike): Promise<Uint8Array>`.
- Error messages later tasks rely on:
  - `Refusing to fetch <url>: only public https URLs are allowed`
  - `Could not load <url>: <cause>`
  - `<url> returned <status>`
  - `<url> is larger than <max> bytes`

- [ ] **Step 1: Write the failing test `agent/test/http.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";

import { FetchError, MAX_IMAGE_BYTES, fetchImage, fetchText } from "../src/http";

function fakeFetch(body: BodyInit | null, init: ResponseInit = {}) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, init));
}

describe("fetchText", () => {
  it("returns the page body", async () => {
    await expect(fetchText("https://shop.example.com/p", fakeFetch("<p>hi</p>"))).resolves.toBe("<p>hi</p>");
  });

  it("sends a timeout signal and a user agent", async () => {
    const fetchFn = fakeFetch("ok");
    await fetchText("https://shop.example.com/p", fetchFn);
    const init = fetchFn.mock.calls[0][1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).get("user-agent")).toContain("LicenseHunterAgent");
  });

  it("refuses unsafe URLs without calling fetch", async () => {
    const fetchFn = fakeFetch("ok");
    await expect(fetchText("http://shop.example.com/p", fetchFn)).rejects.toThrow(FetchError);
    await expect(fetchText("https://192.168.0.1/p", fetchFn)).rejects.toThrow("only public https URLs are allowed");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("reports HTTP errors", async () => {
    await expect(fetchText("https://shop.example.com/missing", fakeFetch("nope", { status: 404 }))).rejects.toThrow(
      "https://shop.example.com/missing returned 404",
    );
  });

  it("wraps network failures", async () => {
    const failing = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
      throw new TypeError("fetch failed");
    });
    await expect(fetchText("https://shop.example.com/p", failing)).rejects.toThrow(
      "Could not load https://shop.example.com/p: fetch failed",
    );
  });
});

describe("fetchImage", () => {
  it("returns the image bytes", async () => {
    const bytes = await fetchImage("https://cdn.example.com/a.png", fakeFetch(new Uint8Array([1, 2, 3])));
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("rejects a declared size over the cap", async () => {
    const fetchFn = fakeFetch("x", { headers: { "content-length": String(MAX_IMAGE_BYTES + 1) } });
    await expect(fetchImage("https://cdn.example.com/big.png", fetchFn)).rejects.toThrow("larger than 5000000 bytes");
  });

  it("rejects an undeclared body over the cap", async () => {
    const fetchFn = fakeFetch(new Uint8Array(MAX_IMAGE_BYTES + 1));
    await expect(fetchImage("https://cdn.example.com/big.png", fetchFn)).rejects.toThrow("larger than 5000000 bytes");
  });
});
```

Run: `npm test --workspace agent -- http`
Expected: FAIL, cannot find module `../src/http`.

- [ ] **Step 2: Write `agent/src/http.ts`**

```ts
import type { FetchLike } from "./types";
import { isSafeHttpsUrl } from "./urls";

export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_IMAGE_BYTES = 5_000_000;
export const MAX_PAGE_BYTES = 2_000_000;

const USER_AGENT = "LicenseHunterAgent/0.1 (+https://github.com/psycho24eth)";

export class FetchError extends Error {}

async function request(url: string, fetchFn: FetchLike): Promise<Response> {
  if (!isSafeHttpsUrl(url)) {
    throw new FetchError(`Refusing to fetch ${url}: only public https URLs are allowed`);
  }
  let response: Response;
  try {
    response = await fetchFn(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT },
    });
  } catch (error) {
    throw new FetchError(`Could not load ${url}: ${(error as Error).message}`);
  }
  if (!response.ok) throw new FetchError(`${url} returned ${response.status}`);
  if (response.url && response.url !== url && !isSafeHttpsUrl(response.url)) {
    throw new FetchError(`${url} redirected to a disallowed address`);
  }
  return response;
}

async function readLimited(response: Response, maxBytes: number, url: string): Promise<Uint8Array> {
  const tooLarge = () => new FetchError(`${url} is larger than ${maxBytes} bytes`);
  if (Number(response.headers.get("content-length") ?? "0") > maxBytes) throw tooLarge();
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function fetchText(url: string, fetchFn: FetchLike = fetch): Promise<string> {
  const response = await request(url, fetchFn);
  return new TextDecoder().decode(await readLimited(response, MAX_PAGE_BYTES, url));
}

export async function fetchImage(url: string, fetchFn: FetchLike = fetch): Promise<Uint8Array> {
  const response = await request(url, fetchFn);
  return readLimited(response, MAX_IMAGE_BYTES, url);
}
```

- [ ] **Step 3: Run the tests**

Run: `npm test --workspace agent`
Expected: `44 passed` (36 earlier plus 8 in `http.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add agent/src/http.ts agent/test/http.test.ts
git commit -m "$(cat <<'EOF'
feat(agent): fetch pages and images with timeouts, size caps, and URL safety

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Candidate discovery for one work

**Files:**
- Create: `agent/src/candidates.ts`, `agent/test/candidates.test.ts`

**Interfaces:**
- Consumes: `extractImageUrls` (Task 3), `differenceHash`, `hammingDistance`, `MATCH_THRESHOLD` (Task 4), `fetchImage`, `fetchText` (Task 5), `toHttps`, `withRunId` (Task 2), `Work`, `Candidate`, `FetchLike` (Task 1).
- Produces:
  - `type DiscoveryOptions = { fetchFn?: FetchLike; runId?: string; threshold?: number }`
  - `type DiscoveryResult = { candidates: Candidate[]; errors: string[] }`
  - `findCandidates(work: Work, options?: DiscoveryOptions): Promise<DiscoveryResult>`
- Errors are strings prefixed `work <id>: `. A failed reference image is reported as `work <id>: reference image: <message>` and ends discovery for that work.

- [ ] **Step 1: Write the failing test `agent/test/candidates.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import { findCandidates } from "../src/candidates";
import type { FetchLike, Work } from "../src/types";
import { cropEachSide, resize, scene } from "./images";

function routes(table: Record<string, () => Response>): FetchLike {
  return async (url) => (table[url] ? table[url]() : new Response("not found", { status: 404 }));
}

const WORK: Work = {
  id: 1,
  creator: "0x0000000000000000000000000000000000000001",
  title: "Cybernetic Horizon",
  imageUrl: "https://art.example.com/original.png",
  watchUrls: ["https://shop.example.com/products/hoodie", "https://blog.example.com/post"],
};

describe("findCandidates", () => {
  it("finds an edited copy on a watched page and ignores unrelated images", async () => {
    const original = await scene("artwork");
    const copy = await resize(await cropEachSide(original, 0.05), 480, 360);
    const unrelated = await scene("stripes");
    const fetchFn = routes({
      "https://art.example.com/original.png": () => new Response(original),
      "https://shop.example.com/products/hoodie": () => new Response(`<img src="/banner.png"><img src="/logo.png">`),
      "https://shop.example.com/banner.png": () => new Response(copy),
      "https://shop.example.com/logo.png": () => new Response(unrelated),
      "https://blog.example.com/post": () => new Response("<p>no images</p>"),
    });

    const result = await findCandidates(WORK, { fetchFn });

    expect(result.errors).toEqual([]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      workId: 1,
      pageUrl: "https://shop.example.com/products/hoodie",
      imageUrl: "https://shop.example.com/banner.png",
    });
    expect(result.candidates[0].distance).toBeLessThanOrEqual(10);
  });

  it("adds the run id to watched page URLs", async () => {
    const original = await scene("artwork");
    const fetchFn = routes({
      "https://art.example.com/original.png": () => new Response(original),
      "https://shop.example.com/products/hoodie?run=r42": () => new Response(`<img src="https://cdn.example.com/copy.png">`),
      "https://cdn.example.com/copy.png": () => new Response(original),
      "https://blog.example.com/post?run=r42": () => new Response(""),
    });

    const result = await findCandidates(WORK, { fetchFn, runId: "r42" });

    expect(result.candidates.map((candidate) => candidate.pageUrl)).toEqual([
      "https://shop.example.com/products/hoodie?run=r42",
    ]);
  });

  it("keeps scanning after a page or an image fails", async () => {
    const original = await scene("artwork");
    const fetchFn = routes({
      "https://art.example.com/original.png": () => new Response(original),
      "https://shop.example.com/products/hoodie": () => new Response(`<img src="/broken.png"><img src="/copy.png">`),
      "https://shop.example.com/copy.png": () => new Response(original),
    });

    const result = await findCandidates(WORK, { fetchFn });

    expect(result.candidates.map((candidate) => candidate.imageUrl)).toEqual(["https://shop.example.com/copy.png"]);
    expect(result.errors).toEqual([
      "work 1: https://shop.example.com/broken.png returned 404",
      "work 1: https://blog.example.com/post returned 404",
    ]);
  });

  it("reports an unreachable reference image and stops", async () => {
    const result = await findCandidates(WORK, { fetchFn: routes({}) });

    expect(result.candidates).toEqual([]);
    expect(result.errors).toEqual(["work 1: reference image: https://art.example.com/original.png returned 404"]);
  });
});
```

Run: `npm test --workspace agent -- candidates`
Expected: FAIL, cannot find module `../src/candidates`.

- [ ] **Step 2: Write `agent/src/candidates.ts`**

```ts
import { extractImageUrls } from "./html";
import { fetchImage, fetchText } from "./http";
import { differenceHash, hammingDistance, MATCH_THRESHOLD } from "./phash";
import type { Candidate, FetchLike, Work } from "./types";
import { toHttps, withRunId } from "./urls";

export type DiscoveryOptions = { fetchFn?: FetchLike; runId?: string; threshold?: number };
export type DiscoveryResult = { candidates: Candidate[]; errors: string[] };

export async function findCandidates(work: Work, options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const threshold = options.threshold ?? MATCH_THRESHOLD;
  const candidates: Candidate[] = [];
  const errors: string[] = [];
  const fail = (message: string) => errors.push(`work ${work.id}: ${message}`);

  let referenceHash: bigint;
  try {
    referenceHash = await differenceHash(await fetchImage(toHttps(work.imageUrl), fetchFn));
  } catch (error) {
    fail(`reference image: ${(error as Error).message}`);
    return { candidates, errors };
  }

  const checkImage = async (pageUrl: string, imageUrl: string) => {
    try {
      const distance = hammingDistance(referenceHash, await differenceHash(await fetchImage(imageUrl, fetchFn)));
      if (distance <= threshold) candidates.push({ workId: work.id, pageUrl, imageUrl, distance });
    } catch (error) {
      fail((error as Error).message);
    }
  };

  for (const watchUrl of work.watchUrls) {
    const pageUrl = withRunId(toHttps(watchUrl), options.runId);
    let imageUrls: string[];
    try {
      imageUrls = extractImageUrls(await fetchText(pageUrl, fetchFn), pageUrl);
    } catch (error) {
      fail((error as Error).message);
      continue;
    }
    for (const imageUrl of imageUrls) {
      await checkImage(pageUrl, imageUrl);
    }
  }

  return { candidates, errors };
}
```

- [ ] **Step 3: Run the tests**

Run: `npm test --workspace agent`
Expected: `48 passed` (44 earlier plus 4 in `candidates.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add agent/src/candidates.ts agent/test/candidates.test.ts
git commit -m "$(cat <<'EOF'
feat(agent): discover matching images on a work's watched pages

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Scan policy

**Files:**
- Create: `agent/src/scan.ts`, `agent/test/scan.test.ts`

**Interfaces:**
- Consumes: `findCandidates`, `DiscoveryOptions` (Task 6); `LicenseHunterClient`, `ScanSummary`, `FiledClaim` (Task 1).
- Produces:
  - `MAX_CLAIMS_PER_RUN = 5`
  - `claimKey(workId: number, pageUrl: string, imageUrl: string): string`
  - `type ScanOptions = DiscoveryOptions & { maxClaims?: number; wait?: boolean; workIds?: number[] }`
  - `runScan(client: LicenseHunterClient, options?: ScanOptions): Promise<ScanSummary>`
- Behavior:
  - Works are scanned in the order `listWorks` returns them.
  - A candidate whose key already exists (on-chain, or filed earlier in this run), or that arrives after the cap is reached, goes to `skipped`.
  - A filing error is recorded as `work <id>: filing <imageUrl>: <message>` and the scan continues.
  - `wait` defaults to `true`.

- [ ] **Step 1: Write the failing test `agent/test/scan.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import { MAX_CLAIMS_PER_RUN, runScan } from "../src/scan";
import type { Claim, FetchLike, LicenseHunterClient, Work } from "../src/types";
import { scene } from "./images";

const ART = "https://art.example.com/original.png";
const PAGE = "https://shop.example.com/products/hoodie";

const work = (id: number): Work => ({
  id,
  creator: "0x0000000000000000000000000000000000000001",
  title: `Work ${id}`,
  imageUrl: ART,
  watchUrls: [PAGE],
});

function fakeClient(works: Work[], claims: Claim[] = [], failOnImage?: string) {
  const filed: Array<{ workId: number; pageUrl: string; imageUrl: string; wait: boolean }> = [];
  const client: LicenseHunterClient = {
    listWorks: async () => works,
    listClaims: async (workId) => claims.filter((claim) => claim.workId === workId),
    fileClaim: async (workId, pageUrl, imageUrl, { wait }) => {
      if (imageUrl === failOnImage) throw new Error("validators could not agree");
      filed.push({ workId, pageUrl, imageUrl, wait });
      return { txHash: `0xtx${filed.length}`, ok: wait ? true : null };
    },
  };
  return { client, filed };
}

async function pageWithCopies(count: number): Promise<FetchLike> {
  const original = await scene("artwork");
  const html = Array.from({ length: count }, (_, i) => `<img src="/copy-${i}.png">`).join("");
  return async (url) => {
    if (url === ART || /\/copy-\d+\.png$/.test(url)) return new Response(original);
    if (url === PAGE) return new Response(html);
    return new Response("not found", { status: 404 });
  };
}

describe("runScan", () => {
  it("files a claim for each new candidate and waits for decisions by default", async () => {
    const { client, filed } = fakeClient([work(1)]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(2) });

    expect(summary.worksScanned).toBe(1);
    expect(filed).toEqual([
      { workId: 1, pageUrl: PAGE, imageUrl: "https://shop.example.com/copy-0.png", wait: true },
      { workId: 1, pageUrl: PAGE, imageUrl: "https://shop.example.com/copy-1.png", wait: true },
    ]);
    expect(summary.filed.map((claim) => [claim.txHash, claim.ok])).toEqual([
      ["0xtx1", true],
      ["0xtx2", true],
    ]);
    expect(summary.errors).toEqual([]);
  });

  it("skips candidates that already have a claim", async () => {
    const existing: Claim = {
      id: 9,
      workId: 1,
      pageUrl: PAGE,
      imageUrl: "https://shop.example.com/copy-0.png",
      status: "NOTICE_ISSUED",
    };
    const { client, filed } = fakeClient([work(1)], [existing]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(2) });

    expect(filed.map((claim) => claim.imageUrl)).toEqual(["https://shop.example.com/copy-1.png"]);
    expect(summary.skipped.map((candidate) => candidate.imageUrl)).toEqual(["https://shop.example.com/copy-0.png"]);
  });

  it("files at most five claims per run", async () => {
    const { client, filed } = fakeClient([work(1), work(2)]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(4) });

    expect(MAX_CLAIMS_PER_RUN).toBe(5);
    expect(summary.candidates).toHaveLength(8);
    expect(filed).toHaveLength(5);
    expect(summary.skipped).toHaveLength(3);
  });

  it("submits without waiting when asked", async () => {
    const { client, filed } = fakeClient([work(1)]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(1), wait: false });

    expect(filed[0].wait).toBe(false);
    expect(summary.filed[0].ok).toBeNull();
  });

  it("records a failed filing and keeps going", async () => {
    const { client, filed } = fakeClient([work(1)], [], "https://shop.example.com/copy-0.png");

    const summary = await runScan(client, { fetchFn: await pageWithCopies(2) });

    expect(filed.map((claim) => claim.imageUrl)).toEqual(["https://shop.example.com/copy-1.png"]);
    expect(summary.errors).toEqual([
      "work 1: filing https://shop.example.com/copy-0.png: validators could not agree",
    ]);
  });

  it("scans only the requested works", async () => {
    const { client, filed } = fakeClient([work(1), work(2)]);

    const summary = await runScan(client, { fetchFn: await pageWithCopies(1), workIds: [2] });

    expect(summary.worksScanned).toBe(1);
    expect(filed.map((claim) => claim.workId)).toEqual([2]);
  });
});
```

Run: `npm test --workspace agent -- scan`
Expected: FAIL, cannot find module `../src/scan`.

- [ ] **Step 2: Write `agent/src/scan.ts`**

```ts
import { findCandidates, type DiscoveryOptions } from "./candidates";
import type { LicenseHunterClient, ScanSummary } from "./types";

export const MAX_CLAIMS_PER_RUN = 5;

export type ScanOptions = DiscoveryOptions & { maxClaims?: number; wait?: boolean; workIds?: number[] };

export function claimKey(workId: number, pageUrl: string, imageUrl: string): string {
  return `${workId}|${pageUrl}|${imageUrl}`;
}

export async function runScan(client: LicenseHunterClient, options: ScanOptions = {}): Promise<ScanSummary> {
  const maxClaims = options.maxClaims ?? MAX_CLAIMS_PER_RUN;
  const wait = options.wait ?? true;
  const summary: ScanSummary = { worksScanned: 0, candidates: [], filed: [], skipped: [], errors: [] };

  const works = (await client.listWorks()).filter((work) => !options.workIds || options.workIds.includes(work.id));
  for (const work of works) {
    summary.worksScanned += 1;
    const known = new Set(
      (await client.listClaims(work.id)).map((claim) => claimKey(claim.workId, claim.pageUrl, claim.imageUrl)),
    );
    const { candidates, errors } = await findCandidates(work, options);
    summary.errors.push(...errors);

    for (const candidate of candidates) {
      summary.candidates.push(candidate);
      const key = claimKey(candidate.workId, candidate.pageUrl, candidate.imageUrl);
      if (known.has(key) || summary.filed.length >= maxClaims) {
        summary.skipped.push(candidate);
        continue;
      }
      known.add(key);
      try {
        const result = await client.fileClaim(candidate.workId, candidate.pageUrl, candidate.imageUrl, { wait });
        summary.filed.push({ ...candidate, ...result });
      } catch (error) {
        summary.errors.push(`work ${work.id}: filing ${candidate.imageUrl}: ${(error as Error).message}`);
      }
    }
  }

  return summary;
}
```

- [ ] **Step 3: Run the tests**

Run: `npm test --workspace agent`
Expected: `54 passed` (48 earlier plus 6 in `scan.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add agent/src/scan.ts agent/test/scan.test.ts
git commit -m "$(cat <<'EOF'
feat(agent): file new claims with duplicate skipping and a per-run cap

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Contract adapter, CLI, and scheduled scan

**Files:**
- Modify: `agent/src/genlayer.ts` (add `submitWrite`, make `write` use it)
- Create: `agent/src/contract.ts`, `agent/test/contract.test.ts`, `agent/src/index.ts`, `agent/src/cli.ts`, `.github/workflows/agent-scan.yml`

**Interfaces:**
- Consumes: `clientFor`, `read`, `waitDecided`, `HEAVY_FEES`, `LIGHT_FEES`, `quoteFees`, `json`, `Hex`, `StudioClient`, `FeePreset` (Task 1); `runScan` (Task 7).
- Produces:
  - `submitWrite(client: StudioClient, address: string, functionName: string, args: unknown[], options?: { value?: bigint; fees?: FeePreset; emitsMessages?: boolean }): Promise<Hex>` (`emitsMessages` sends the simulation-derived message allocations that payouts need; see `docs/platform-checks.md`)
  - `toWork(row: Record<string, unknown>): Work`
  - `toClaim(row: Record<string, unknown>): Claim`
  - `createLicenseHunterClient(options: { privateKey: Hex; address: string }): LicenseHunterClient`
  - The package entry `@licensehunter/agent` (`agent/src/index.ts`), which Plan 3's "Scan now" route imports

- [ ] **Step 1: Split submission from waiting in `agent/src/genlayer.ts`**

Add this function directly above `write`:

```ts
export async function submitWrite(
  client: StudioClient,
  address: string,
  functionName: string,
  args: unknown[],
  options: { value?: bigint; fees?: FeePreset; emitsMessages?: boolean } = {},
): Promise<Hex> {
  const preset = options.fees ?? LIGHT_FEES;
  const value = options.value ?? 0n;
  const fees = options.emitsMessages
    ? await quoteMessageFees(client, preset, { address, functionName, args, value })
    : await quoteFees(client, preset);
  return (await client.writeContract({
    address: address as Hex,
    functionName,
    args: args as never,
    value,
    fees: fees as never,
  })) as Hex;
}
```

Replace the body of `write` with:

```ts
  const hash = await submitWrite(client, address, functionName, args, options);
  const tx = await waitDecided(client, hash);
  return { hash, tx, ok: isSuccessful(tx) };
```

- [ ] **Step 2: Write the failing test `agent/test/contract.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import { toClaim, toWork } from "../src/contract";

describe("toWork", () => {
  it("maps a contract row to a Work", () => {
    const row = {
      id: 3n,
      creator: "0xAbC0000000000000000000000000000000000001",
      title: "Cybernetic Horizon",
      image_url: "https://art.example.com/a.png",
      watch_urls: ["https://shop.example.com/p"],
      base_price: 10n,
    };
    expect(toWork(row)).toEqual({
      id: 3,
      creator: "0xAbC0000000000000000000000000000000000001",
      title: "Cybernetic Horizon",
      imageUrl: "https://art.example.com/a.png",
      watchUrls: ["https://shop.example.com/p"],
    });
  });

  it("defaults to no watched URLs", () => {
    expect(toWork({ id: 1n, creator: "0x1", title: "t", image_url: "https://a.example/i.png" }).watchUrls).toEqual([]);
  });
});

describe("toClaim", () => {
  it("maps a contract row to a Claim", () => {
    const row = {
      id: 7n,
      work_id: 3n,
      page_url: "https://shop.example.com/p",
      image_url: "https://cdn.example.com/i.png",
      status: "NOTICE_ISSUED",
      fee: 45n,
    };
    expect(toClaim(row)).toEqual({
      id: 7,
      workId: 3,
      pageUrl: "https://shop.example.com/p",
      imageUrl: "https://cdn.example.com/i.png",
      status: "NOTICE_ISSUED",
    });
  });
});
```

Run: `npm test --workspace agent -- contract`
Expected: FAIL, cannot find module `../src/contract`.

- [ ] **Step 3: Write `agent/src/contract.ts`**

```ts
import { isSuccessful } from "genlayer-js";

import { clientFor, HEAVY_FEES, read, submitWrite, waitDecided, type Hex } from "./genlayer";
import type { Claim, LicenseHunterClient, Work } from "./types";

type Row = Record<string, unknown>;

export function toWork(row: Row): Work {
  return {
    id: Number(row.id),
    creator: String(row.creator),
    title: String(row.title),
    imageUrl: String(row.image_url),
    watchUrls: Array.isArray(row.watch_urls) ? row.watch_urls.map(String) : [],
  };
}

export function toClaim(row: Row): Claim {
  return {
    id: Number(row.id),
    workId: Number(row.work_id),
    pageUrl: String(row.page_url),
    imageUrl: String(row.image_url),
    status: String(row.status),
  };
}

export function createLicenseHunterClient(options: { privateKey: Hex; address: string }): LicenseHunterClient {
  const client = clientFor(options.privateKey);
  return {
    async listWorks() {
      return ((await read(client, options.address, "list_works")) as Row[]).map(toWork);
    },
    async listClaims(workId) {
      return ((await read(client, options.address, "list_claims", [workId])) as Row[]).map(toClaim);
    },
    async fileClaim(workId, pageUrl, imageUrl, { wait }) {
      const txHash = await submitWrite(client, options.address, "file_claim", [workId, pageUrl, imageUrl], {
        fees: HEAVY_FEES,
      });
      if (!wait) return { txHash, ok: null };
      return { txHash, ok: isSuccessful(await waitDecided(client, txHash)) };
    },
  };
}
```

- [ ] **Step 4: Write `agent/src/index.ts`**

```ts
export { findCandidates } from "./candidates";
export type { DiscoveryOptions, DiscoveryResult } from "./candidates";
export { createLicenseHunterClient, toClaim, toWork } from "./contract";
export { claimKey, MAX_CLAIMS_PER_RUN, runScan } from "./scan";
export type { ScanOptions } from "./scan";
export type * from "./types";
```

- [ ] **Step 5: Write `agent/src/cli.ts`**

```ts
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createLicenseHunterClient } from "./contract";
import { json, type Hex } from "./genlayer";
import { runScan } from "./scan";

const envFile = fileURLToPath(new URL("../../.env.local", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const privateKey = process.env.AGENT_PRIVATE_KEY;
const address = process.env.LICENSE_HUNTER_ADDRESS;
if (!privateKey || !address) {
  console.log("Agent not configured: set AGENT_PRIVATE_KEY and LICENSE_HUNTER_ADDRESS. Skipping scan.");
  process.exit(0);
}

const client = createLicenseHunterClient({ privateKey: privateKey as Hex, address });
const summary = await runScan(client, { wait: true });

console.log(json({ filed: summary.filed, skipped: summary.skipped.length, errors: summary.errors }));
console.log(
  `scanned ${summary.worksScanned} works, found ${summary.candidates.length} candidates, ` +
    `filed ${summary.filed.length} claims, ${summary.errors.length} errors`,
);
```

- [ ] **Step 6: Run the tests and type-check**

```bash
npm test --workspace agent
npm run typecheck --workspace agent
```

Expected: `57 passed` (54 earlier plus 3 in `contract.test.ts`); `tsc` prints nothing.

- [ ] **Step 7: Run the agent against the Plan 1 deployment**

```bash
npm run scan
npm run smoke
```

Expected:
- `npm run scan` ends with `scanned 0 works, found 0 candidates, filed 0 claims, 0 errors`, because no works are registered yet.
- `npm run smoke` still prints `smoke ok`, which confirms `write`/`read` still work after the refactor.

- [ ] **Step 8: Write `.github/workflows/agent-scan.yml`**

```yaml
name: Agent scan

on:
  schedule:
    - cron: "*/30 * * * *"
  workflow_dispatch: {}

permissions:
  contents: read

concurrency:
  group: agent-scan
  cancel-in-progress: false

jobs:
  scan:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    env:
      AGENT_PRIVATE_KEY: ${{ secrets.AGENT_PRIVATE_KEY }}
      LICENSE_HUNTER_ADDRESS: ${{ vars.LICENSE_HUNTER_ADDRESS }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci --no-audit --no-fund
      - run: npm run scan
```

Plan 4 sets the `AGENT_PRIVATE_KEY` secret and the `LICENSE_HUNTER_ADDRESS` variable once the GitHub repo exists. Until then, the workflow logs "Agent not configured" and exits successfully.

- [ ] **Step 9: Commit**

```bash
git add agent .github/workflows/agent-scan.yml
git commit -m "$(cat <<'EOF'
feat(agent): add contract adapter, CLI, and 30-minute scheduled scan

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9 (optional): Web search mode with Cloud Vision

The controller runs this task only if it starts before 2026-09-16 12:00 IST and Plans 3 and 4 are on schedule. Otherwise it records a ruling and skips it.

**Files:**
- Create: `agent/src/websearch.ts`, `agent/test/websearch.test.ts`
- Replace: `agent/src/candidates.ts`
- Modify: `agent/src/cli.ts`, `.github/workflows/agent-scan.yml`

**Interfaces:**
- Consumes: `FETCH_TIMEOUT_MS` (Task 5), `isSafeHttpsUrl` and `toHttps` (Task 2), the existing `findCandidates` behavior (Task 6).
- Produces:
  - `MAX_WEB_MATCHES = 10`
  - `type WebMatch = { pageUrl: string; imageUrls: string[] }`
  - `findWebMatches(imageUrl: string, apiKey: string, fetchFn?: FetchLike): Promise<WebMatch[]>`
  - `DiscoveryOptions` gains `visionApiKey?: string`. When it is set, each web match image is hash-checked exactly like a watchlist image. Page/image pairs already checked are not checked twice.

- [ ] **Step 1: Write the failing test `agent/test/websearch.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";

import { findCandidates } from "../src/candidates";
import type { FetchLike, Work } from "../src/types";
import { findWebMatches } from "../src/websearch";
import { scene } from "./images";

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate?key=test-key";

const visionPayload = {
  responses: [
    {
      webDetection: {
        pagesWithMatchingImages: [
          {
            url: "https://blog.example.net/post",
            fullMatchingImages: [{ url: "https://blog.example.net/img/art.png" }],
            partialMatchingImages: [{ url: "https://cdn.example.net/art-small.jpg" }],
          },
          { url: "http://insecure.example.net/page", fullMatchingImages: [{ url: "https://insecure.example.net/a.png" }] },
          { url: "https://images.example.org/gallery" },
        ],
      },
    },
  ],
};

describe("findWebMatches", () => {
  it("returns safe pages with their matching image URLs", async () => {
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(visionPayload));

    const matches = await findWebMatches("https://art.example.com/a.png", "test-key", fetchFn);

    expect(matches).toEqual([
      {
        pageUrl: "https://blog.example.net/post",
        imageUrls: ["https://blog.example.net/img/art.png", "https://cdn.example.net/art-small.jpg"],
      },
      { pageUrl: "https://images.example.org/gallery", imageUrls: [] },
    ]);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(VISION_URL);
    expect(JSON.parse(String(init?.body))).toEqual({
      requests: [
        {
          image: { source: { imageUri: "https://art.example.com/a.png" } },
          features: [{ type: "WEB_DETECTION", maxResults: 10 }],
        },
      ],
    });
  });

  it("reports API errors", async () => {
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => new Response("denied", { status: 403 }));
    await expect(findWebMatches("https://art.example.com/a.png", "bad", fetchFn)).rejects.toThrow(
      "Cloud Vision returned 403",
    );
  });
});

describe("findCandidates with web search", () => {
  const work: Work = {
    id: 4,
    creator: "0x0000000000000000000000000000000000000001",
    title: "Art",
    imageUrl: "https://art.example.com/a.png",
    watchUrls: [],
  };

  it("hash-checks web matches and keeps only real copies", async () => {
    const original = await scene("artwork");
    const unrelated = await scene("shapes");
    const fetchFn: FetchLike = async (url) => {
      if (url === VISION_URL) return Response.json(visionPayload);
      if (url === "https://art.example.com/a.png" || url === "https://blog.example.net/img/art.png") {
        return new Response(original);
      }
      if (url === "https://cdn.example.net/art-small.jpg") return new Response(unrelated);
      return new Response("not found", { status: 404 });
    };

    const result = await findCandidates(work, { fetchFn, visionApiKey: "test-key" });

    expect(result.candidates.map((candidate) => [candidate.pageUrl, candidate.imageUrl])).toEqual([
      ["https://blog.example.net/post", "https://blog.example.net/img/art.png"],
    ]);
    expect(result.errors).toEqual([]);
  });

  it("does not call Cloud Vision without an API key", async () => {
    const original = await scene("artwork");
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => new Response(original));

    await findCandidates(work, { fetchFn });

    expect(fetchFn.mock.calls.map(([url]) => url)).toEqual(["https://art.example.com/a.png"]);
  });
});
```

Run: `npm test --workspace agent -- websearch`
Expected: FAIL, cannot find module `../src/websearch`.

- [ ] **Step 2: Write `agent/src/websearch.ts`**

```ts
import { FETCH_TIMEOUT_MS } from "./http";
import type { FetchLike } from "./types";
import { isSafeHttpsUrl } from "./urls";

export const MAX_WEB_MATCHES = 10;

export type WebMatch = { pageUrl: string; imageUrls: string[] };

type VisionImage = { url?: string };
type VisionPage = { url?: string; fullMatchingImages?: VisionImage[]; partialMatchingImages?: VisionImage[] };
type VisionPayload = { responses?: Array<{ webDetection?: { pagesWithMatchingImages?: VisionPage[] } }> };

export async function findWebMatches(imageUrl: string, apiKey: string, fetchFn: FetchLike = fetch): Promise<WebMatch[]> {
  const response = await fetchFn(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { source: { imageUri: imageUrl } },
            features: [{ type: "WEB_DETECTION", maxResults: MAX_WEB_MATCHES }],
          },
        ],
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`Cloud Vision returned ${response.status}`);

  const payload = (await response.json()) as VisionPayload;
  const pages = payload.responses?.[0]?.webDetection?.pagesWithMatchingImages ?? [];
  return pages
    .filter((page): page is VisionPage & { url: string } => typeof page.url === "string" && isSafeHttpsUrl(page.url))
    .slice(0, MAX_WEB_MATCHES)
    .map((page) => ({
      pageUrl: page.url,
      imageUrls: [...(page.fullMatchingImages ?? []), ...(page.partialMatchingImages ?? [])]
        .map((image) => image.url)
        .filter((url): url is string => typeof url === "string" && isSafeHttpsUrl(url)),
    }));
}
```

- [ ] **Step 3: Replace `agent/src/candidates.ts`**

```ts
import { extractImageUrls } from "./html";
import { fetchImage, fetchText } from "./http";
import { differenceHash, hammingDistance, MATCH_THRESHOLD } from "./phash";
import type { Candidate, FetchLike, Work } from "./types";
import { toHttps, withRunId } from "./urls";
import { findWebMatches } from "./websearch";

export type DiscoveryOptions = { fetchFn?: FetchLike; runId?: string; threshold?: number; visionApiKey?: string };
export type DiscoveryResult = { candidates: Candidate[]; errors: string[] };

export async function findCandidates(work: Work, options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const threshold = options.threshold ?? MATCH_THRESHOLD;
  const candidates: Candidate[] = [];
  const errors: string[] = [];
  const checked = new Set<string>();
  const fail = (message: string) => errors.push(`work ${work.id}: ${message}`);

  let referenceHash: bigint;
  try {
    referenceHash = await differenceHash(await fetchImage(toHttps(work.imageUrl), fetchFn));
  } catch (error) {
    fail(`reference image: ${(error as Error).message}`);
    return { candidates, errors };
  }

  const checkImage = async (pageUrl: string, imageUrl: string) => {
    const key = `${pageUrl}|${imageUrl}`;
    if (checked.has(key)) return;
    checked.add(key);
    try {
      const distance = hammingDistance(referenceHash, await differenceHash(await fetchImage(imageUrl, fetchFn)));
      if (distance <= threshold) candidates.push({ workId: work.id, pageUrl, imageUrl, distance });
    } catch (error) {
      fail((error as Error).message);
    }
  };

  for (const watchUrl of work.watchUrls) {
    const pageUrl = withRunId(toHttps(watchUrl), options.runId);
    let imageUrls: string[];
    try {
      imageUrls = extractImageUrls(await fetchText(pageUrl, fetchFn), pageUrl);
    } catch (error) {
      fail((error as Error).message);
      continue;
    }
    for (const imageUrl of imageUrls) {
      await checkImage(pageUrl, imageUrl);
    }
  }

  if (options.visionApiKey) {
    let matches: Awaited<ReturnType<typeof findWebMatches>> = [];
    try {
      matches = await findWebMatches(toHttps(work.imageUrl), options.visionApiKey, fetchFn);
    } catch (error) {
      fail(`web search: ${(error as Error).message}`);
    }
    for (const match of matches) {
      for (const imageUrl of match.imageUrls) {
        await checkImage(match.pageUrl, imageUrl);
      }
    }
  }

  return { candidates, errors };
}
```

- [ ] **Step 4: Pass the key through**

In `agent/src/cli.ts`, change:

```ts
const summary = await runScan(client, { wait: true });
```

to:

```ts
const summary = await runScan(client, { wait: true, visionApiKey: process.env.GOOGLE_VISION_API_KEY || undefined });
```

In `.github/workflows/agent-scan.yml`, add under `env:`:

```yaml
      GOOGLE_VISION_API_KEY: ${{ secrets.GOOGLE_VISION_API_KEY }}
```

- [ ] **Step 5: Run the tests and type-check**

```bash
npm test --workspace agent
npm run typecheck --workspace agent
```

Expected: `61 passed` (57 earlier plus 4 in `websearch.test.ts`); `tsc` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add agent .github/workflows/agent-scan.yml
git commit -m "$(cat <<'EOF'
feat(agent): optional Cloud Vision web search, hash-checked before filing

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Coverage Against the Spec

| Spec requirement (section 7 and 10) | Task |
|---|---|
| Reads every work from the contract (reference image, watched URLs) | 8 (`listWorks`), 7 |
| Loads each watched page, including IPFS links; `img src`/`srcset`, `og:image`, `twitter:image`; ≤ 50 images per page | 2, 3, 6 |
| Perceptual hash comparison, match when distance ≤ 10 | 4, 6 |
| 10-second timeout, 5 MB image cap, HTTPS only, private hosts blocked | 2, 5 |
| Skips page–image pairs already claimed; ≤ 5 claims per run; writes one at a time, waiting for decisions | 7, 8 |
| `?run=<runId>` for demo runs; submit without waiting for "Scan now" | 2, 6, 7 (the route itself is Plan 3) |
| Scheduled every 30 minutes, plus manual dispatch; secrets from the environment | 8 |
| Web search mode when a key is set, with every result hash-checked first | 9 (optional) |
| Agent tests: hash fixtures, image extraction, Vision response parsing, duplicate skipping and cap with a mocked client | 3, 4, 7, 9 |

## After This Plan

- **Plan 3:** the "Scan now" route calls `runScan(createLicenseHunterClient(...), { wait: false, runId, workIds: [workId] })` from `@licensehunter/agent`. It needs `transpilePackages: ["@licensehunter/agent"]` in `frontend/next.config.ts`.
- **Plan 3's demo copy:** the shop page's edited copy must stay within the measured limits. A crop of at most 5% per side plus a resize matches; a 10% crop per side or added borders (16) do not.

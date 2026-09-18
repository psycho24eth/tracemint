import { DEMO_COLLECTION, watchPaths } from "../frontend/lib/demo/catalog";
import {
  addressLink,
  clientFor,
  describeTx,
  HEAVY_FEES,
  json,
  loadEnv,
  read,
  requireEnv,
  txLink,
  write,
  type Hex,
} from "./studio-next";

const GEN = 10n ** 18n;

loadEnv();
const site = requireEnv("NEXT_PUBLIC_SITE_URL").replace(/\/+$/, "");
const creator = clientFor(requireEnv("DEMO_CREATOR_PRIVATE_KEY") as Hex);
const address = requireEnv("LICENSE_HUNTER_ADDRESS");
const portfolioUrl = `${site}/demo/portfolio`;

// Works are matched by image URL, so re-running only registers what is missing.
const existing = (await read(creator, address, "list_works")) as Array<Record<string, unknown>>;
const registered = new Map(existing.map((work) => [String(work.image_url), work.id]));

let failed = false;
for (const work of DEMO_COLLECTION) {
  const imageUrl = `${site}${work.original}`;
  if (registered.has(imageUrl)) {
    console.log(`${work.title}: already registered as work ${registered.get(imageUrl)}`);
    continue;
  }

  // The ownership check makes validators fetch the portfolio page, so this needs the heavy preset.
  const result = await write(
    creator,
    address,
    "register_work",
    [
      work.title,
      imageUrl,
      portfolioUrl,
      BigInt(work.basePriceGen) * GEN,
      work.terms,
      watchPaths(work).map((page) => `${site}${page}`),
    ],
    { fees: HEAVY_FEES },
  );
  console.log(`${work.title}: register_work ${describeTx(result.tx)} ${txLink(result.hash)}`);
  if (!result.ok) {
    console.error(json(result.tx));
    failed = true;
  }
}

const after = (await read(creator, address, "list_works")) as Array<Record<string, unknown>>;
console.log(`registered works: ${after.map((work) => `${work.id} ${work.title}`).join(", ")}`);
console.log(`contract: ${addressLink(address)}`);
if (failed) process.exit(1);

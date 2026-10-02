import { DEMO_COLLECTION, watchPaths } from "../frontend/lib/demo/catalog";
import { registeredByPath, type RegisteredWork } from "./seedPlan";
import {
  addressLink,
  clientFor,
  createAccount,
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
const creatorKey = requireEnv("DEMO_CREATOR_PRIVATE_KEY") as Hex;
const creator = clientFor(creatorKey);
const address = requireEnv("LICENSE_HUNTER_ADDRESS");
const portfolioUrl = `${site}/demo/portfolio`;

// Works are matched by image path (see seedPlan.ts), so re-running only registers what is missing,
// whichever of the site's domains a work was registered under.
const existing = (await read(creator, address, "list_works")) as RegisteredWork[];
const registered = registeredByPath(existing, createAccount(creatorKey).address);

let failed = false;
for (const work of DEMO_COLLECTION) {
  const imageUrl = `${site}${work.original}`;
  if (registered.has(work.original)) {
    console.log(`${work.title}: already registered as work ${registered.get(work.original)}`);
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

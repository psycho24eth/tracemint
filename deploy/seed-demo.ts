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

const works = (await read(creator, address, "list_works")) as Array<Record<string, unknown>>;
const existing = works.find((work) => work.portfolio_url === portfolioUrl);
if (existing) {
  console.log(`demo work already registered: id ${existing.id}`);
  process.exit(0);
}

// The ownership check makes validators fetch the portfolio page, so this needs the heavy preset.
const result = await write(
  creator,
  address,
  "register_work",
  [
    "Cybernetic Horizon",
    `${site}/demo/cybernetic-horizon.png`,
    portfolioUrl,
    10n * GEN,
    "Non-exclusive web license, 12 months",
    [`${site}/demo/shop`, `${site}/demo/blog`],
  ],
  { fees: HEAVY_FEES },
);
console.log(`register_work: ${describeTx(result.tx)} ${txLink(result.hash)}`);
if (!result.ok) {
  console.error(json(result.tx));
  process.exit(1);
}

const after = (await read(creator, address, "list_works")) as Array<Record<string, unknown>>;
const work = after.find((item) => item.portfolio_url === portfolioUrl);
console.log(`demo work id: ${work?.id ?? "unknown"}`);
console.log(`contract: ${addressLink(address)}`);

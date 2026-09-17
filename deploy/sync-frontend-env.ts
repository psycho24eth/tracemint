import { writeFileSync } from "node:fs";

import { loadEnv, requireEnv } from "./studio-next";

const TARGET = "frontend/.env.local";

loadEnv();

const values: Record<string, string> = {
  NEXT_PUBLIC_CONTRACT_ADDRESS: requireEnv("LICENSE_HUNTER_ADDRESS"),
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_DEMO_CREATOR_ADDRESS: requireEnv("DEMO_CREATOR_ADDRESS"),
  NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS: requireEnv("DEMO_SITE_OWNER_ADDRESS"),
  LICENSE_HUNTER_ADDRESS: requireEnv("LICENSE_HUNTER_ADDRESS"),
  AGENT_PRIVATE_KEY: requireEnv("AGENT_PRIVATE_KEY"),
  DEMO_CREATOR_PRIVATE_KEY: requireEnv("DEMO_CREATOR_PRIVATE_KEY"),
  DEMO_SITE_OWNER_PRIVATE_KEY: requireEnv("DEMO_SITE_OWNER_PRIVATE_KEY"),
};

writeFileSync(TARGET, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n")}\n`);
// Print key names only; the values include private keys.
console.log(`wrote ${TARGET}: ${Object.keys(values).join(", ")}`);

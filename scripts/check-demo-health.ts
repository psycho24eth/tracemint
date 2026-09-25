/**
 * Answers one question before a judge does: is the demo still working?
 *
 * Four things have to be true, and each fails quietly rather than visibly:
 *  - the deployment will still issue demo access codes, so a visitor can act without a wallet
 *  - the three funded wallets can still pay fees
 *  - the scheduled scan is still running, and still being allowed to run by GitHub
 *  - the contract still answers, so the site has something to show
 *
 * Exits 0 when everything passes, 1 when anything warns or fails, so it can gate a release later.
 *
 * Run with: npm run health
 */
import { execFileSync } from "node:child_process";

import { balanceOf, clientFor, loadEnv, read, type Hex } from "../deploy/studio-next";
import { balanceCheck, demoModeCheck, scanCheck, worstLevel, type Check, type ScanRun } from "../deploy/demoHealth";

loadEnv();

const SITE = process.env.HEALTH_SITE_URL ?? "https://tracemint.vercel.app";
const WALLETS = [
  ["Demo creator wallet", "DEMO_CREATOR_ADDRESS"],
  ["Demo site owner wallet", "DEMO_SITE_OWNER_ADDRESS"],
  ["Agent wallet", "AGENT_ADDRESS"],
] as const;

const checks: Check[] = [];

async function checkDemoMode(): Promise<Check> {
  try {
    const response = await fetch(`${SITE}/api/demo/code`, { method: "POST" });
    // Read expiresAt only. The code is a live credential for funded wallets and is never printed.
    const body = (await response.json().catch(() => ({}))) as { expiresAt?: unknown };
    return demoModeCheck({ status: response.status, expiresAt: body.expiresAt });
  } catch (error) {
    return { name: "Demo mode", level: "fail", detail: `Could not reach ${SITE}: ${(error as Error).message}` };
  }
}

async function checkWallets(): Promise<Check[]> {
  return Promise.all(
    WALLETS.map(async ([name, key]): Promise<Check> => {
      const address = process.env[key];
      if (!address) {
        return { name, level: "fail", detail: `${key} is not in .env.local. Run "npm run accounts" first.` };
      }
      try {
        return balanceCheck(name, await balanceOf(address));
      } catch (error) {
        return { name, level: "fail", detail: `Could not read its balance: ${(error as Error).message}` };
      }
    }),
  );
}

function checkScan(): Check {
  try {
    const output = execFileSync(
      "gh",
      ["run", "list", "--workflow", "agent-scan.yml", "--limit", "1", "--json", "conclusion,status,createdAt"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const runs = JSON.parse(output) as ScanRun[];
    return scanCheck(runs[0] ?? null);
  } catch (error) {
    // No gh, or not logged in. Worth saying, but it is a gap in the check rather than a broken demo.
    return { name: "Scheduled scan", level: "warn", detail: `Could not ask GitHub: ${(error as Error).message.split("\n")[0]}` };
  }
}

async function checkContract(): Promise<Check> {
  const name = "Contract";
  const address = process.env.LICENSE_HUNTER_ADDRESS;
  const key = process.env.AGENT_PRIVATE_KEY as Hex | undefined;
  if (!address || !key) {
    return { name, level: "warn", detail: "Skipped: needs LICENSE_HUNTER_ADDRESS and AGENT_PRIVATE_KEY in .env.local." };
  }
  try {
    const stats = (await read(clientFor(key), address, "get_stats")) as Record<string, number>;
    const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    return {
      name,
      level: "pass",
      detail: `Answering: ${count(stats.works, "work", "works")}, ${count(stats.claims, "claim", "claims")}, ${count(stats.licenses, "licence", "licences")}.`,
    };
  } catch (error) {
    return { name, level: "fail", detail: `Did not answer: ${(error as Error).message}` };
  }
}

checks.push(await checkDemoMode());
checks.push(...(await checkWallets()));
checks.push(checkScan());
checks.push(await checkContract());

const MARK = { pass: "  ok  ", warn: " warn ", fail: " FAIL " } as const;
console.log(`\nTraceMint demo health — ${SITE}\n`);
for (const check of checks) console.log(`[${MARK[check.level]}] ${check.name.padEnd(24)} ${check.detail}`);

const worst = worstLevel(checks);
console.log(
  worst === "pass"
    ? "\nEverything a judge needs is working.\n"
    : worst === "warn"
      ? "\nWorking, with something worth looking at above.\n"
      : "\nSomething a judge would hit is broken. See the FAIL lines above.\n",
);
process.exit(worst === "pass" ? 0 : 1);

/**
 * The judgements behind "npm run health", kept separate from the calls that gather the facts so they
 * can be tested without a network. Nothing here does IO.
 */

export const GEN = 10n ** 18n;

/** The same floor "npm run accounts" tops wallets up to, so both agree on what "running low" means. */
export const MIN_BALANCE = 100n * GEN;

/**
 * The workflow asks for every 30 minutes, but GitHub drops most scheduled turns on a public repository
 * and the measured gaps run from 2 to 6 hours. The threshold follows the measurement, not the cron
 * string: a check that cries wolf on a healthy setup is one nobody reads.
 */
export const SCAN_INTERVAL_MINUTES = 30;
export const SCAN_STALE_HOURS = 8;
/** GitHub disables scheduled workflows on repositories that sit untouched, which looks exactly like this. */
export const SCAN_DEAD_HOURS = 26;

export type Level = "pass" | "warn" | "fail";
export type Check = { name: string; level: Level; detail: string };

const WORST: Record<Level, number> = { pass: 0, warn: 1, fail: 2 };

/** The worst news in the set, which is what the exit code should reflect. */
export function worstLevel(checks: Check[]): Level {
  return checks.reduce<Level>((worst, check) => (WORST[check.level] > WORST[worst] ? check.level : worst), "pass");
}

export function formatGen(wei: bigint): string {
  const whole = wei / GEN;
  const cents = ((wei % GEN) * 100n) / GEN;
  return `${whole.toLocaleString("en-US")}.${cents.toString().padStart(2, "0")} GEN`;
}

/**
 * A wallet that cannot pay a fee stops the demo dead, so empty is a failure rather than a warning --
 * and a wallet on its way down is worth knowing about before a judge finds it.
 */
export function balanceCheck(name: string, balance: bigint, floor = MIN_BALANCE): Check {
  if (balance === 0n) {
    return { name, level: "fail", detail: "Empty. Nothing it signs for can pay a fee. Run \"npm run accounts\" to top it up." };
  }
  if (balance < floor) {
    return {
      name,
      level: "warn",
      detail: `${formatGen(balance)}, below the ${formatGen(floor)} floor. Run "npm run accounts" before it runs out.`,
    };
  }
  return { name, level: "pass", detail: formatGen(balance) };
}

export type DemoCodeResponse = { status: number; expiresAt?: unknown };

/**
 * Whether a visitor can still let themselves in. The code itself is deliberately not reported: it is a
 * live credential for funded wallets, and a health check has no business printing one.
 */
export function demoModeCheck(response: DemoCodeResponse, now = Date.now()): Check {
  const name = "Demo mode";
  if (response.status === 503) {
    return { name, level: "fail", detail: "Switched off for this deployment: DEMO_ACCESS_CODE is not set on it." };
  }
  if (response.status === 429) {
    return { name, level: "warn", detail: "Rate limited just now, so this says nothing either way. Try again in a minute." };
  }
  if (response.status !== 200) {
    return { name, level: "fail", detail: `The site answered ${response.status} instead of issuing a code.` };
  }
  if (typeof response.expiresAt !== "number") {
    return { name, level: "fail", detail: "Issued a code with no expiry, which the site will not accept." };
  }
  const hours = Math.round((response.expiresAt - now) / 3_600_000);
  if (hours <= 0) {
    return { name, level: "fail", detail: "Issued a code that has already expired; check the clock on the deployment." };
  }
  return { name, level: "pass", detail: `Issuing codes, each good for ${hours} hours.` };
}

export type ScanRun = { conclusion?: string | null; status?: string | null; createdAt?: string | null };

/** Whether the unattended half of the demo is still running, and still being allowed to run. */
export function scanCheck(run: ScanRun | null, now = new Date()): Check {
  const name = "Scheduled scan";
  if (!run) return { name, level: "fail", detail: "No runs found at all. Has the workflow ever been enabled?" };

  const started = run.createdAt ? new Date(run.createdAt) : null;
  const ageHours = started && !Number.isNaN(started.getTime()) ? (now.getTime() - started.getTime()) / 3_600_000 : null;
  const age = ageHours === null ? "at an unknown time" : `${ageHours.toFixed(1)}h ago`;

  if (run.status && run.status !== "completed") {
    return { name, level: "pass", detail: `A run started ${age} and is still going.` };
  }
  if (run.conclusion !== "success") {
    return { name, level: "fail", detail: `The last run ${age} ended "${run.conclusion ?? "unknown"}".` };
  }
  if (ageHours !== null && ageHours > SCAN_DEAD_HOURS) {
    return {
      name,
      level: "fail",
      detail: `Last succeeded ${age}. GitHub disables schedules on quiet repositories -- check the workflow is still enabled.`,
    };
  }
  if (ageHours !== null && ageHours > SCAN_STALE_HOURS) {
    return { name, level: "warn", detail: `Last succeeded ${age}, longer than the ${SCAN_STALE_HOURS}h that GitHub's dropped turns usually account for.` };
  }
  return { name, level: "pass", detail: `Last succeeded ${age}.` };
}

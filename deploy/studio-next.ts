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

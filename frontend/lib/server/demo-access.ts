import "server-only";

import { timingSafeEqual } from "node:crypto";

import { checkDemoCode, issueDemoCode, type DemoCodeCheck } from "./demo-codes";

export const ACCESS_HEADER = "x-demo-access";

/** Accepts the judge code from the submission, or a generated demo code that hasn't expired. */
export function checkAccessCode(code: unknown): DemoCodeCheck {
  const secret = process.env.DEMO_ACCESS_CODE;
  if (!secret || typeof code !== "string") return "invalid";
  const given = Buffer.from(code);
  const wanted = Buffer.from(secret);
  if (given.length === wanted.length && timingSafeEqual(given, wanted)) return "valid";
  return checkDemoCode(code, secret);
}

export function isValidAccessCode(code: unknown): boolean {
  return checkAccessCode(code) === "valid";
}

/** A fresh, unique demo code, or null when this deployment has demo mode switched off. */
export function newDemoCode(): { code: string; expiresAt: number } | null {
  const secret = process.env.DEMO_ACCESS_CODE;
  return secret ? issueDemoCode(secret) : null;
}

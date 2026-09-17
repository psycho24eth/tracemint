import "server-only";

import { timingSafeEqual } from "node:crypto";

export const ACCESS_HEADER = "x-demo-access";

export function isValidAccessCode(code: unknown): boolean {
  const expected = process.env.DEMO_ACCESS_CODE;
  if (!expected || typeof code !== "string") return false;
  const given = Buffer.from(code);
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

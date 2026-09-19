import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/** How long a generated demo code keeps working. */
export const DEMO_CODE_TTL_HOURS = 24;

const HOUR_MS = 3_600_000;
// Crockford base32: no I, L, O or U, so a code read aloud or retyped survives.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PREFIX = "DEMO-";
const GROUPS = /^([0-9A-Z]{4})-([0-9A-Z]{4})-([0-9A-Z]{4})-([0-9A-Z]{4})$/;

function encode(value: number, length: number): string {
  let text = "";
  for (let index = 0; index < length; index += 1) {
    text = ALPHABET[value % 32] + text;
    value = Math.floor(value / 32);
  }
  return text;
}

function decode(text: string): number | null {
  let value = 0;
  for (const char of text) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) return null;
    value = value * 32 + digit;
  }
  return value;
}

// Codes are signed with a key derived from the deployment's judge access code, so no new secret is needed
// and rotating DEMO_ACCESS_CODE also retires every generated code.
function signature(body: string, secret: string): string {
  const digest = createHmac("sha256", `tracemint-demo-code:${secret}`).update(body).digest();
  return encode(digest.readUInt32BE(0), 4) + encode(digest.readUInt32BE(4), 4);
}

/**
 * A new demo code, different on every call: DEMO-HHHH-RRRR-SSSS-SSSS carries the hour it was issued,
 * 20 random bits, and a 40-bit signature. The server checks it without storing anything.
 */
export function issueDemoCode(secret: string, now = Date.now()): { code: string; expiresAt: number } {
  const hour = Math.floor(now / HOUR_MS);
  const body = encode(hour, 4) + encode(randomInt(0, 32 ** 4), 4);
  const raw = body + signature(body, secret);
  return {
    code: `${PREFIX}${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12)}`,
    expiresAt: (hour + DEMO_CODE_TTL_HOURS) * HOUR_MS,
  };
}

export type DemoCodeCheck = "valid" | "expired" | "invalid";

export function checkDemoCode(code: string, secret: string, now = Date.now()): DemoCodeCheck {
  const text = code.trim().toUpperCase();
  if (!text.startsWith(PREFIX)) return "invalid";
  // Retyped codes often swap look-alikes; the alphabet never issues O, I or L.
  const match = GROUPS.exec(text.slice(PREFIX.length).replace(/O/g, "0").replace(/[IL]/g, "1"));
  if (!match) return "invalid";
  const raw = match.slice(1).join("");
  const body = raw.slice(0, 8);
  const given = Buffer.from(raw.slice(8));
  const wanted = Buffer.from(signature(body, secret));
  if (!timingSafeEqual(given, wanted)) return "invalid";

  const issuedHour = decode(body.slice(0, 4));
  const currentHour = Math.floor(now / HOUR_MS);
  if (issuedHour === null || issuedHour > currentHour + 1) return "invalid";
  return currentHour - issuedHour < DEMO_CODE_TTL_HOURS ? "valid" : "expired";
}

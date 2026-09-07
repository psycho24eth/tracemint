/**
 * Cryptographic Hashing and Serialization Utilities
 */

/**
 * Computes SHA-256 hash across Browser and Node environments.
 * Returns lowercase hex string with 0x prefix.
 */
export async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  let buffer: Uint8Array;
  if (typeof data === "string") {
    buffer = new TextEncoder().encode(data);
  } else if (data instanceof Uint8Array) {
    buffer = data;
  } else {
    buffer = new Uint8Array(data);
  }

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `0x${hex}`;
  }

  // Node fallback
  const nodeCrypto = await import("crypto");
  const hex = nodeCrypto.createHash("sha256").update(buffer).digest("hex");
  return `0x${hex}`;
}

/**
 * Converts a hex string into a standard Solidity bytes32 hex string (32 bytes = 64 hex chars + 0x prefix).
 */
export function toBytes32(hexStr: string): string {
  let clean = hexStr.startsWith("0x") ? hexStr.slice(2) : hexStr;
  if (clean.length > 64) {
    clean = clean.slice(0, 64);
  }
  return `0x${clean.padStart(64, "0")}`;
}

/**
 * Deterministically sorts object keys and serializes to JSON string.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalizeJson(item)).join(",")}]`;
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const pairs = keys.map((key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`);
  return `{${pairs.join(",")}}`;
}

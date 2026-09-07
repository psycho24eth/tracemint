/**
 * Security & Anti-SSRF Validation Utilities
 */

const BLOCKED_PROTOCOLS = new Set(["javascript:", "data:", "file:", "ftp:"]);

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/, // Link-local / AWS / GCP metadata
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export interface UrlValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  reason?: string;
}

/**
 * Validates URLs to prevent SSRF, internal network scanning, or protocol attacks.
 */
export function validateSafeUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, reason: "Empty or invalid URL input" };
  }

  try {
    const parsed = new URL(rawUrl.trim());

    if (BLOCKED_PROTOCOLS.has(parsed.protocol)) {
      return { isValid: false, reason: `Disallowed protocol: ${parsed.protocol}` };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { isValid: false, reason: "Only HTTP and HTTPS URLs are allowed" };
    }

    const hostname = parsed.hostname.toLowerCase();

    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { isValid: false, reason: "Forbidden private or internal network address" };
      }
    }

    return { isValid: true, sanitizedUrl: parsed.toString() };
  } catch {
    return { isValid: false, reason: "Malformed URL syntax" };
  }
}

export type DemoRole = "creator" | "site-owner";

export const DEMO_METHODS: Record<DemoRole, readonly string[]> = {
  creator: ["register_work", "update_watchlist", "file_claim", "withdraw_earnings"],
  "site-owner": ["pay_license", "dispute"],
};

export const DEMO_ROLE_LABELS: Record<DemoRole, string> = {
  creator: "Demo creator",
  "site-owner": "Demo site owner",
};

export function demoAddress(role: DemoRole): string {
  const address =
    role === "creator" ? process.env.NEXT_PUBLIC_DEMO_CREATOR_ADDRESS : process.env.NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS;
  return address ?? "";
}

export function roleForMethod(method: string): DemoRole | null {
  if (DEMO_METHODS.creator.includes(method)) return "creator";
  if (DEMO_METHODS["site-owner"].includes(method)) return "site-owner";
  return null;
}

export type DemoWriteRequest = { role: DemoRole; method: string; args: unknown[]; value: bigint };

export class DemoRequestError extends Error {
  constructor(
    readonly status: 400 | 403,
    message: string,
  ) {
    super(message);
  }
}

const MAX_ARGS = 8;
const MAX_LIST_ITEMS = 10;
const MAX_STRING_CHARS = 2_000;
const WEI_PATTERN = /^\d{1,40}$/;

type BigintWire = { $bigint: string };

export function encodeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === "bigint") return { $bigint: arg.toString() } satisfies BigintWire;
    return Array.isArray(arg) ? encodeArgs(arg) : arg;
  });
}

function isBigintWire(value: unknown): value is BigintWire {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const digits = (value as Partial<BigintWire>).$bigint;
  return Object.keys(value).length === 1 && typeof digits === "string" && WEI_PATTERN.test(digits);
}

function decodeArg(value: unknown, insideList: boolean): unknown {
  if (typeof value === "string" && value.length <= MAX_STRING_CHARS) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (Array.isArray(value) && !insideList && value.length <= MAX_LIST_ITEMS) {
    return value.map((item) => decodeArg(item, true));
  }
  if (isBigintWire(value)) return BigInt(value.$bigint);
  throw new DemoRequestError(400, "Unsupported argument value");
}

export function parseDemoWriteRequest(body: unknown): DemoWriteRequest {
  if (typeof body !== "object" || body === null) throw new DemoRequestError(400, "Send a JSON object");
  const { role, method, args = [], value = "0" } = body as Record<string, unknown>;
  if (role !== "creator" && role !== "site-owner") throw new DemoRequestError(400, "Unknown demo role");
  if (typeof method !== "string" || !DEMO_METHODS[role].includes(method)) {
    throw new DemoRequestError(403, `The ${DEMO_ROLE_LABELS[role].toLowerCase()} cannot call ${String(method)}`);
  }
  if (!Array.isArray(args) || args.length > MAX_ARGS) {
    throw new DemoRequestError(400, `args must be a list of at most ${MAX_ARGS} values`);
  }
  if (typeof value !== "string" || !WEI_PATTERN.test(value)) {
    throw new DemoRequestError(400, "value must be a whole number of wei");
  }
  const wei = BigInt(value);
  if (wei > 0n && method !== "pay_license") throw new DemoRequestError(400, "Only pay_license accepts a value");
  return { role, method, args: args.map((arg) => decodeArg(arg, false)), value: wei };
}

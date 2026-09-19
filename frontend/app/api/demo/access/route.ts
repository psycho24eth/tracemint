import { checkAccessCode } from "@/lib/server/demo-access";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const tryUnlock = createRateLimiter(10, 60_000);

export async function POST(request: Request) {
  if (!tryUnlock()) {
    return Response.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const check = checkAccessCode(body.code);
  if (check === "expired") {
    return Response.json({ error: "That demo code has expired. Get a new one." }, { status: 401 });
  }
  if (check !== "valid") {
    return Response.json({ error: "That access code is not valid." }, { status: 401 });
  }
  return new Response(null, { status: 204 });
}

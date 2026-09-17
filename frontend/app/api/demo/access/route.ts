import { isValidAccessCode } from "@/lib/server/demo-access";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const tryUnlock = createRateLimiter(10, 60_000);

export async function POST(request: Request) {
  if (!tryUnlock()) {
    return Response.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  if (!isValidAccessCode(body.code)) {
    return Response.json({ error: "That access code is not valid." }, { status: 401 });
  }
  return new Response(null, { status: 204 });
}

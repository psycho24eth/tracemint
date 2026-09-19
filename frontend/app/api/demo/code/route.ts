import { newDemoCode } from "@/lib/server/demo-access";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const tryIssue = createRateLimiter(30, 60_000);

/** Hands out a new demo access code, unique to this request and valid for a day. */
export async function POST() {
  if (!tryIssue()) {
    return Response.json({ error: "Too many demo codes were requested just now. Try again in a minute." }, { status: 429 });
  }
  const issued = newDemoCode();
  if (!issued) {
    return Response.json({ error: "Demo mode isn't switched on for this deployment." }, { status: 503 });
  }
  return Response.json(issued, { headers: { "Cache-Control": "no-store" } });
}

import { DemoRequestError, parseDemoWriteRequest } from "@/lib/demo/roles";
import { ACCESS_HEADER, isValidAccessCode } from "@/lib/server/demo-access";
import { DemoConfigError, signDemoWrite } from "@/lib/server/demo-signer";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const tryWrite = createRateLimiter(6, 60_000);

export async function POST(request: Request) {
  if (!isValidAccessCode(request.headers.get(ACCESS_HEADER))) {
    return Response.json({ error: "Judge access is required. Enter the access code on the For judges page." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body" }, { status: 400 });
  }

  try {
    const demoWrite = parseDemoWriteRequest(body);
    if (!tryWrite()) {
      return Response.json({ error: "Demo mode is busy. Try again in a minute." }, { status: 429 });
    }
    return Response.json({ hash: await signDemoWrite(demoWrite) });
  } catch (error) {
    if (error instanceof DemoRequestError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof DemoConfigError) return Response.json({ error: error.message }, { status: 503 });
    console.error("demo write failed:", (error as Error).message);
    return Response.json({ error: "The transaction could not be submitted. Try again." }, { status: 502 });
  }
}

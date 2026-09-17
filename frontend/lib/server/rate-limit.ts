/** Allows at most `limit` calls per rolling window. The state lives in one server instance only. */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  let recent: number[] = [];
  return function tryAcquire(): boolean {
    const time = now();
    recent = recent.filter((stamp) => time - stamp < windowMs);
    if (recent.length >= limit) return false;
    recent.push(time);
    return true;
  };
}

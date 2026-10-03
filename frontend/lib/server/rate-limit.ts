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

/** The same rolling window, kept separately for each key, so one busy visitor cannot lock out everyone else. */
export function createKeyedRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const recent = new Map<string, number[]>();
  return function tryAcquire(key: string): boolean {
    const time = now();
    const inWindow = (stamp: number) => time - stamp < windowMs;
    // Forgetting visitors whose window has closed keeps the map from growing for as long as the instance lives.
    for (const [other, stamps] of recent) {
      if (!stamps.some(inWindow)) recent.delete(other);
    }
    const stamps = (recent.get(key) ?? []).filter(inWindow);
    if (stamps.length >= limit) return false;
    recent.set(key, [...stamps, time]);
    return true;
  };
}

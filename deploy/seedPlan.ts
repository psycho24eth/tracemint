/**
 * Which demo works are already on chain. Pure, so it can be tested without a network.
 *
 * Matched by image path, not by full URL: the site answers at tracemint.vercel.app and at the older
 * licensehunter.vercel.app, and a work registered under either domain is the same work. Seeding by URL
 * would register it a second time. Only the demo creator's own works count, so another wallet
 * registering the same path can't make a demo work look done.
 */
export type RegisteredWork = { id: unknown; creator: unknown; image_url: unknown };

export function imagePath(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

/** Image path to work id, for the given creator's works. The earliest registration of a path wins. */
export function registeredByPath(existing: RegisteredWork[], creator: string): Map<string, unknown> {
  const byPath = new Map<string, unknown>();
  for (const work of existing) {
    if (String(work.creator).toLowerCase() !== creator.toLowerCase()) continue;
    const path = imagePath(String(work.image_url));
    if (path && !byPath.has(path)) byPath.set(path, work.id);
  }
  return byPath;
}

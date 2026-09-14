/**
 * A small in-process TTL cache for reference data.
 *
 * Countries, regions, cities, districts and the category tree change perhaps
 * a few times a month, but every cold app start asks for them. Serving those
 * from memory keeps a request that would otherwise be four database round
 * trips at roughly zero, which matters when the client is on a 2G link and
 * already paying hundreds of milliseconds in latency.
 *
 * Deliberately not Redis. A single process holding a few hundred kilobytes for
 * five minutes solves this completely, and a cache that can be down is a
 * dependency that can take the API down with it. Revisit when there is more
 * than one instance AND stale reference data for one TTL becomes a real
 * problem — admin edits already call invalidate().
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/** In-flight loads, so a cold key under concurrency does one query, not N. */
const inflight = new Map<string, Promise<unknown>>();

export const FIVE_MINUTES = 5 * 60_000;

export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = load()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Drops one key, or every key sharing a prefix when it ends in ':'. */
export function invalidate(keyOrPrefix: string): void {
  if (keyOrPrefix.endsWith(':')) {
    for (const key of store.keys()) {
      if (key.startsWith(keyOrPrefix)) store.delete(key);
    }
    return;
  }
  store.delete(keyOrPrefix);
}

export function clearCache(): void {
  store.clear();
  inflight.clear();
}

export function cacheStats(): { keys: number; inflight: number } {
  return { keys: store.size, inflight: inflight.size };
}

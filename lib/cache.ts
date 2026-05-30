// Module-level in-memory cache — persists across navigations within a session

const store = new Map<string, { data: unknown; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry || Date.now() - entry.ts > TTL) return null;
  return entry.data as T;
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
}

export function invalidate(key: string): void {
  store.delete(key);
}

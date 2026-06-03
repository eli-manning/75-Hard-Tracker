// Module-level in-memory cache — persists across client-side navigations within a session

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

export function clearAll(): void {
  store.clear();
  sessionStore.clear();
}

// In React Native there is no sessionStorage / PWA background kill scenario.
// We use a second in-memory map as a synchronous drop-in replacement so all
// call sites remain unchanged.
const sessionStore = new Map<string, { data: unknown; ts: number }>();
const SESSION_TTL = 10 * 60 * 1000; // 10 minutes

export function getSessionCached<T>(key: string): T | null {
  const entry = sessionStore.get(key);
  if (!entry || Date.now() - entry.ts > SESSION_TTL) return null;
  return entry.data as T;
}

export function setSessionCached<T>(key: string, data: T): void {
  sessionStore.set(key, { data, ts: Date.now() });
}

export function clearSessionCached(key: string): void {
  sessionStore.delete(key);
}

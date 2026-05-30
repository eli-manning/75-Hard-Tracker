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

// sessionStorage-backed cache — survives iOS PWA background kills within the same browser session
const SESSION_TTL = 10 * 60 * 1000; // 10 minutes

export function getSessionCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - ts > SESSION_TTL) { sessionStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

export function setSessionCached<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function clearSessionCached(key: string): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(key); } catch {}
}

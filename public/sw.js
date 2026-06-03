const CACHE = '75hard-v2';
const PRECACHE = [
  '/',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Force all open tabs to reload after taking control, so stale
        // Next.js-cached content is never served from the old SW.
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
      })
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Pass through: non-GET, cross-origin, Firebase/Google APIs
  const isExternal = url.hostname !== self.location.hostname;
  const isFirebase = url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic');

  if (isExternal || isFirebase || e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      // Stale-while-revalidate: return cache immediately, update in background
      return cached || networkFetch;
    })
  );
});

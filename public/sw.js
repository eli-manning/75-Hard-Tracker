const CACHE = '75hard-v1';
const SHELL = [
  '/',
  '/today/',
  '/login/',
  '/tasks/',
  '/history/',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Network-first for Firebase API calls; cache-first for app shell
  const url = new URL(e.request.url);
  const isFirebase = url.hostname.includes('firestore') || url.hostname.includes('googleapis') || url.hostname.includes('firebase');

  if (isFirebase || e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      // Return cached immediately if available, update in background
      return cached || networkFetch;
    })
  );
});

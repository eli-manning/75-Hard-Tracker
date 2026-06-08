importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

// ── Firebase Cloud Messaging (background push) ────────────────────────────
firebase.initializeApp({
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: '__FIREBASE_AUTH_DOMAIN__',
  projectId: '__FIREBASE_PROJECT_ID__',
  storageBucket: '__FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Notification messages (with a `notification` field) are shown automatically
  // by the browser — calling showNotification here too would cause duplicates.
  if (payload.notification) return;
  const title = payload.data?.title ?? 'CrewDay';
  const body = payload.data?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });
});

// ── Cache / Offline ───────────────────────────────────────────────────────
// Bump this version on every deploy so the old cache is purged and users
// never get served a stale index.html pointing at a non-existent JS bundle.
const CACHE = 'crewday-v3';
const PRECACHE = [
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
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
      })
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  const isExternal = url.hostname !== self.location.hostname;
  const isFirebase = url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic');

  if (isExternal || isFirebase || e.request.method !== 'GET') return;

  // index.html must always come from the network — it references hashed JS bundle
  // URLs that change on every deploy. Serving a stale index.html causes the app to
  // request a bundle that no longer exists, resulting in a blank screen.
  const isHtmlNav = e.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html';

  if (isHtmlNav) {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // For all other assets: stale-while-revalidate (JS bundles are content-addressed,
  // so a cached hit will always match the file that index.html asked for).
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// Minimal offline-shell service worker.
// Scope of what this actually gives you: the app's HTML/JS/CSS shell loads
// even with no network, and any order placed while offline is queued
// locally (see src/utils/offlineQueue.js) and synced once back online.
// It does NOT let you browse a live, up-to-date menu with no connection —
// that data has to come from the server. Framing this honestly to the
// college/judges matters more than overselling it as "full offline mode".
const CACHE_NAME = 'smart-canteen-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache-first for same-origin navigation/static assets. API calls
  // (different port/host in dev, /api/* in prod) always go to the network
  // so data stays fresh — offline API calls are handled by the app's own
  // queueing logic, not by the service worker.
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});

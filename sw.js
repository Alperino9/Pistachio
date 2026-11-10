// Pistachio Service Worker (PWA) - Network First Strategy
// Ensures updates appear instantly on regular F5 without aggressive cache locking.

const CACHE_NAME = 'pistachio-cache-v2';

self.addEventListener('install', (event) => {
  // Activate immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear all old caches on activation
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // External APIs (Groq, Open-Meteo) always go directly to network
  if (url.hostname.includes('groq.com') || url.hostname.includes('open-meteo.com')) {
    return;
  }

  // Network-First strategy: Always try to get freshest files from server first!
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache only when completely offline
        return caches.match(event.request);
      })
  );
});

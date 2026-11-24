const CACHE_NAME = 'noir-shell-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './noir-192.png',
  './noir-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('noir-shell-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === 'navigate';
  const isManifest = url.pathname.endsWith('/manifest.webmanifest');

  // Prefer fresh HTML and manifest files; use cache only when offline.
  if (isNavigation || isManifest) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;

        if (isNavigation) {
          const indexUrl = new URL('./index.html', self.registration.scope);
          const fallback = await caches.match(indexUrl);
          if (fallback) return fallback;
        }
        throw error;
      }
    })());
    return;
  }

  // Cache-first for app-shell images and other same-origin assets.
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});

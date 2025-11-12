// Simple service worker with safe caching (ignores non-http(s) requests)
const CACHE = 'bb-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/og-1200x630.png',
  './privacy.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k !== CACHE ? caches.delete(k) : null)
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Ignore requests that are not http(s) (e.g. chrome-extension://) to avoid cache errors
  try {
    if (!request.url.startsWith('http:') && !request.url.startsWith('https:')) return;
  } catch (err) {
    return;
  }

  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(resp => {
        // Only cache successful responses
        try {
          if (!resp || resp.status !== 200) return resp;
          const copy = resp.clone();
          caches.open(CACHE).then(c => {
            c.put(request, copy).catch(() => { /* ignore cache write errors */ });
          });
        } catch (err) {
          // ignore
        }
        return resp;
      }).catch(() => cached);
    })
  );
});

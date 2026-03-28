// LazEstate Service Worker v2.5
const CACHE_NAME = 'lazestate-v2.5';
const OFFLINE_URL = './index.html';

// Files to cache on install
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Install — cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - App shell (index.html): cache-first with network fallback
// - External APIs (Groq, maps, Overpass): network-only, never cache
// - CDN assets (Leaflet): cache-first
const NETWORK_ONLY = [
  'api.groq.com',
  'overpass-api.de',
  'nominatim.openstreetmap.org',
  'localhost:7844',
  'msc.fema.gov',
  'hazards.fema.gov'
];

const CDN_CACHE = [
  'cdnjs.cloudflare.com',
  'basemaps.cartocdn.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Always network-only for APIs
  if (NETWORK_ONLY.some(domain => url.includes(domain))) return;

  // Cache-first for CDN assets
  if (CDN_CACHE.some(domain => url.includes(domain))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // App shell: cache-first, fallback to network, fallback to offline
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL)
      );
    })
  );
});

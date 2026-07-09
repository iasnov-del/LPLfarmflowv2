const CACHE_NAME = 'farm-flow-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json?v=3',
  'https://cdn-icons-png.flaticon.com/512/3656/3656403.png'
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: NEVER cache or intercept API endpoints. Always send them direct to the network.
  if (url.pathname.startsWith('/api')) {
    return; // Let browser process normally
  }

  // Non-GET requests should always go to the network
  if (event.request.method !== 'GET') {
    return;
  }

  // Caching Strategy: Network First for index.html/root, Stale-While-Revalidate for other static assets
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Put the fresh HTML in the cache
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseCopy);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Stale-While-Revalidate for JS, CSS, images, manifest, and icons
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseCopy);
            });
          }
          return networkResponse;
        }).catch(() => null);

        // Return cached resource immediately if exists, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
    );
  }
});

/**
 * Secure Service Worker with Caching Strategy
 * Provides offline support and secure resource caching
 * Auto-updates based on VERSION - increment to clear all caches
 */

// INCREMENT THIS VERSION NUMBER TO FORCE CACHE INVALIDATION
const VERSION = '1.0.7';
const CACHE_NAME = `csdr-v${VERSION}`;
const RUNTIME_CACHE = `csdr-runtime-${VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login_page.html',
  '/home_page.html',
  '/manifest.json',
  '/assets/darab_logo192x192.png',
  '/assets/darab_logo512x512.png',
  '/css/login.css',
  '/css/dashboard.css',
  '/css/home_page.css',
  '/css/case_manage.css',
  '/style.css',

  '/components/caseManage.js',
  '/components/viewCases.js',
  '/components/dashboard.js',
  '/components/profile.js',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Installing v${VERSION}...`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[Service Worker] Some assets failed to cache:', err);
          // Continue even if some assets fail
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('[Service Worker] Skipping waiting - forcing activation');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and notify clients
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Activating v${VERSION}...`);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('[Service Worker] Cleaning up old caches...');
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete ALL old cache versions
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming all clients');
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients of the update
        return self.clients.matchAll();
      })
      .then((clients) => {
        clients.forEach((client) => {
          console.log('[Service Worker] Notifying client of update');
          client.postMessage({
            type: 'SW_UPDATED',
            version: VERSION
          });
        });
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests (unless necessary)
  if (url.origin !== location.origin && !url.href.includes('gstatic.com') && !url.href.includes('firebase')) {
    return; // Let browser handle it
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response
          const responseClone = response.clone();

          // Cache the response
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback to index.html for SPA routing
              return caches.match('/index.html');
            });
        })
    );
    return;
  }

  // Handle API requests (Firebase, etc.)
  if (url.pathname.includes('/__/') || url.href.includes('firebase') || url.href.includes('googleapis.com')) {
    // Network-first strategy for API calls
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try cache as fallback
          return caches.match(request);
        })
    );
    return;
  }

  // Handle static assets (images, CSS, JS)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Update cache in background
          fetch(request).then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
          }).catch(() => {
            // Ignore fetch errors for background update
          });

          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (response.status !== 200) {
              return response;
            }

            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });

            return response;
          })
          .catch(() => {
            // Return offline fallback for images
            if (request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ccc">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
          });
      })
  );
});

// Handle background sync (for offline actions)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Sync offline data when online
      syncOfflineData()
    );
  }
});

// Handle push notifications (if needed)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/assets/darab_logo192x192.png',
    badge: '/assets/darab_logo192x192.png',
    vibrate: [200, 100, 200],
    tag: 'notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('CSLTIV', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

// Helper function for syncing offline data
async function syncOfflineData() {
  // Implement offline data sync logic here
  // This could sync form submissions, case updates, etc.
  console.log('[Service Worker] Syncing offline data...');

  // Example: Get items from IndexedDB and sync
  // You can implement this based on your app's needs
}

// Handle message from main thread
self.addEventListener('message', (event) => {
  // console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

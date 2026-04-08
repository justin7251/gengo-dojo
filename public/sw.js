// Service worker for 言語道場
// Handles push notifications and offline caching

const CACHE_NAME = 'gengo-dojo-v1-1';
const OFFLINE_URLS = ['/', '/dashboard', '/flashcards'];

// ── Install ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch (network first, cache fallback) ─────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push notification received ────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: '言語道場', body: event.data.text() };
  }

  const options = {
    body:    data.body  ?? 'Time to study!',
    icon:    data.icon  ?? '/icon-192.png',
    badge:   '/icon-192.png',
    vibrate: [100, 50, 100],
    data:    { url: data.url ?? '/dashboard' },
    actions: [
      { action: 'study', title: 'Study now' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: false,
    tag: 'gengo-dojo-daily',  // replaces previous notification
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? '言語道場', options)
  );
});

// ── Notification click ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? '/dashboard';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Open new tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

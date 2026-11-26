self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'The Cougar Chronicle';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.message || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: data.url || '/sports' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/sports';
  event.waitUntil(self.clients.openWindow(url));
});

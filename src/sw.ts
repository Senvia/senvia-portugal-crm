/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Service Worker Version (increment to force update)
const SW_VERSION = '1.4.0';
const CURRENT_CACHE_PREFIX = `senvia-os-${SW_VERSION}`;
console.log(`[SW] Senvia OS Service Worker v${SW_VERSION} loaded`);

// Precache assets from Vite build
precacheAndRoute(self.__WB_MANIFEST);

// Activate immediately on install
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(self.skipWaiting());
});

// Take control immediately + nuke ALL old caches + reload open windows once
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + SW_VERSION + '...');
  event.waitUntil((async () => {
    // 1. Delete every cache that doesn't belong to this version (frees stale shells)
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => !name.startsWith(CURRENT_CACHE_PREFIX))
        .map((name) => {
          console.log('[SW] Deleting stale cache:', name);
          return caches.delete(name);
        })
    );

    // 2. Take control of any open clients
    await self.clients.claim();

    // 3. Force a one-time reload of every open window so the fresh shell loads
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(
      allClients.map((client) => {
        try {
          const url = new URL(client.url);
          // Avoid infinite loops by tagging this reload
          if (!url.searchParams.has('_swreload')) {
            url.searchParams.set('_swreload', SW_VERSION);
            return (client as WindowClient).navigate(url.toString());
          }
        } catch (e) {
          console.warn('[SW] reload skipped for client', e);
        }
        return Promise.resolve();
      })
    );
  })());
});

// Push notification handler with improved iOS support
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  let data: { title?: string; body?: string; tag?: string; url?: string } = {};
  
  try {
    data = event.data?.json() ?? {};
    console.log('[SW] Push data:', JSON.stringify(data));
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    data = { title: 'Senvia OS', body: event.data?.text() || 'Nova notificação' };
  }

  const options: NotificationOptions = {
    body: data.body || 'Nova atualização disponível',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'senvia-notification',
    data: { url: data.url || '/leads' },
    requireInteraction: true,
    silent: false,
  };

  console.log('[SW] Showing notification:', data.title, options);

  event.waitUntil(
    self.registration.showNotification(data.title || 'Senvia OS', options)
      .then(() => console.log('[SW] Notification shown successfully'))
      .catch((err) => console.error('[SW] Error showing notification:', err))
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/leads';
  console.log('[SW] Opening URL:', urlToOpen);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            (client as WindowClient).navigate(urlToOpen);
          }
          return;
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

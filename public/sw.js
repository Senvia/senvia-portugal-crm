// Minimal push-notification service worker.
// Does NOT cache anything — avoids stale-shell issues from old vite-plugin-pwa.
// Only handles push events and notification clicks.

self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      await self.clients.claim();
      // Clean up any old caches from previous PWA builds
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    })()
  );
});

// Show push notification
self.addEventListener("push", (e) => {
  let data = { title: "Senvia OS", body: "Nova notificação", url: "/dashboard" };

  try {
    if (e.data) {
      const payload = e.data.json();
      data = { ...data, ...payload };
    }
  } catch (_) {
    // If payload is plain text
    if (e.data) {
      data.body = e.data.text();
    }
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/dashboard" },
      vibrate: [200, 100, 200],
    })
  );
});

// Handle notification click — open or focus the app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  const url = e.notification.data?.url || "/dashboard";

  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if available
        for (const client of clients) {
          if (new URL(client.url).origin === self.location.origin && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Otherwise open new window
        return self.clients.openWindow(url);
      })
  );
});

// Pass-through fetch — no caching at all
self.addEventListener("fetch", () => {});

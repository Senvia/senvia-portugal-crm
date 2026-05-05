// Kill-switch service worker: nukes all caches and unregisters itself.
// Purpose: forcibly evict stale Workbox shells from devices that previously
// installed the old vite-plugin-pwa service worker.
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));

self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      try {
        await self.clients.claim();
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        await Promise.all(
          clients.map((c) => {
            try {
              const url = new URL(c.url);
              if (!url.searchParams.has("sw-cleanup")) {
                url.searchParams.set("sw-cleanup", Date.now().toString());
                return c.navigate(url.toString());
              }
            } catch (_) {}
            return Promise.resolve();
          })
        );
      } finally {
        try {
          await self.registration.unregister();
        } catch (_) {}
      }
    })()
  )
);

// Pass-through fetch (no caching).
self.addEventListener("fetch", () => {});

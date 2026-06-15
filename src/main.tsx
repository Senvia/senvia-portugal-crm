import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary, reloadOnce } from "./components/ErrorBoundary";

// When a lazily-loaded chunk fails to preload (e.g. a new deploy replaced the
// hashed files while this tab was open), Vite fires `vite:preloadError`.
// Auto-reload (once) instead of leaving the user on a blank screen.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    reloadOnce();
  });
}

// Register a lightweight push-notification service worker — production only.
// Skipped in dev: skipWaiting()+clients.claim() interfere with Vite HMR
// (the SW takes control of the page mid-session, breaking the WS connection
// and resetting React state). Push notifications don't exist in dev anyway.
if (typeof window !== "undefined" && "serviceWorker" in navigator && !import.meta.env.DEV) {
  (async () => {
    try {
      // Unregister any legacy SW that isn't our push worker
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        if (r.active?.scriptURL && !r.active.scriptURL.endsWith("/sw.js")) {
          await r.unregister().catch(() => {});
        }
      }
      // Register with updateViaCache:'none' to force network fetch (bypass CDN/browser cache)
      await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    } catch {
      // Non-critical — app works without SW, just no push notifications
    }
  })();
} else if (import.meta.env.DEV && typeof window !== "undefined" && "serviceWorker" in navigator) {
  // In dev: unregister any SW that might have been left over from a previous
  // production build served locally, so it doesn't interfere with HMR.
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

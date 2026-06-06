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

// Register a lightweight push-notification service worker.
// It does NOT cache anything (avoids stale shells from old vite-plugin-pwa).
// Without an active SW, push notifications fail — especially on iOS PWA.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
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
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

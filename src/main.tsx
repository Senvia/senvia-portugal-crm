import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register a lightweight push-notification service worker.
// It does NOT cache anything (avoids stale shells from old vite-plugin-pwa).
// Without an active SW, push notifications fail — especially on iOS PWA.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  // Clean up legacy kill-switch SW registered at /service-worker.js
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      for (const reg of regs) {
        // Only unregister old paths; keep /sw.js
        if (reg.active?.scriptURL && !reg.active.scriptURL.endsWith("/sw.js")) {
          reg.unregister().catch(() => {});
        }
      }
    })
    .catch(() => {});

  // Register the push SW
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register a lightweight push-notification service worker.
// It does NOT cache anything (avoids stale shells from old vite-plugin-pwa).
// Without an active SW, push notifications fail — especially on iOS PWA.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(async (regs) => {
      // First: unregister any legacy SW that isn't /sw.js
      await Promise.all(
        regs
          .filter((r) => r.active?.scriptURL && !r.active.scriptURL.endsWith("/sw.js"))
          .map((r) => r.unregister().catch(() => false))
      );
      // Then: register the push SW (after old ones are cleaned up)
      return navigator.serviceWorker.register("/sw.js");
    })
    .catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);

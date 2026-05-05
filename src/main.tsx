import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Eagerly nuke any previously installed service worker + caches.
// Older builds shipped vite-plugin-pwa workers that locked devices to a
// stale shell, hiding new UI (e.g., the Importar button on /leads).
// Running this on every page load guarantees a clean slate going forward.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      if (!regs.length) return;
      Promise.all(regs.map((r) => r.unregister().catch(() => false))).then(
        (results) => {
          if (results.some(Boolean) && "caches" in window) {
            caches
              .keys()
              .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
              .catch(() => {});
          }
        }
      );
    })
    .catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);

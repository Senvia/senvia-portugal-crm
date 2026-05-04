import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function PWAUpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Periodic check for new SW
      setInterval(() => {
        registration.update().catch(() => {});
      }, POLL_INTERVAL_MS);
    },
  });

  // Also check when tab regains focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker?.getRegistration().then((reg) => reg?.update().catch(() => {}));
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-primary/30 bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <RefreshCw className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Nova versão disponível</span>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          Atualizar agora
        </Button>
      </div>
    </div>
  );
}

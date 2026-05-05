import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

/**
 * Detects when the deployed bundle has changed (different /index.html hash)
 * and offers a one-click reload. No service worker required.
 */
const POLL_INTERVAL_MS = 5 * 60 * 1000;

async function fetchCurrentBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/?_=${Date.now()}`, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/\/assets\/index-[^"'\s]+\.js/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

export function PWAUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let baseline: string | null = null;

    const check = async () => {
      const current = await fetchCurrentBuildId();
      if (cancelled || !current) return;
      if (baseline === null) {
        baseline = current;
        return;
      }
      if (current !== baseline) setNeedRefresh(true);
    };

    void check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Best-effort: clean up any previously installed service worker that
    // might still be serving a stale shell from older builds.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister().catch(() => {})))
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-primary/30 bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <RefreshCw className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Nova versão disponível</span>
        <Button size="sm" onClick={() => window.location.reload()}>
          Atualizar agora
        </Button>
      </div>
    </div>
  );
}

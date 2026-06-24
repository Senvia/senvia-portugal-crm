import { Component, type ReactNode } from "react";

// Errors thrown when a lazily-loaded chunk no longer exists on the server
// (typical after a new deploy while an old tab is still open).
// NOTE: "Failed to fetch" alone is intentionally excluded — it also matches
// Supabase/API network errors that must NOT trigger an auto-reload loop.
const CHUNK_ERROR_RE =
  /Loading chunk|dynamically imported module|module script failed|ChunkLoadError|Failed to fetch dynamically imported module/i;

export function isChunkError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return CHUNK_ERROR_RE.test(msg);
}

// Reloads the page at most once per 10s window, so a persistently failing
// chunk doesn't cause an infinite reload loop. Returns true if it reloaded.
export function reloadOnce(): boolean {
  try {
    const KEY = "app:lastChunkReload";
    const now = Date.now();
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (now - last > 10000) {
      sessionStorage.setItem(KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    window.location.reload();
    return true;
  }
  return false;
}

type Phase = "ok" | "reloading" | "error";

export class ErrorBoundary extends Component<{ children: ReactNode }, { phase: Phase }> {
  state: { phase: Phase } = { phase: "ok" };

  static getDerivedStateFromError(error: unknown) {
    return { phase: isChunkError(error) ? ("reloading" as Phase) : ("error" as Phase) };
  }

  componentDidCatch(error: unknown) {
    console.error("[ErrorBoundary]", error);
    if (isChunkError(error)) {
      const reloaded = reloadOnce();
      if (!reloaded) this.setState({ phase: "error" });
    }
  }

  render() {
    if (this.state.phase === "reloading") {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-background text-muted-foreground text-sm">
          A atualizar…
        </div>
      );
    }
    if (this.state.phase === "error") {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background text-center p-6">
          <h1 className="text-xl font-semibold">Ocorreu um erro</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            Algo correu mal ao carregar a página. Tenta recarregar.
          </p>
          <button
            onClick={() => {
              try { sessionStorage.removeItem("app:lastChunkReload"); } catch { /* noop */ }
              window.location.reload();
            }}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

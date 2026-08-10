/**
 * localStorage that never throws.
 *
 * Reading `window.localStorage` is not always safe. It raises SecurityError in
 * contexts where the browser has disabled storage for the origin:
 *
 *   - a third-party frame with partitioned/blocked storage — which is exactly
 *     what the Chrome extension is when it renders the CRM inside WhatsApp Web
 *   - Safari private browsing
 *   - profiles configured to block all site data
 *
 * An unguarded call in a boot path takes the whole app down with a generic
 * error screen, which is what happened when the CRM was first framed. Every
 * other consumer in the codebase already wraps its access in try/catch
 * (usePersistedState, ErrorBoundary); this gives that the same treatment where
 * it was missing.
 *
 * Failure degrades to "no stored value", never to an exception.
 */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable — the value simply doesn't persist */
    }
  },

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

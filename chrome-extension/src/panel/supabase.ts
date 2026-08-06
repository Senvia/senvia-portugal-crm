import { createClient } from '@supabase/supabase-js';
import type { PairedSession, RuntimeResponse } from '../lib/protocol';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const CRM_ORIGIN = 'https://app.senvia.pt';

// The panel is an extension page, so it has its own persistent origin and
// storage. Once bootstrapped from the paired session it refreshes its own
// tokens like any normal Supabase client — the service worker is never in the
// hot path.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

function ask(message: unknown): Promise<RuntimeResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (res: RuntimeResponse) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message ?? 'runtime error' });
        return;
      }
      resolve(res ?? { ok: false, error: 'sem resposta' });
    });
  });
}

export async function getPairedSession(): Promise<PairedSession | null> {
  const res = await ask({ type: 'GET_SESSION' });
  return res.ok ? res.session : null;
}

export async function clearPairedSession(): Promise<void> {
  await ask({ type: 'CLEAR_SESSION' });
  await supabase.auth.signOut().catch(() => undefined);
}

export interface RestoreResult {
  session: PairedSession | null;
  /** True when tokens WERE stored but are no longer usable. */
  expired: boolean;
}

/**
 * Restores a usable Supabase session. Prefers the one this panel already owns
 * (it self-refreshes); only falls back to the handshake tokens on first run or
 * after they've been revoked.
 *
 * Supabase refresh tokens rotate and eventually expire, so a pairing left alone
 * for long enough stops working. That's reported as `expired` rather than as
 * "never paired" — the two look identical otherwise, and the stale tokens are
 * cleared so the next pairing starts from a clean slate.
 */
export async function restoreSession(): Promise<RestoreResult> {
  const paired = await getPairedSession();
  if (!paired) return { session: null, expired: false };

  const { data } = await supabase.auth.getSession();
  if (data.session) return { session: paired, expired: false };

  const { error } = await supabase.auth.setSession({
    access_token: paired.accessToken,
    refresh_token: paired.refreshToken,
  });
  if (error) {
    await clearPairedSession();
    return { session: null, expired: true };
  }
  return { session: paired, expired: false };
}

/**
 * Fires when the stored pairing changes — i.e. the agent just clicked "Ligar
 * extensão" in the CRM tab. Without this the panel would sit on the pairing
 * prompt until the WhatsApp tab was manually reloaded.
 */
export function onPairingChanged(cb: () => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === 'local' && changes['senvia.session']) cb();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

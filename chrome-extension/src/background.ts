import type { PairedSession, RuntimeRequest, RuntimeResponse } from './lib/protocol';

// MV3 service worker. Deliberately tiny: it only custodies the paired session.
// It must NOT hold the Supabase realtime socket — Chrome shuts this worker down
// after ~30s idle. Anything long-lived lives in the panel iframe instead.

const SESSION_KEY = 'senvia.session';

async function readSession(): Promise<PairedSession | null> {
  const bag = await chrome.storage.local.get(SESSION_KEY);
  return (bag?.[SESSION_KEY] as PairedSession | undefined) ?? null;
}

function isValidSession(s: unknown): s is PairedSession {
  const v = s as Partial<PairedSession> | null;
  return !!v && typeof v.accessToken === 'string' && typeof v.refreshToken === 'string'
    && typeof v.organizationId === 'string' && v.accessToken.length > 0
    && v.refreshToken.length > 0 && v.organizationId.length > 0;
}

chrome.runtime.onMessage.addListener(
  (message: RuntimeRequest, _sender, sendResponse: (r: RuntimeResponse) => void) => {
    (async () => {
      try {
        switch (message?.type) {
          case 'PAIR': {
            if (!isValidSession(message.session)) {
              sendResponse({ ok: false, error: 'Sessão inválida' });
              return;
            }
            await chrome.storage.local.set({ [SESSION_KEY]: message.session });
            sendResponse({ ok: true, session: message.session });
            return;
          }
          case 'GET_SESSION': {
            sendResponse({ ok: true, session: await readSession() });
            return;
          }
          case 'CLEAR_SESSION': {
            await chrome.storage.local.remove(SESSION_KEY);
            sendResponse({ ok: true, session: null });
            return;
          }
          default:
            sendResponse({ ok: false, error: 'Pedido desconhecido' });
        }
      } catch (e) {
        sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    // Keep the message channel open for the async work above.
    return true;
  },
);

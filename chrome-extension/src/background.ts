import type { PairedSession, RuntimeRequest, RuntimeResponse } from './lib/protocol';

// MV3 service worker. Deliberately tiny: it only custodies the paired session.
// It must NOT hold the Supabase realtime socket — Chrome shuts this worker down
// after ~30s idle. Anything long-lived lives in the panel iframe instead.

const SESSION_KEY = 'senvia.session';

/** The only origin allowed to hand over a session. See the PAIR case below. */
const CRM_ORIGIN = 'https://app.senvia.pt';

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
  (message: RuntimeRequest, sender, sendResponse: (r: RuntimeResponse) => void) => {
    (async () => {
      try {
        switch (message?.type) {
          case 'PAIR': {
            // Only the real CRM may hand over a session. The content script that
            // forwards this runs on whatever page matched the manifest, and a
            // page can postMessage to itself — so without this check any site
            // the script is injected into could plant its own tokens and
            // silently redirect the agent's notes, tasks and leads into another
            // organisation. Shape validation alone doesn't stop that.
            if (sender.origin !== CRM_ORIGIN) {
              sendResponse({ ok: false, error: 'Origem não autorizada' });
              return;
            }
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

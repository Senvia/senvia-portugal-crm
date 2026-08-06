import type { PairedSession, RuntimeRequest, RuntimeResponse } from './lib/protocol';

// MV3 service worker. Deliberately tiny: it only custodies the paired session.
// It must NOT hold the Supabase realtime socket — Chrome shuts this worker down
// after ~30s idle. Anything long-lived lives in the panel iframe instead.

const SESSION_KEY = 'senvia.session';
const CRM_TAB_KEY = 'senvia.crmTabId';
const CRM_ORIGIN = 'https://app.senvia.pt';

/**
 * Opens the CRM at a route, reusing the same tab each time.
 *
 * The CRM can't be embedded inside WhatsApp Web: their CSP `frame-src` blocks
 * third-party frames, and Chrome enforces it on nested frames too — so even an
 * extension page in between doesn't help. A dedicated tab is the version that
 * works without stripping WhatsApp's security headers.
 */
async function openCrm(route: string): Promise<void> {
  const url = `${CRM_ORIGIN}${route.startsWith('/') ? route : `/${route}`}`;
  const bag = await chrome.storage.local.get(CRM_TAB_KEY);
  const known = bag?.[CRM_TAB_KEY] as number | undefined;

  if (typeof known === 'number') {
    try {
      // Throws if the agent closed it since last time.
      await chrome.tabs.get(known);
      await chrome.tabs.update(known, { url, active: true });
      const tab = await chrome.tabs.get(known);
      if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true });
      return;
    } catch {
      /* fall through and open a fresh one */
    }
  }

  const created = await chrome.tabs.create({ url, active: true });
  if (created.id != null) await chrome.storage.local.set({ [CRM_TAB_KEY]: created.id });
}

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
          case 'OPEN_CRM': {
            await openCrm(message.route || '/dashboard');
            sendResponse({ ok: true, session: null });
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

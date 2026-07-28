import {
  CONTENT_SOURCE,
  PANEL_SOURCE,
  chatJidFromDataId,
  contactFromJid,
  phoneFromTitle,
  type ActiveContact,
  type DetectDiag,
  type PairedSession,
  type PanelToContent,
} from './lib/protocol';
import { resolvePhone } from './lib/wadb';

// One content script, two jobs, chosen by host:
//   web.whatsapp.com -> detect the open chat and mount the Senvia panel
//   app.senvia.pt    -> receive the pairing handshake from the CRM page
// Keeping it in a single bundle avoids a second build target.

const PANEL_WIDTH = 380;
const POLL_MS = 700;
const COLLAPSED_KEY = 'senvia-panel-collapsed';

// ---------------------------------------------------------------------------
// Pairing bridge (runs on the Senvia CRM origin)
// ---------------------------------------------------------------------------

function bootPairingBridge() {
  window.addEventListener('message', (event) => {
    // Only trust messages the CRM page posted to itself — never another frame.
    if (event.source !== window) return;
    const data = event.data as { source?: string; type?: string; session?: PairedSession };
    if (data?.source !== 'senvia-crm') return;

    // The page mounts after us, so it pings to ask whether we're here.
    if (data.type === 'PING') {
      window.postMessage({ source: 'senvia-extension', type: 'PRESENT' }, window.location.origin);
      return;
    }
    if (data.type !== 'PAIR' || !data.session) return;

    try {
      chrome.runtime.sendMessage({ type: 'PAIR', session: data.session }, (res) => {
        // Report back so the page can show success/failure to the user.
        const ok = !chrome.runtime.lastError && res?.ok;
        window.postMessage(
          {
            source: 'senvia-extension',
            type: 'PAIR_RESULT',
            ok: !!ok,
            error: chrome.runtime.lastError?.message ?? (ok ? null : 'Falha ao guardar a sessão'),
          },
          window.location.origin,
        );
      });
    } catch (e) {
      window.postMessage(
        { source: 'senvia-extension', type: 'PAIR_RESULT', ok: false, error: String(e) },
        window.location.origin,
      );
    }
  });

  // Announce presence so the CRM page can show "extensão detetada".
  window.postMessage({ source: 'senvia-extension', type: 'PRESENT' }, window.location.origin);
}

// ---------------------------------------------------------------------------
// WhatsApp Web panel
// ---------------------------------------------------------------------------

function injectStyles() {
  const style = document.createElement('style');
  style.id = 'senvia-panel-style';
  // The panel is a fixed overlay appended to <body>, deliberately OUTSIDE the
  // WhatsApp React root — anything mounted inside their tree gets wiped on the
  // next re-render. The app is shrunk with CSS instead of being reparented.
  style.textContent = `
    html.senvia-open #app { width: calc(100% - ${PANEL_WIDTH}px) !important; }
    #senvia-panel-root {
      position: fixed; top: 0; right: 0; height: 100vh; width: ${PANEL_WIDTH}px;
      z-index: 2147483000; background: #fff; border-left: 1px solid #e4e6eb;
      box-shadow: -2px 0 12px rgba(0,0,0,.06); display: none;
    }
    html.senvia-open #senvia-panel-root { display: block; }
    #senvia-panel-root iframe { width: 100%; height: 100%; border: 0; display: block; }
    #senvia-toggle {
      position: fixed; top: 12px; right: 12px; z-index: 2147483001;
      height: 32px; padding: 0 12px; border-radius: 16px; border: 1px solid #d1d7db;
      background: #fff; color: #111b21; font: 600 12px/32px system-ui, sans-serif;
      cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,.12);
    }
    html.senvia-open #senvia-toggle { right: ${PANEL_WIDTH + 12}px; }
    @media (prefers-color-scheme: dark) {
      #senvia-panel-root { background: #111b21; border-left-color: #2a3942; }
      #senvia-toggle { background: #202c33; color: #e9edef; border-color: #2a3942; }
    }
  `;
  document.head.appendChild(style);
}

function mountPanel(): HTMLIFrameElement {
  const root = document.createElement('div');
  root.id = 'senvia-panel-root';

  const iframe = document.createElement('iframe');
  // chrome-extension:// origin => own CSP, own storage, long-lived WebSocket.
  iframe.src = chrome.runtime.getURL('panel.html');
  iframe.title = 'Senvia OS';
  root.appendChild(iframe);
  document.body.appendChild(root);

  const toggle = document.createElement('button');
  toggle.id = 'senvia-toggle';
  toggle.type = 'button';
  const paint = () => {
    const open = document.documentElement.classList.contains('senvia-open');
    toggle.textContent = open ? 'Senvia ✕' : 'Senvia';
  };
  toggle.addEventListener('click', () => {
    const open = document.documentElement.classList.toggle('senvia-open');
    try {
      localStorage.setItem(COLLAPSED_KEY, open ? '0' : '1');
    } catch {
      /* storage blocked — the toggle still works for this session */
    }
    paint();
  });
  document.body.appendChild(toggle);

  let startCollapsed = false;
  try {
    startCollapsed = localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    /* ignore */
  }
  document.documentElement.classList.toggle('senvia-open', !startCollapsed);
  paint();

  return iframe;
}

const debugOn = () => {
  try {
    return localStorage.getItem('senvia-debug') === '1';
  } catch {
    return false;
  }
};

/**
 * Presence/status lines that live in the same header as the contact name.
 *
 * Naively taking the first `span[title]` picks these up instead of the name —
 * the name's span carries no `title` attribute, the status line's does. Matching
 * pt-PT and en, since the header follows the WhatsApp UI language.
 */
const STATUS_RE =
  /^(online|offline|a escrever|escrevendo|typing|a gravar|recording|visto por [úu]ltimo|[úu]ltima vez|last seen|clique aqui|toque aqui|click here|tap here|\d+ membros?|\d+ members?)/i;

/**
 * Reads the name (or raw number) WhatsApp shows for the open conversation.
 *
 * Walks every span in the header in DOM order and returns the first that isn't
 * a presence line — the name comes first visually, but not necessarily as the
 * first element carrying a `title` attribute.
 */
function readTitle(scope: ParentNode): string | null {
  const header = scope.querySelector('header');
  if (!header) return null;

  const candidates: string[] = [];
  header.querySelectorAll('span').forEach((s) => {
    const text = (s.getAttribute('title') || s.textContent || '').trim();
    // Length 2 skips emoji-only and icon spans without discarding short names.
    if (text.length >= 2 && !candidates.includes(text)) candidates.push(text);
  });

  // If every candidate is a presence line, we caught the header mid-transition.
  // Returning one would produce a bogus identity ("name:online") and remount the
  // panel onto the wrong contact — better to report nothing and retry next tick.
  return candidates.find((c) => !STATUS_RE.test(c)) ?? null;
}

/** How many `data-id` rows to inspect before giving up. */
const MAX_ROWS_SCANNED = 25;

/**
 * Identifies the conversation on screen.
 *
 * Scoped to the conversation pane ON PURPOSE — never the whole document. The
 * chat list in the left rail also carries `data-id` attributes, so a document
 * -wide scan would happily return whichever chat happens to be first in the
 * list instead of the open one. Scanning the full document every tick is also
 * ruinously expensive: WhatsApp's DOM runs to thousands of nodes.
 *
 * Every message row in the pane carries the same chat JID, so a handful of rows
 * is plenty.
 */
function readActiveContact(): { contact: ActiveContact | null; diag: DetectDiag } {
  const pane = document.querySelector('#main');
  if (!pane) {
    return { contact: null, diag: { mainFound: false, title: null, dataIdCount: 0, sample: [] } };
  }

  const title = readTitle(pane);
  const rows = pane.querySelectorAll('[data-id]');
  const diag: DetectDiag = {
    mainFound: true,
    title,
    dataIdCount: rows.length,
    sample: Array.from(rows)
      .slice(0, 3)
      .map((n) => n.getAttribute('data-id') ?? '')
      .filter(Boolean),
  };

  const limit = Math.min(rows.length, MAX_ROWS_SCANNED);
  for (let i = 0; i < limit; i++) {
    const jid = chatJidFromDataId(rows[i].getAttribute('data-id'));
    if (jid) return { contact: contactFromJid(jid, title), diag };
  }

  // No JID available (unsaved-contact layouts, or markup we don't recognise).
  // The header still identifies the chat: either the raw number, or the saved
  // contact's name — which the panel can match against the CRM by name.
  const phone = phoneFromTitle(title);
  if (phone) {
    return {
      contact: { jid: `${phone}@c.us`, phone, isGroup: false, isPrivacyId: false, name: title },
      diag,
    };
  }
  if (title) {
    return {
      contact: { jid: `name:${title}`, phone: '', isGroup: false, isPrivacyId: false, name: title },
      diag,
    };
  }

  if (debugOn()) console.log('[senvia] sem contacto', diag);
  return { contact: null, diag };
}

function bootWhatsApp() {
  injectStyles();
  const iframe = mountPanel();

  let current: ActiveContact | null = null;
  let currentDiag: DetectDiag = { mainFound: false, title: null, dataIdCount: 0, sample: [] };
  let panelReady = false;

  const post = () => {
    if (!panelReady) return;
    iframe.contentWindow?.postMessage(
      { source: CONTENT_SOURCE, type: 'CONTACT', contact: current, diag: currentDiag },
      '*',
    );
  };

  window.addEventListener('message', (event) => {
    if (event.source !== iframe.contentWindow) return;
    const data = event.data as PanelToContent;
    if (data?.source !== PANEL_SOURCE) return;
    if (data.type === 'READY') {
      panelReady = true;
      post();
    }
  });

  // Chats whose number we've already resolved (or failed to). Keyed by jid, so
  // flipping back to a conversation is instant and we never rescan storage.
  const phoneCache = new Map<string, string>();

  /**
   * The DOM gave us a chat but no number (saved contact, or an `@lid` privacy
   * id). Ask WhatsApp's own IndexedDB, then refresh the panel if the agent is
   * still looking at the same conversation.
   */
  const enrich = async (target: ActiveContact) => {
    const key = target.jid;
    const stillOpen = () => current?.jid === key;

    if (phoneCache.has(key)) {
      const cached = phoneCache.get(key) ?? '';
      if (cached && stillOpen() && current) {
        current = { ...current, phone: cached };
        post();
      }
      return;
    }

    const { contact, diag } = await resolvePhone(
      key.startsWith('name:') ? null : key,
      target.name,
    );
    phoneCache.set(key, contact?.phone ?? '');

    if (!stillOpen() || !current) return;
    currentDiag = { ...currentDiag, db: diag, resolvedVia: contact ? 'indexeddb' : null };
    if (contact?.phone) current = { ...current, phone: contact.phone, name: contact.name ?? current.name };
    if (debugOn()) console.log('[senvia] indexeddb', contact, diag);
    post();
  };

  const detect = () => {
    const { contact: next, diag } = readActiveContact();
    const changed =
      (next?.jid ?? null) !== (current?.jid ?? null) || (next?.name ?? null) !== (current?.name ?? null);
    currentDiag = { ...diag, resolvedVia: next?.phone ? 'dom' : null };
    if (!changed) return;
    current = next;
    if (debugOn()) console.log('[senvia] contacto', current, diag);
    post();
    if (next && !next.phone && !next.isGroup) void enrich(next);
  };

  // Switching chats is a click, so probe right after one instead of waiting for
  // the next poll tick. Several probes because the pane is populated
  // asynchronously — the first one often lands before the messages render.
  document.addEventListener(
    'click',
    () => [60, 200, 500, 1000].forEach((d) => window.setTimeout(detect, d)),
    true,
  );

  // Backstop for everything a click doesn't cover: keyboard navigation, chats
  // opened from a notification, the pane re-rendering on its own. Scoped
  // querySelector on one element — cheap enough to run continuously.
  setInterval(detect, POLL_MS);
  detect();
}

// ---------------------------------------------------------------------------

if (window.location.hostname === 'web.whatsapp.com') {
  if (document.body) bootWhatsApp();
  else window.addEventListener('DOMContentLoaded', bootWhatsApp, { once: true });
} else {
  bootPairingBridge();
}

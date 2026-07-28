import {
  CONTENT_SOURCE,
  PANEL_SOURCE,
  chatJidFromDataId,
  contactFromJid,
  type ActiveContact,
  type PairedSession,
  type PanelToContent,
} from './lib/protocol';

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

/** Reads the JID of the conversation currently rendered in the main pane. */
function readActiveContact(): ActiveContact | null {
  const main = document.querySelector('#main');
  if (!main) return null;

  // Every message row carries the chat JID, so the first one is enough.
  const row = main.querySelector('[data-id]');
  const jid = chatJidFromDataId(row?.getAttribute('data-id'));
  if (!jid) return null;

  const title = main.querySelector('header span[title]')?.getAttribute('title') ?? null;
  return contactFromJid(jid, title);
}

function bootWhatsApp() {
  injectStyles();
  const iframe = mountPanel();

  let current: ActiveContact | null = null;
  let panelReady = false;

  const post = () => {
    if (!panelReady) return;
    iframe.contentWindow?.postMessage(
      { source: CONTENT_SOURCE, type: 'CONTACT', contact: current },
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

  // A cheap poll beats fighting WhatsApp's re-renders with a MutationObserver:
  // one querySelector every 700ms is negligible, and it can't be defeated by
  // them replacing subtrees wholesale.
  setInterval(() => {
    const next = readActiveContact();
    const changed =
      (next?.jid ?? null) !== (current?.jid ?? null) || (next?.name ?? null) !== (current?.name ?? null);
    if (!changed) return;
    current = next;
    post();
  }, POLL_MS);
}

// ---------------------------------------------------------------------------

if (window.location.hostname === 'web.whatsapp.com') {
  if (document.body) bootWhatsApp();
  else window.addEventListener('DOMContentLoaded', bootWhatsApp, { once: true });
} else {
  bootPairingBridge();
}

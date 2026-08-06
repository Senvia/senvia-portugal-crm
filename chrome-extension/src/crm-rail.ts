// Left rail: one-click access to every CRM section from inside WhatsApp Web.
//
// WHY A TAB AND NOT AN OVERLAY: embedding the CRM here is not possible.
// WhatsApp Web's CSP carries a `frame-src` allowlist (their own domains,
// YouTube, Arkose, Trustly) and Chrome enforces it on NESTED frames too — so
// even loading an extension page in between, which is exempt from the host
// page's CSP itself, doesn't get the CRM through. Verified against the real
// violation report.
//
// The only way to embed would be stripping WhatsApp's CSP with
// declarativeNetRequest. That disables a real XSS mitigation on a page holding
// the user's messages, and is a reliable Web Store rejection — not a decision
// to make silently.
//
// So the rail reuses ONE dedicated tab: clicking a section loads it there and
// focuses it, instead of littering the browser with tabs.

/**
 * Exported so the panel's stylesheet can subtract it from #app's width. All the
 * #app sizing lives in content.ts, in ONE rule — two stylesheets each nudging
 * the same element is what mangled WhatsApp's layout before.
 */
export const RAIL_W = 52;

/** Mirrors allNavItems in AppSidebar.tsx — keep in sync when the CRM changes. */
const NAV: { route: string; label: string; icon: string }[] = [
  { route: '/dashboard', label: 'Painel', icon: '▤' },
  { route: '/leads', label: 'Leads', icon: '◎' },
  { route: '/inbox', label: 'Caixa de Entrada', icon: '✉' },
  { route: '/clients', label: 'Clientes', icon: '☺' },
  { route: '/proposals', label: 'Propostas', icon: '◫' },
  { route: '/sales', label: 'Vendas', icon: '★' },
  { route: '/financeiro', label: 'Financeiro', icon: '€' },
  { route: '/calendar', label: 'Agenda', icon: '▦' },
  { route: '/marketing', label: 'Marketing', icon: '✦' },
];

export function mountCrmRail() {
  const style = document.createElement('style');
  style.id = 'senvia-crm-style';
  style.textContent = `
    #senvia-rail {
      position: fixed; top: 0; left: 0; bottom: 0; width: ${RAIL_W}px;
      z-index: 2147483004; background: #111b21; border-right: 1px solid #2a3942;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 8px 0; overflow-y: auto;
    }
    #senvia-rail .logo {
      color: #00a884; font: 700 11px/1 system-ui, sans-serif;
      margin-bottom: 6px; letter-spacing: .02em; flex: 0 0 auto;
    }
    #senvia-rail button {
      width: 38px; height: 38px; flex: 0 0 auto; border: 0; border-radius: 9px;
      cursor: pointer; background: transparent; color: #8696a0; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: background .12s ease, color .12s ease;
    }
    #senvia-rail button:hover { background: #202c33; color: #e9edef; }
    #senvia-rail button:active { background: #00a884; color: #111b21; }
  `;
  document.head.appendChild(style);

  const rail = document.createElement('div');
  rail.id = 'senvia-rail';

  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.textContent = 'SV';
  logo.title = 'Senvia OS';
  rail.appendChild(logo);

  for (const item of NAV) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.icon;
    b.title = item.label;
    b.addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({ type: 'OPEN_CRM', route: item.route });
      } catch {
        // Extension context invalidated (reloaded mid-session) — the plain
        // navigation still gets the agent where they wanted to go.
        window.open(`https://app.senvia.pt${item.route}`, '_blank', 'noopener');
      }
    });
    rail.appendChild(b);
  }

  document.body.appendChild(rail);
  document.documentElement.classList.add('senvia-rail');
}

// Rail down the left edge of WhatsApp Web, and the CRM screens it opens.
//
// Clicking a section covers WhatsApp with it, in place: no navigation, no new
// tab, no reload. WhatsApp keeps running underneath, so closing lands back on
// the same conversation exactly as it was.
//
// It is the REAL Senvia OS: the app's own source compiled into the extension and
// served from crm-app.html. Same components, same features as the website.
//
// It could NOT be an iframe of app.senvia.pt — WhatsApp Web's CSP carries a
// `frame-src` allowlist (their domains, YouTube, Arkose, Trustly) and Chrome
// enforces it on nested frames too, so even an extension page in between
// doesn't get an external site through. Verified against the real violation
// report. Extension pages themselves ARE exempt, which is what makes bundling
// the app work where embedding the site does not.

const WHATSAPP_URL = 'https://web.whatsapp.com/';
const RAIL_W = 52;

/** Exported so content.ts can subtract it from #app's width in ONE place. */
export { RAIL_W };

/** Routes of the bundled CRM. Mirrors allNavItems in AppSidebar.tsx. */
const NAV: { section: string; label: string; icon: string }[] = [
  { section: "/dashboard", label: "Painel", icon: "▤" },
  { section: "/leads", label: "Leads", icon: "◎" },
  { section: "/inbox", label: "Caixa de Entrada", icon: "✉" },
  { section: "/clients", label: "Clientes", icon: "☺" },
  { section: "/proposals", label: "Propostas", icon: "▫" },
  { section: "/sales", label: "Vendas", icon: "★" },
  { section: "/financeiro", label: "Financeiro", icon: "€" },
  { section: "/calendar", label: "Agenda", icon: "▦" },
  { section: "/marketing", label: "Marketing", icon: "✦" },
];

// Colours are the CRM's sidebar tokens from src/index.css, resolved to literals:
// this stylesheet is injected into WhatsApp's page, which has none of our CSS
// variables. Kept in sync with src/theme.css by hand.
//   --sidebar-background 222 47% 8%   --sidebar-foreground 220 14% 96%
//   --sidebar-accent     222 47% 14%  --sidebar-border     222 47% 16%
//   --sidebar-muted      220 9% 46%   --primary            217 91% 60%
const RAIL_CSS = `
  #senvia-rail {
    position: fixed; top: 0; left: 0; bottom: 0; width: ${RAIL_W}px;
    z-index: 2147483004;
    background: hsl(222 47% 8%); border-right: 1px solid hsl(222 47% 16%);
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 10px 0; overflow-y: auto;
  }
  #senvia-rail .logo {
    color: hsl(217 91% 60%); letter-spacing: .02em; flex: 0 0 auto;
    font: 700 11px/1 Inter, system-ui, sans-serif; margin-bottom: 8px;
  }
  #senvia-rail button {
    width: 38px; height: 38px; flex: 0 0 auto; border: 0; border-radius: 8px;
    cursor: pointer; background: transparent; color: hsl(220 9% 60%); font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    transition: background-color .15s ease, color .15s ease;
  }
  #senvia-rail button:hover { background: hsl(222 47% 14%); color: hsl(220 14% 96%); }
  #senvia-rail button.active {
    background: hsl(217 91% 60%); color: hsl(0 0% 100%);
  }
`;

/** Rail on WhatsApp Web: swap the screen for a CRM section, in place. */
export function mountCrmRail() {
  const style = document.createElement('style');
  style.id = 'senvia-crm-style';
  style.textContent = `
    ${RAIL_CSS}
    /* Covers everything right of the rail. WhatsApp keeps running underneath,
       so closing lands back on the same conversation with no reload. */
    #senvia-app {
      position: fixed; top: 0; left: ${RAIL_W}px; right: 0; bottom: 0;
      z-index: 2147483003; background: hsl(0 0% 98%); display: none;
    }
    html.senvia-app-open #senvia-app { display: block; }
    #senvia-app iframe { width: 100%; height: 100%; border: 0; display: block; }
  `;
  document.head.appendChild(style);

  // The CRM screens live in an extension page — exempt from WhatsApp's CSP,
  // which is what makes this possible at all. Created lazily on first use.
  const overlay = document.createElement('div');
  overlay.id = 'senvia-app';
  const frame = document.createElement('iframe');
  frame.title = 'Senvia OS';
  overlay.appendChild(frame);
  document.body.appendChild(overlay);

  const rail = document.createElement('div');
  rail.id = 'senvia-rail';

  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.textContent = 'SV';
  logo.title = 'Senvia OS';
  rail.appendChild(logo);

  const buttons = new Map<string, HTMLButtonElement>();
  let current = '';

  const isOpen = () => document.documentElement.classList.contains('senvia-app-open');
  const paint = () => {
    for (const [k, b] of buttons) b.classList.toggle('active', isOpen() && k === current);
  };

  const close = () => {
    document.documentElement.classList.remove('senvia-app-open');
    paint();
  };

  /**
   * Opens the REAL CRM at a route, in place over WhatsApp.
   *
   * `crm-app.html` is the Senvia OS app itself compiled into the extension —
   * same components, same features as the website. It uses HashRouter, so a
   * section change is just a hash change: no reload, and the app keeps its
   * state and scroll position.
   */
  const show = (route: string) => {
    const url = chrome.runtime.getURL(`crm-app.html#${route}`);
    if (!frame.src) {
      frame.src = url;
    } else if (current !== route) {
      // Same document, new hash — React Router navigates without a reload.
      frame.contentWindow?.location.replace(url);
    }
    current = route;
    document.documentElement.classList.add('senvia-app-open');
    paint();
  };

  for (const item of NAV) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.icon;
    b.title = item.label;
    b.addEventListener('click', () => {
      // Clicking the section you're on closes it — one button, both ways.
      if (isOpen() && current === item.section) close();
      else show(item.section);
    });
    buttons.set(item.section, b);
    rail.appendChild(b);
  }


  document.body.appendChild(rail);
  document.documentElement.classList.add('senvia-rail');

  // The overlay's own "✕ WhatsApp" button asks us to close.
  window.addEventListener('message', (e) => {
    if (e.source !== frame.contentWindow) return;
    const d = e.data as { source?: string; type?: string };
    if (d?.source === 'senvia-app' && d.type === 'CLOSE') close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close();
  });
}

/**
 * Counterpart on the CRM: a way back to WhatsApp without hunting for the tab.
 *
 * Deliberately a single floating button rather than the full rail — the CRM
 * already has its own sidebar, and duplicating it would just shift the layout
 * and confuse which nav is which.
 */
export function mountBackToWhatsApp() {
  const style = document.createElement('style');
  style.id = 'senvia-back-style';
  style.textContent = `
    #senvia-back {
      position: fixed; left: 16px; bottom: 16px; z-index: 2147483004;
      display: flex; align-items: center; gap: 7px;
      height: 38px; padding: 0 14px; border: 0; border-radius: 19px;
      background: #25d366; color: #05130a; cursor: pointer;
      font: 600 12px/1 system-ui, sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,.22);
      transition: filter .12s ease;
    }
    #senvia-back:hover { filter: brightness(1.06); }
    #senvia-back .dot {
      width: 8px; height: 8px; border-radius: 50%; background: #05130a; opacity: .5;
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'senvia-back';
  btn.type = 'button';
  btn.title = 'Voltar ao WhatsApp Web';
  const dot = document.createElement('span');
  dot.className = 'dot';
  const label = document.createElement('span');
  label.textContent = 'WhatsApp';
  btn.append(dot, label);
  btn.addEventListener('click', () => window.location.assign(WHATSAPP_URL));

  const attach = () => document.body.appendChild(btn);
  if (document.body) attach();
  else window.addEventListener('DOMContentLoaded', attach, { once: true });
}

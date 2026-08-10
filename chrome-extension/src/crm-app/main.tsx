import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from '@/App';
import { supabase } from '@/integrations/supabase/client';
import { ExtensionErrorBoundary } from './ExtensionErrorBoundary';
import { PaidTrafficFilterProvider } from '@/contexts/PaidTrafficFilterContext';
import '@/index.css';

// The real Senvia OS, running inside the Chrome extension.
//
// Not an iframe of app.senvia.pt — WhatsApp Web's CSP `frame-src` allowlist
// blocks that, and Chrome enforces it on nested frames too. This is the app's
// own source, compiled into the extension, served from a chrome-extension://
// page. Extension pages are exempt from the host page's CSP, so it renders
// inside WhatsApp Web with the real components and real behaviour.
//
// Three differences from the website, all handled here:
//   1. HashRouter — the pathname is /crm-app.html, which matches no route.
//   2. The session has to be injected: extension pages get their own storage
//      partition, so the agent's website login isn't visible here.
//   3. No service worker registration — there's no /sw.js at this origin, and
//      push notifications belong to the website.

const SESSION_KEY = 'senvia.session';

interface PairedSession {
  accessToken: string;
  refreshToken: string;
}

/**
 * Hands the paired tokens to the CRM's own Supabase client before React mounts.
 *
 * Order matters: AuthContext reads the session on mount and bounces to the
 * login screen if there isn't one. Setting it first means the app boots
 * straight into the dashboard, exactly as it does on the website.
 */
/** A session object is not proof the token still works — ask the server. */
async function tokenIsLive(): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser();
  return !error && !!data.user;
}

async function bootstrapSession(): Promise<boolean> {
  try {
    // A session may already be stored for this extension origin, but stored is
    // not the same as valid: an expired one is returned happily by getSession()
    // and then every edge function call fails with a 500 ("Auth error"), which
    // reads as a broken app rather than an expired login. Verify before
    // trusting it, and fall through to the paired tokens if it's dead.
    const { data } = await supabase.auth.getSession();
    if (data.session && (await tokenIsLive())) return true;

    const bag = await chrome.storage.local.get(SESSION_KEY);
    const paired = bag?.[SESSION_KEY] as PairedSession | undefined;
    if (!paired?.accessToken || !paired?.refreshToken) return false;

    const { error } = await supabase.auth.setSession({
      access_token: paired.accessToken,
      refresh_token: paired.refreshToken,
    });

    if (error) {
      // Only discard the pairing when the server actually rejected it. setSession
      // hits the network in both of its branches, so a flaky connection or the
      // 15s auth timeout also arrives here — and throwing the tokens away for
      // that would force the agent to re-pair after every blip. supabase-js
      // itself refuses to drop a session on a retryable fetch error, which is
      // exactly the distinction being made here: 4xx is definitive, anything
      // else (including status 0 from an abort) is transient.
      const status = (error as { status?: number }).status;
      const definitive = typeof status === 'number' && status >= 400 && status < 500;
      if (definitive) await chrome.storage.local.remove(SESSION_KEY);
      return false;
    }

    if (!(await tokenIsLive())) return false;
    return true;
  } catch {
    return false;
  }
}

function renderUnpaired() {
  const root = document.getElementById('root')!;
  root.innerHTML = `
    <div style="height:100vh;display:flex;flex-direction:column;gap:10px;
                align-items:center;justify-content:center;text-align:center;
                font:14px/1.5 Inter,system-ui,sans-serif;color:#667781">
      <strong style="font-size:15px;color:#111b21">Liga ao Senvia OS</strong>
      <span>Abre o Senvia, entra na tua conta e clica em “Ligar extensão”.</span>
      <a href="https://app.senvia.pt/extension-auth" target="_blank" rel="noopener"
         style="background:hsl(217 91% 60%);color:#fff;text-decoration:none;
                border-radius:8px;padding:9px 16px;font-weight:600;margin-top:4px">
        Abrir Senvia OS
      </a>
    </div>`;
}

/**
 * Surfaces runtime errors inside the overlay itself.
 *
 * The CRM runs in an iframe, so its console is separate from WhatsApp's — the
 * error is invisible unless you know to right-click the panel and inspect. A
 * banner in the page means a screenshot carries the actual message, instead of
 * the minified bundle it points at.
 *
 * Deliberately catches `unhandledrejection` too: ErrorBoundary only sees errors
 * thrown during render, and the failures here have all been async.
 */
function showError(label: string, err: unknown) {
  const msg =
    err instanceof Error ? `${err.name}: ${err.message}` : typeof err === 'string' ? err : JSON.stringify(err);

  let box = document.getElementById('senvia-error');
  if (!box) {
    box = document.createElement('div');
    box.id = 'senvia-error';
    box.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;max-height:40vh;overflow:auto;' +
      'background:#7f1d1d;color:#fff;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;' +
      'padding:10px 40px 10px 12px;white-space:pre-wrap;word-break:break-word';
    const close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText =
      'position:absolute;top:6px;right:8px;background:transparent;border:0;color:#fff;' +
      'font-size:14px;cursor:pointer';
    close.onclick = () => box?.remove();
    box.appendChild(close);
    document.body.appendChild(box);
  }
  const line = document.createElement('div');
  line.textContent = `[${label}] ${msg}`;
  box.appendChild(line);
}

window.addEventListener('error', (e) => showError('erro', e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showError('promessa', e.reason));

void (async () => {
  const ok = await bootstrapSession();
  if (!ok) {
    renderUnpaired();
    return;
  }

  // Land on the dashboard: "/" is the login screen, which would only flash
  // before ProtectedRoute redirects away from it.
  if (!window.location.hash || window.location.hash === '#/') {
    window.location.hash = '#/dashboard';
  }

  createRoot(document.getElementById('root')!).render(
    <ExtensionErrorBoundary>
      <PaidTrafficFilterProvider>
        <App Router={HashRouter} />
      </PaidTrafficFilterProvider>
    </ExtensionErrorBoundary>,
  );
})();

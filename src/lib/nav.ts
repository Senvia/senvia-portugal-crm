/**
 * Full-page navigation that also works inside the Chrome extension.
 *
 * A few places deliberately do a hard reload rather than a router navigation —
 * after login or after creating an organisation — because AuthContext has to
 * re-read the active org from a clean slate.
 *
 * `window.location.href = '/dashboard'` breaks in the extension: the page is
 * served from `chrome-extension://<id>/crm-app.html`, so that resolves to
 * `chrome-extension://<id>/dashboard`, a file that doesn't exist in the bundle.
 * The frame dies with ERR_FILE_NOT_FOUND and the overlay is unusable until it's
 * closed and reopened.
 *
 * There the app runs under HashRouter, so the equivalent is to set the hash and
 * reload the one page that does exist.
 */
export function hardGo(path: string): void {
  const to = path.startsWith('/') ? path : `/${path}`;

  if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:') {
    window.location.hash = `#${to}`;
    window.location.reload();
    return;
  }

  window.location.href = to;
}

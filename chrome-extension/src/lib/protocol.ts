// Shared vocabulary between the content script, the service worker and the panel.

/** Identity of the WhatsApp chat currently open on screen. */
export interface ActiveContact {
  /** Raw WhatsApp JID, e.g. "351912345678@c.us" or "1203630...@g.us". */
  jid: string;
  /** Digits only, international form. Empty when the JID carries no real number. */
  phone: string;
  isGroup: boolean;
  /**
   * True for `@lid` JIDs — WhatsApp's privacy addressing, which replaces the
   * phone number with an opaque id. We can't match those against the CRM.
   */
  isPrivacyId: boolean;
  /** Contact name as shown in the WhatsApp header, when we can read it. */
  name: string | null;
}

/** Paired Senvia session handed over by the CRM tab. */
export interface PairedSession {
  accessToken: string;
  refreshToken: string;
  organizationId: string;
  organizationName: string | null;
  userEmail: string | null;
  pairedAt: number;
}

// --- Page (content script) <-> panel iframe, over window.postMessage ---------

export const PANEL_SOURCE = 'senvia-panel';
export const CONTENT_SOURCE = 'senvia-content';

export type PanelToContent =
  /** Panel finished booting and wants the current contact. */
  | { source: typeof PANEL_SOURCE; type: 'READY' }
  /** User collapsed/expanded the panel from inside the iframe. */
  | { source: typeof PANEL_SOURCE; type: 'SET_COLLAPSED'; collapsed: boolean };

/**
 * What the detector actually saw in the page. Surfaced in the panel so DOM
 * drift in WhatsApp Web can be diagnosed from a screenshot, without asking
 * anyone to open a console.
 */
export interface DetectDiag {
  mainFound: boolean;
  title: string | null;
  dataIdCount: number;
  sample: string[];
  /** Where the phone number ultimately came from, once we have one. */
  resolvedVia?: 'dom' | 'indexeddb' | null;
  /** What the IndexedDB lookup saw, when the DOM alone wasn't enough. */
  db?: {
    databases: string[];
    scannedStores: string[];
    recordsScanned: number;
    error: string | null;
  } | null;
}

export type ContentToPanel =
  | {
      source: typeof CONTENT_SOURCE;
      type: 'CONTACT';
      contact: ActiveContact | null;
      diag: DetectDiag;
    };

// --- Content script / panel <-> service worker, over chrome.runtime ----------

export type RuntimeRequest =
  /** Sent by the CRM tab's content script after the user clicks "Ligar". */
  | { type: 'PAIR'; session: PairedSession }
  /** Panel bootstrapping: fetch the stored session. */
  | { type: 'GET_SESSION' }
  /** User signed out from the panel. */
  | { type: 'CLEAR_SESSION' }
  /** Rail click: open the CRM at a route, reusing a single dedicated tab. */
  | { type: 'OPEN_CRM'; route: string };

export type RuntimeResponse =
  | { ok: true; session: PairedSession | null }
  | { ok: false; error: string };

// --- Phone helpers ----------------------------------------------------------

/**
 * The join key used across the whole CRM: last 9 digits of the phone number.
 * Mirrors `notePhoneKey` / `phoneSuffix` in the app so a WhatsApp chat resolves
 * to the same lead/client the Senvia inbox would resolve it to.
 */
export function phoneKey(phone: string | null | undefined): string {
  return String(phone ?? '').replace(/\D/g, '').slice(-9);
}

/**
 * Matches a WhatsApp JID anywhere inside a string.
 *
 * Servers seen in the wild: `c.us` (contact), `g.us` (group), `lid` (privacy
 * addressing), `s.whatsapp.net` (raw protocol form). Group ids carry a
 * `<creator>-<timestamp>` user part, hence the optional dash segment.
 */
const JID_RE = /(\d+(?:-\d+)?)@(c\.us|g\.us|lid|s\.whatsapp\.net)/;

/**
 * Pulls the chat JID out of the `data-id` attribute WhatsApp Web puts on
 * message rows.
 *
 * The documented format is `{fromMe}_{chatJid}_{messageId}` (plus a trailing
 * `_{participantJid}` in groups), but the separator layout has changed between
 * releases — so we scan for the first JID-shaped token instead of splitting on
 * '_' and trusting a fixed position. In groups the chat JID always precedes the
 * participant JID, so "first match" stays correct.
 */
export function chatJidFromDataId(dataId: string | null | undefined): string | null {
  if (!dataId) return null;
  const m = dataId.match(JID_RE);
  return m ? `${m[1]}@${m[2]}` : null;
}

/**
 * Last-resort identification: for contacts that aren't saved in the address
 * book, WhatsApp shows the raw number as the conversation title
 * ("+351 969 829 933"). That's enough to reach the CRM.
 */
export function phoneFromTitle(title: string | null | undefined): string | null {
  const t = String(title ?? '').trim();
  if (!t.startsWith('+')) return null;
  const digits = t.replace(/\D/g, '');
  return digits.length >= 9 ? digits : null;
}

/** Turns a WhatsApp JID into the contact shape the panel consumes. */
export function contactFromJid(jid: string, name: string | null = null): ActiveContact {
  const [rawUser, server = ''] = jid.split('@');
  const isGroup = server === 'g.us';
  // `@lid` is WhatsApp's privacy addressing: an opaque id, never a phone number.
  const isPrivacyId = server === 'lid';
  // Group JIDs look like "<creator>-<timestamp>" — the digits are not a contact
  // number, so never expose them as one.
  const phone = isGroup || isPrivacyId ? '' : (rawUser || '').replace(/\D/g, '');
  return { jid, phone, isGroup, isPrivacyId, name };
}

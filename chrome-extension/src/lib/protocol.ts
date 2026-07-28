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

export type ContentToPanel =
  | { source: typeof CONTENT_SOURCE; type: 'CONTACT'; contact: ActiveContact | null };

// --- Content script / panel <-> service worker, over chrome.runtime ----------

export type RuntimeRequest =
  /** Sent by the CRM tab's content script after the user clicks "Ligar". */
  | { type: 'PAIR'; session: PairedSession }
  /** Panel bootstrapping: fetch the stored session. */
  | { type: 'GET_SESSION' }
  /** User signed out from the panel. */
  | { type: 'CLEAR_SESSION' };

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
 * Parses the `data-id` attribute WhatsApp Web puts on every message row.
 *
 * Format: `{fromMe}_{chatJid}_{messageId}` and, in groups, a trailing
 * `_{participantJid}`. The chat JID is the stable part we care about — every
 * message in the open conversation carries the same one, so reading a single
 * row is enough to know which chat is on screen.
 */
export function chatJidFromDataId(dataId: string | null | undefined): string | null {
  if (!dataId) return null;
  const parts = dataId.split('_');
  if (parts.length < 3) return null;
  const jid = parts[1];
  if (!jid || !jid.includes('@')) return null;
  return jid;
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

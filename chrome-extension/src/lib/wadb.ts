// Resolving a chat to a real phone number by reading WhatsApp Web's own
// IndexedDB.
//
// Why not the DOM: WhatsApp renders the contact NAME in the header, never the
// number, and message rows increasingly carry `@lid` (privacy addressing)
// instead of the phone. Scraping obfuscated markup for something that isn't
// there can't be made reliable.
//
// A content script shares the page's ORIGIN, so `indexedDB` here is literally
// WhatsApp's own storage — the same structured records the app reads. No page
// -context injection, no CSP games, no webpack hooking.
//
// Everything is discovered at runtime rather than hardcoded: store names have
// changed across releases, so we enumerate and shape-match instead of assuming.

/** A contact-ish record we managed to pull out of WhatsApp's storage. */
export interface WaContact {
  phone: string;
  name: string | null;
  jid: string | null;
}

export interface WaDbDiag {
  databases: string[];
  scannedStores: string[];
  recordsScanned: number;
  error: string | null;
}

/** Stores worth walking. Messages are huge and hold nothing we need. */
const STORE_HINT = /contact|chat|participant/i;
/** Ceiling per store, so a pathological database can't hang the page. */
const MAX_RECORDS = 8000;

function openDb(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(name);
    } catch {
      resolve(null);
      return;
    }
    // Never block: if another tab holds an upgrade, just give up quietly.
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
    setTimeout(() => resolve(null), 3000);
  });
}

/**
 * WhatsApp ids come in several shapes across versions: a plain
 * "351912345678@c.us" string, or an object { user, server, _serialized }.
 */
function idToJid(id: unknown): string | null {
  if (typeof id === 'string') return id.includes('@') ? id : null;
  if (id && typeof id === 'object') {
    const o = id as Record<string, unknown>;
    if (typeof o._serialized === 'string' && o._serialized.includes('@')) return o._serialized;
    if (typeof o.user === 'string' && typeof o.server === 'string') return `${o.user}@${o.server}`;
  }
  return null;
}

/** Only `c.us` / `s.whatsapp.net` carry a real number — `lid` and `g.us` don't. */
function phoneFromJid(jid: string | null): string {
  if (!jid) return '';
  const [user, server] = jid.split('@');
  if (server !== 'c.us' && server !== 's.whatsapp.net') return '';
  const digits = (user || '').replace(/\D/g, '');
  return digits.length >= 9 ? digits : '';
}

/** Every name a record might be known by, across schema versions. */
function namesOf(rec: Record<string, unknown>): string[] {
  const keys = ['name', 'pushname', 'formattedTitle', 'notifyName', 'verifiedName', 'shortName'];
  return keys
    .map((k) => rec[k])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

function readStore(
  db: IDBDatabase,
  store: string,
  visit: (rec: Record<string, unknown>) => boolean,
): Promise<number> {
  return new Promise((resolve) => {
    let seen = 0;
    let tx: IDBTransaction;
    try {
      tx = db.transaction(store, 'readonly');
    } catch {
      resolve(0);
      return;
    }
    const req = tx.objectStore(store).openCursor();
    req.onerror = () => resolve(seen);
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(seen);
        return;
      }
      seen++;
      const value = cursor.value;
      // `visit` returns true when it's found what it wanted.
      if (value && typeof value === 'object' && visit(value as Record<string, unknown>)) {
        resolve(seen);
        return;
      }
      if (seen >= MAX_RECORDS) {
        resolve(seen);
        return;
      }
      cursor.continue();
    };
    setTimeout(() => resolve(seen), 5000);
  });
}

/**
 * Finds the phone number for a chat, given whatever we could read from the DOM.
 *
 * `jid` wins when it already carries a number. Otherwise we look the contact up
 * by the name shown in the header — matched against WhatsApp's OWN records, so
 * there's no spelling or accent drift to worry about, unlike matching the CRM's
 * copy of the name.
 *
 * A `@lid` jid is also resolvable: records that use one usually keep the real
 * id alongside it.
 */
export async function resolvePhone(
  jid: string | null,
  name: string | null,
): Promise<{ contact: WaContact | null; diag: WaDbDiag }> {
  const diag: WaDbDiag = { databases: [], scannedStores: [], recordsScanned: 0, error: null };

  const direct = phoneFromJid(jid);
  if (direct) return { contact: { phone: direct, name, jid }, diag };

  const wantedName = name ? norm(name) : '';
  const wantedLid = jid && jid.endsWith('@lid') ? jid : null;
  if (!wantedName && !wantedLid) return { contact: null, diag };

  try {
    const list = (await indexedDB.databases?.()) ?? [];
    diag.databases = list.map((d) => d.name ?? '').filter(Boolean);

    let found: WaContact | null = null;

    for (const dbName of diag.databases) {
      if (found) break;
      const db = await openDb(dbName);
      if (!db) continue;

      const stores = Array.from(db.objectStoreNames).filter((s) => STORE_HINT.test(s));
      for (const store of stores) {
        if (found) break;
        diag.scannedStores.push(`${dbName}/${store}`);

        diag.recordsScanned += await readStore(db, store, (rec) => {
          const recJid = idToJid(rec.id);
          const phone = phoneFromJid(recJid);
          if (!phone) return false;

          // Same contact reached via its privacy id.
          if (wantedLid) {
            const lid = idToJid(rec.lid) ?? (typeof rec.lid === 'string' ? rec.lid : null);
            if (lid === wantedLid) {
              found = { phone, name: namesOf(rec)[0] ?? name, jid: recJid };
              return true;
            }
          }

          if (wantedName && namesOf(rec).some((n) => norm(n) === wantedName)) {
            found = { phone, name: namesOf(rec)[0] ?? name, jid: recJid };
            return true;
          }
          return false;
        });
      }
      db.close();
    }

    return { contact: found, diag };
  } catch (e) {
    diag.error = e instanceof Error ? e.message : String(e);
    return { contact: null, diag };
  }
}

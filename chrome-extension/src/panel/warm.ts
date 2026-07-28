import { supabase } from './supabase';
import { phoneKey } from '../lib/protocol';
import type { ContactNote, CrmMatch, InboxTask } from './data';

// Bulk warm-up: load the org's CRM records, notes and tasks ONCE at boot and
// index them by phone.
//
// Per-contact caching only helps the second visit. Clicking through chats the
// agent hasn't opened yet still paid a full round trip each time, which is what
// made the panel feel like it "always loads". Four queries up front turn every
// subsequent contact into a synchronous lookup.
//
// Deliberately capped: these are latency caches, not a replica. Anything past
// the cap simply falls through to the per-contact queries, which still work.

const ROW_CAP = 5000;
const CHILD_CAP = 3000;

const db = supabase as unknown as { from: (t: string) => any };

const matches = new Map<string, CrmMatch>();
const notes = new Map<string, ContactNote[]>();
const tasks = new Map<string, InboxTask[]>();

let state: 'idle' | 'loading' | 'ready' = 'idle';
let inFlight: Promise<void> | null = null;

export function isWarm(): boolean {
  return state === 'ready';
}

export interface WarmHit {
  match: CrmMatch | null;
  notes: ContactNote[];
  tasks: InboxTask[];
}

/** Synchronous read — the whole point of the warm-up. */
export function getWarm(phone: string): WarmHit | null {
  if (state !== 'ready') return null;
  const key = phoneKey(phone);
  if (key.length < 9) return null;
  return {
    match: matches.get(key) ?? null,
    notes: notes.get(key) ?? [],
    tasks: tasks.get(key) ?? [],
  };
}

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function warmup(orgId: string): Promise<void> {
  if (state === 'ready') return Promise.resolve();
  if (inFlight) return inFlight;
  state = 'loading';

  inFlight = (async () => {
    try {
      const [clients, leads, noteRows, taskRows] = await Promise.all([
        db.from('crm_clients').select('id, name, email, phone').eq('organization_id', orgId).limit(ROW_CAP),
        db.from('leads').select('id, name, email, phone, status, value').eq('organization_id', orgId).limit(ROW_CAP),
        db.from('contact_notes').select('id, phone_key, content, author_name, source, created_at')
          .eq('organization_id', orgId).order('created_at', { ascending: false }).limit(CHILD_CAP),
        db.from('inbox_tasks').select('id, phone_key, title, due_at, done_at, suggested, created_at')
          .eq('organization_id', orgId).limit(CHILD_CAP),
      ]);

      // Leads first, then clients — a converted client must overwrite the lead,
      // matching how findCrmMatch ranks them.
      for (const l of leads?.data ?? []) {
        const key = phoneKey(l.phone);
        if (key.length < 9) continue;
        matches.set(key, {
          kind: 'lead', id: l.id, name: l.name, email: l.email ?? null,
          phone: l.phone ?? null, status: l.status ?? null, value: l.value ?? null, matchedBy: 'phone',
        });
      }
      for (const c of clients?.data ?? []) {
        const key = phoneKey(c.phone);
        if (key.length < 9) continue;
        matches.set(key, {
          kind: 'client', id: c.id, name: c.name, email: c.email ?? null,
          phone: c.phone ?? null, status: null, value: null, matchedBy: 'phone',
        });
      }

      for (const n of noteRows?.data ?? []) {
        if (n?.phone_key) push(notes, String(n.phone_key), n as ContactNote);
      }
      for (const t of taskRows?.data ?? []) {
        if (t?.phone_key) push(tasks, String(t.phone_key), t as InboxTask);
      }

      // Same ordering the per-contact queries produce, so a warm paint and a
      // fresh fetch don't visibly reshuffle the list.
      for (const list of tasks.values()) {
        list.sort((a, b) => {
          if (!!a.done_at !== !!b.done_at) return a.done_at ? 1 : -1;
          return (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999');
        });
      }

      state = 'ready';
    } catch {
      // Non-fatal: every screen still works through the per-contact queries.
      state = 'idle';
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** After a write the indexed copy is stale; drop that contact's entries. */
export function dropWarm(phone: string): void {
  const key = phoneKey(phone);
  notes.delete(key);
  tasks.delete(key);
}

import type { ContactNote, CrmMatch, DealRow, InboxTask } from './data';

// Per-conversation cache so revisiting a chat paints instantly.
//
// The panel remounts on every chat switch (deliberately — it keeps state from
// leaking between contacts), so without this every click pays for a full round
// trip. Stale-while-revalidate: render what we had immediately, refresh behind
// it, swap in the result.
//
// In-memory only. It dies with the tab, which is the right lifetime — this is a
// latency cache, not an offline store, and stale CRM data has no business
// surviving a reload.

export interface PanelData {
  phone: string;
  match: CrmMatch | null;
  notes: ContactNote[];
  tasks: InboxTask[];
  deals: { proposals: DealRow[]; sales: DealRow[] };
}

const entries = new Map<string, PanelData>();

/** Phone lookups are the expensive part (an edge-function round trip). */
const phones = new Map<string, string>();

export function getCached(chatKey: string): PanelData | null {
  return entries.get(chatKey) ?? null;
}

export function setCached(chatKey: string, data: PanelData): void {
  entries.set(chatKey, data);
  if (data.phone) phones.set(chatKey, data.phone);
}

export function getCachedPhone(chatKey: string): string {
  return phones.get(chatKey) ?? '';
}

export function setCachedPhone(chatKey: string, phone: string): void {
  if (phone) phones.set(chatKey, phone);
}

/** After a write, the cached copy is stale — drop it so the next read is fresh. */
export function invalidate(chatKey: string): void {
  entries.delete(chatKey);
}

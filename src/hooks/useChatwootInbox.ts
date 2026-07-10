import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';

export interface InboxConversation {
  id: number;
  // Other Chatwoot conversations of the SAME contact, merged into this row.
  alt_ids: number[];
  contact_id: number | null;
  contact_name: string;
  contact_phone: string | null;
  // Identity for channels without a phone number (Instagram / Messenger / email).
  contact_email: string | null;
  contact_identifier: string | null;
  contact_thumbnail: string | null;
  last_message: string | null;
  // Direction/state of the last message — shows ✓/✓✓ before the preview for a
  // message WE sent, WhatsApp-style (never shown for an incoming last message).
  last_outgoing: boolean;
  last_status: string | null;
  // Email: subject line from Chatwoot additional_attributes.mail_subject
  email_subject: string | null;
  unread_count: number;
  status: string;
  channel: string | null;
  // Chatwoot inbox id — which connected account/number this conversation belongs
  // to. Used to route the outbound reply through the right WhatsApp instance.
  inbox_id: number | null;
  updated_at: number | null;
  // Set when the LAST message is from the customer (they're waiting on us).
  waiting_since: number | null;
  labels: string[];
  assigned_id: string | null;
  assigned_name: string | null;
  // Manual CRM link (overrides the phone-based auto-match).
  crm_kind: 'lead' | 'client' | null;
  crm_id: string | null;
  crm_name: string | null;
}

export interface InboxAttachment {
  id?: number;
  file_type: string;
  data_url: string | null;
  thumb_url: string | null;
  file_size: number | null;
  extension: string | null;
}

export interface InboxMessage {
  id: number;
  content: string;
  outgoing: boolean;
  is_activity: boolean;
  // Private note: agent-only, never sent to the customer's WhatsApp.
  is_private?: boolean;
  created_at: string | number | null;
  sender_name: string | null;
  // Delivery status of outgoing messages: sent | delivered | read | failed.
  status: string | null;
  // WhatsApp message id — used to quote/reply.
  wa_id: string | null;
  // When this message is a reply, the Chatwoot id of the quoted message.
  reply_to_id?: number | null;
  attachments: InboxAttachment[];
  // Email-specific fields (null for non-email channels)
  content_type: string | null;
  email_from: string | null;
  email_to: string | null;
  email_cc: string | null;
  email_subject: string | null;
  // Full HTML body from content_attributes.email.html_content.full
  email_html_body: string | null;
}

// Attachment payload for sending (base64, no data: prefix).
export interface OutgoingAttachment {
  data: string;
  mimetype: string;
  filename: string;
  kind: 'image' | 'video' | 'document' | 'voice';
}

async function invokeInbox<T>(organizationId: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('chatwoot-inbox', {
    body: { organization_id: organizationId, ...payload },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

// ---- Optimistic cache patching ----
// Every inbox mutation round-trips edge function -> Chatwoot/Evolution (1-3s).
// Patch the conversations cache IMMEDIATELY so the UI reacts on click, and roll
// back if the server rejects. Background refetch/polling reconciles afterwards.

async function patchConversations(
  queryClient: QueryClient,
  orgId: string | undefined,
  match: (c: InboxConversation) => boolean,
  patch: Partial<InboxConversation> | ((c: InboxConversation) => Partial<InboxConversation>),
): Promise<InboxConversation[] | undefined> {
  const key = ['inbox-conversations', orgId];
  // Abort in-flight fetches so a stale response doesn't overwrite the patch.
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData<InboxConversation[]>(key);
  queryClient.setQueryData<InboxConversation[]>(key, (old) =>
    (old ?? []).map((c) =>
      match(c) ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c,
    ),
  );
  return previous;
}

function rollbackConversations(
  queryClient: QueryClient,
  orgId: string | undefined,
  previous: InboxConversation[] | undefined,
) {
  if (previous) queryClient.setQueryData(['inbox-conversations', orgId], previous);
}

// Append a realtime-delivered message to every message cache that contains the
// given conversation (the open thread, whatever its merged altIds). Deduped by
// id so the later reconciling refetch never double-counts; a repeated id UPDATES
// the cached entry in place (message_updated re-broadcasts once Chatwoot finishes
// downloading media — without the replace, the bubble kept the attachment-less
// first version until the next full refetch). Key shape:
// ['inbox-messages', orgId, conversationId, altIdsCsv].
function appendMessageToCaches(
  queryClient: QueryClient,
  orgId: string,
  conversationId: number,
  msg: InboxMessage,
) {
  const caches = queryClient.getQueryCache().findAll({ queryKey: ['inbox-messages', orgId] });
  for (const cache of caches) {
    const key = cache.queryKey as [string, string, number | null, string?];
    const primary = key[2];
    const altCsv = key[3] ?? '';
    const altIds = altCsv ? altCsv.split(',').map(Number) : [];
    const belongs = primary === conversationId || altIds.includes(conversationId);
    if (!belongs) continue;
    queryClient.setQueryData<InboxMessage[]>(cache.queryKey, (old) => {
      if (!old) return old; // thread not loaded yet — let the refetch populate it
      const idx = old.findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        const next = old.slice();
        next[idx] = msg;
        return next;
      }
      return [...old, msg];
    });
  }
}

// Realtime push: chatwoot-webhook broadcasts on `inbox-<org>` whenever a message
// lands in Chatwoot (incoming, or our own send mirrored back). Refetching on the
// event makes receiving near-instant; polling becomes a relaxed fallback.
// Returns `live` so callers can stretch their poll intervals while connected.
// `getOpenConversationId` (ref-backed getter, optional) tells the handler which
// thread the agent is LOOKING at, so an incoming message there doesn't flash the
// unread badge / trigger the beep only to be auto-marked-read a moment later.
export function useInboxRealtime(getOpenConversationId?: () => number | null): boolean {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);
  // Track when we actually RECEIVED a broadcast. If the WebSocket is connected
  // (live=true) but no broadcast arrives in ~45s, the webhook is likely not
  // registered or broadcasts are going to the wrong project. In that case
  // callers should use faster polling instead of the relaxed "live" intervals.
  const lastBroadcastRef = useRef<number>(0);
  const connectedAtRef = useRef<number>(0);
  const [, forceTick] = useState(0);
  // Keep the latest getter without resubscribing the channel.
  const getOpenRef = useRef(getOpenConversationId);
  getOpenRef.current = getOpenConversationId;

  useEffect(() => {
    if (!organization?.id) return;
    const orgId = organization.id;
    // Collapse bursts (several messages within ~400ms) into ONE refetch — each
    // list refetch costs Chatwoot real server time.
    let timer: number | null = null;
    let taskTimer: number | null = null;
    // Private channel (Realtime Authorization): only authenticated org members
    // may subscribe. setAuth feeds the realtime socket the current JWT.
    supabase.realtime.setAuth();
    const channel = supabase
      .channel(`inbox-${orgId}`, { config: { private: true } })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        lastBroadcastRef.current = Date.now();
        // Instant append: the webhook now ships the message itself, so the OPEN
        // thread updates immediately without waiting for the Chatwoot refetch.
        // The debounced invalidate below still runs to reconcile (attachments,
        // media placeholders, server ordering).
        const convId = Number(payload?.conversation_id);
        const msg = payload?.message as InboxMessage | undefined;
        if (convId && msg && msg.id != null) {
          appendMessageToCaches(queryClient, orgId, convId, msg);
          // Patch the conversation ROW immediately too. Without this, the bubble
          // appears in the open thread in <1s but the LIST (preview, unread badge,
          // reordering, sound) only catches up 2-3s later on the debounced
          // reconcile below — the list visibly "lags" behind the thread.
          const createdAtSec = typeof msg.created_at === 'number'
            ? msg.created_at
            : msg.created_at
              ? Math.floor(new Date(msg.created_at).getTime() / 1000)
              : Math.floor(Date.now() / 1000);
          // An incoming message on the thread the agent is READING (tab visible)
          // is auto-marked-read a moment later — bumping unread here would just
          // flash the badge and fire the beep for a chat they're looking at.
          // openId can be the merged row's primary OR one of its alts, so the
          // row-level check below matches both.
          const openId = document.visibilityState === 'visible'
            ? getOpenRef.current?.() ?? null
            : null;
          patchConversations(
            queryClient, orgId,
            (c) => c.id === convId || (c.alt_ids ?? []).includes(convId),
            (c) => {
              const isOpenRow = openId != null
                && (c.id === openId || (c.alt_ids ?? []).includes(openId));
              const isActivity = msg.is_activity;
              return {
                last_message: isActivity
                  ? c.last_message
                  : (msg.content || (msg.attachments?.length ? '📎 Anexo' : c.last_message)),
                last_outgoing: isActivity ? c.last_outgoing : msg.outgoing,
                last_status: isActivity ? c.last_status : (msg.status ?? null),
                updated_at: createdAtSec,
                unread_count: isActivity || msg.outgoing || isOpenRow ? c.unread_count : c.unread_count + 1,
                waiting_since: isActivity ? c.waiting_since : (msg.outgoing ? null : createdAtSec),
              };
            },
          );
        }
        // AI task suggestions land a few seconds after the message — refresh
        // the tasks caches once the classifier has had time to run.
        if (taskTimer !== null) window.clearTimeout(taskTimer);
        taskTimer = window.setTimeout(() => {
          taskTimer = null;
          queryClient.invalidateQueries({ queryKey: ['inbox-tasks', orgId] });
        }, 8000);
        if (timer !== null) return;
        timer = window.setTimeout(() => {
          timer = null;
          queryClient.invalidateQueries({ queryKey: ['inbox-conversations', orgId] });
          // Prefix match: refetches whichever thread is open, whatever its altIds.
          queryClient.invalidateQueries({ queryKey: ['inbox-messages', orgId] });
        }, 400);
      })
      .subscribe((status) => setLive((prev) => {
        const next = status === 'SUBSCRIBED';
        if (next && !prev) connectedAtRef.current = Date.now();
        return prev === next ? prev : next;
      }));

    // Periodic staleness check: if the WebSocket is connected but no broadcast
    // has arrived in 45s, force a re-render so callers re-evaluate their poll
    // intervals (they'll switch from the relaxed "live" cadence to a faster one).
    const staleTicker = window.setInterval(() => {
      forceTick((n) => n + 1);
    }, 15000);

    // Wake on tab focus. Desktop browsers throttle background tabs — timers slow
    // down and the realtime socket is often suspended/dropped — so a PC left on
    // another tab can sit stale for the ENTIRE time it wasn't focused, unlike a
    // phone PWA (always foreground). Re-authenticating the socket and forcing one
    // refresh the instant the tab becomes visible again is what makes switching
    // back to the inbox feel like WhatsApp Web (already there) instead of waiting
    // out the next poll tick.
    let lastWake = 0;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastWake < 2000) return; // debounce: visibilitychange can double-fire
      lastWake = now;
      supabase.realtime.setAuth();
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', orgId] });
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', orgId] });
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      if (taskTimer !== null) window.clearTimeout(taskTimer);
      window.clearInterval(staleTicker);
      document.removeEventListener('visibilitychange', onVisible);
      setLive(false);
      supabase.removeChannel(channel);
    };
  }, [organization?.id, queryClient]);

  // Realtime is "fresh" only if we've received a broadcast recently. If the
  // WebSocket is up but silent for >45s (since connect or since last broadcast),
  // the webhook is likely not firing — callers should poll faster instead of
  // trusting the dead "live" flag.
  const since = lastBroadcastRef.current || connectedAtRef.current;
  const stale = live && since > 0 && (Date.now() - since > 45000);

  return live && !stale;
}

export interface PresencePeer {
  userId: string;
  name: string;
  conversationId: number | null;
  typing: boolean;
}

// Shared agent presence across the org: who currently has which conversation
// open, and whether they're typing. Powers collision warnings (two agents on the
// same chat) so the team doesn't send duplicate replies. Built on Supabase
// Realtime Presence — one channel per org, each agent tracks their open chat.
// Returns a map of conversationId -> peers (OTHER agents, never self).
export function useInboxPresence(
  conversationId: number | null,
  typing: boolean,
  selfName: string,
): Map<number, PresencePeer[]> {
  const { organization, user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  // Latest state read inside the subscribe callback without resubscribing.
  const stateRef = useRef({ conversationId, typing, selfName });
  stateRef.current = { conversationId, typing, selfName };
  const [peers, setPeers] = useState<Map<number, PresencePeer[]>>(new Map());

  // Subscribe once per org/user; re-tracking on changes happens in the effect below.
  useEffect(() => {
    if (!organization?.id || !user?.id) return;
    const userId = user.id;
    // Private presence channel: only authenticated org members may join, so agent
    // names / open-conversation state aren't readable with just the anon key.
    supabase.realtime.setAuth();
    const channel = supabase.channel(`inbox-presence-${organization.id}`, {
      config: { private: true, presence: { key: userId } },
    });
    channelRef.current = channel;

    const recompute = () => {
      const raw = channel.presenceState() as unknown as Record<string, PresencePeer[]>;
      const map = new Map<number, PresencePeer[]>();
      for (const [key, metas] of Object.entries(raw)) {
        if (key === userId) continue; // never warn about ourselves
        const meta = metas[metas.length - 1]; // most recent track() wins
        if (!meta || meta.conversationId == null) continue;
        const arr = map.get(meta.conversationId) ?? [];
        arr.push(meta);
        map.set(meta.conversationId, arr);
      }
      // Only update state if the serialized presence actually changed — prevents
      // rapid Realtime reconnect cycles from flooding the React tree with re-renders.
      setPeers((prev) => {
        const prevStr = JSON.stringify([...prev.entries()]);
        const nextStr = JSON.stringify([...map.entries()]);
        return prevStr === nextStr ? prev : map;
      });
    };

    channel
      .on('presence', { event: 'sync' }, recompute)
      .on('presence', { event: 'join' }, recompute)
      .on('presence', { event: 'leave' }, recompute)
      .subscribe((status) => {
        const isNowSubscribed = status === 'SUBSCRIBED';
        subscribedRef.current = isNowSubscribed;
        if (isNowSubscribed) {
          const s = stateRef.current;
          channel.track({ userId, name: s.selfName, conversationId: s.conversationId, typing: s.typing });
        }
        // Only trigger a re-render when the live status genuinely changes.
      });

    return () => {
      subscribedRef.current = false;
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [organization?.id, user?.id]);

  // Push our latest open-conversation / typing state to the channel.
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !subscribedRef.current || !user?.id) return;
    channel.track({ userId: user.id, name: selfName, conversationId, typing });
  }, [conversationId, typing, selfName, user?.id]);

  return peers;
}

// Conversation identity for merging: same contact = same row (matches the
// server-side mergeByContact), falling back to the conversation id.
function convKey(c: InboxConversation): string {
  return (c.contact_phone || '').replace(/\D/g, '') || `id-${c.id}`;
}

// Persist the conversations list to localStorage so a page reload shows the last
// known inbox INSTANTLY (no "A carregar conversas..." against a slow Chatwoot),
// then refreshes in the background. Keyed per org; capped to keep it small.
const CONV_CACHE_PREFIX = 'inbox-conv-cache-v1:';
function loadCachedConversations(orgId: string): InboxConversation[] | undefined {
  try {
    const raw = localStorage.getItem(CONV_CACHE_PREFIX + orgId);
    if (!raw) return undefined;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0 ? arr : undefined;
  } catch {
    return undefined;
  }
}
function saveCachedConversations(orgId: string, list: InboxConversation[]) {
  try {
    localStorage.setItem(CONV_CACHE_PREFIX + orgId, JSON.stringify(list.slice(0, 200)));
  } catch {
    /* quota — non-fatal, the in-memory cache still works */
  }
}

const ACTIVITY_RE = /^Conversation was |^Assigned to |self-assigned this conversation| added | removed /i;

function isActivityText(text: string | null): boolean {
  if (!text) return false;
  return ACTIVITY_RE.test(text);
}

async function fetchLastRealMessage(orgId: string, conversationId: number): Promise<string | null> {
  try {
    const res = await invokeInbox<{ messages: InboxMessage[] }>(orgId, {
      action: 'get_messages',
      conversation_ids: [conversationId],
    });
    const msgs = (res.messages || []).filter((m) => !m.is_activity && !m.is_private);
    const last = msgs[msgs.length - 1];
    if (!last) return null;
    if (last.content) return last.content;
    if (last.attachments?.length) {
      const ft = last.attachments[0].file_type;
      if (ft === 'image') return '📷 Foto';
      if (ft === 'audio') return '🎵 Áudio';
      if (ft === 'video') return '🎬 Vídeo';
      return '📎 Anexo';
    }
    return null;
  } catch {
    return null;
  }
}

// Shared fetch+merge for the conversations cache. BOTH the inbox list and the
// sidebar unread badge use this exact queryFn under the same key, so the badge's
// poll can never overwrite the list's merged cache with a raw fetch (the bug
// that made conversations disappear). Chatwoot is slow per page (>1s): the first
// load fetches 6 pages; refreshes fetch the 2 newest and merge over the cache.
async function fetchConversationsMerged(
  queryClient: QueryClient,
  orgId: string,
): Promise<InboxConversation[]> {
  const previous =
    queryClient.getQueryData<InboxConversation[]>(['inbox-conversations', orgId]) ??
    loadCachedConversations(orgId);
  const mode = previous && previous.length > 0 ? 'fresh' : 'full';
  const res = await invokeInbox<{ conversations: InboxConversation[] }>(orgId, {
    action: 'list_conversations',
    mode,
  });
  const fresh = res.conversations || [];
  const activityConvs = fresh.filter((c) => isActivityText(c.last_message));
  if (activityConvs.length > 0 && activityConvs.length <= 10) {
    const fixes = await Promise.all(
      activityConvs.map(async (c) => {
        const real = await fetchLastRealMessage(orgId, c.id);
        return { id: c.id, last_message: real };
      }),
    );
    for (const fix of fixes) {
      if (fix.last_message) {
        const idx = fresh.findIndex((c) => c.id === fix.id);
        if (idx >= 0) fresh[idx] = { ...fresh[idx], last_message: fix.last_message };
      }
    }
  }
  if (mode === 'full' || !previous) { saveCachedConversations(orgId, fresh); return fresh; }
  const seenKeys = new Set(fresh.map(convKey));
  const seenIds = new Set(fresh.flatMap((c) => [c.id, ...(c.alt_ids ?? [])]));
  const MAX_CACHED = 200;
  const rest = previous
    .filter((c) => !seenKeys.has(convKey(c)) && !seenIds.has(c.id))
    .slice(0, Math.max(0, MAX_CACHED - fresh.length));
  const prevById = new Map(previous.map((c) => [c.id, c]));
  const stabilize = (c: InboxConversation): InboxConversation => {
    const p = prevById.get(c.id);
    if (p && p.updated_at === c.updated_at && p.unread_count === c.unread_count
        && p.status === c.status && p.waiting_since === c.waiting_since
        && p.assigned_id === c.assigned_id) return p;
    return c;
  };
  const merged = [...fresh.map(stabilize), ...rest];
  saveCachedConversations(orgId, merged);
  return merged;
}

// List the open conversations for the org's Chatwoot account.
// With realtime connected (live=true) the poll is just a safety net. Polling is
// suspended while a mutation is in flight so a refetch can't revert an optimistic
// patch mid-round-trip.
export function useInboxConversations(enabled = true, live = false) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['inbox-conversations', organization?.id],
    queryFn: () => (organization?.id ? fetchConversationsMerged(queryClient, organization.id) : Promise.resolve([])),
    enabled: enabled && !!organization?.id,
    initialData: () => (organization?.id ? loadCachedConversations(organization.id) : undefined),
    initialDataUpdatedAt: () => 0,
    staleTime: 0,
    refetchInterval: !enabled ? false : live ? false : 5000,
    refetchOnWindowFocus: true,
  });
}

const MUTED_KEY = 'inbox-muted-v1';

export function loadMutedIds(): number[] {
  try {
    const arr = JSON.parse(localStorage.getItem(MUTED_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveMutedIds(ids: number[]) {
  localStorage.setItem(MUTED_KEY, JSON.stringify(ids));
}

// Conversations that should count as "unread" for badges: active (not archived),
// real contacts (not the Evolution control bot), not muted, with unread messages.
// excludeInboxIds drops conversations of EMAIL caixas — those are handled by the
// dedicated email client, so the messaging badge must not count them (otherwise
// the sidebar shows e.g. 41 while the inbox's "Não lidas" shows 5).
export function countUnreadConversations(
  conversations: InboxConversation[],
  excludeInboxIds?: Set<number>,
): number {
  const muted = new Set(loadMutedIds());
  return conversations.filter(
    (c) =>
      c.status !== 'resolved' &&
      c.contact_name !== 'EvolutionAPI' &&
      !muted.has(c.id) &&
      !(c.inbox_id != null && excludeInboxIds?.has(c.inbox_id)) &&
      (c.unread_count || 0) > 0,
  ).length;
}

// Number of conversations with unread messages (WhatsApp-style badge: counts
// CHATS, not messages — old imported history would otherwise inflate it).
// Shares the conversations cache, so the sidebar badge costs nothing extra while
// the inbox page is open; alone it polls at a relaxed 20s.
export function useInboxUnreadTotal(enabled = true) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  // Email caixas are handled by the dedicated email client — exclude them from the
  // messaging unread badge so it matches the inbox's own "Não lidas" count.
  const { data: channels = [] } = useMessagingChannels();
  const emailInboxIds = useMemo(
    () => new Set(
      channels
        .filter((c) => c.channel_type === 'email' && c.chatwoot_inbox_id != null)
        .map((c) => c.chatwoot_inbox_id as number),
    ),
    [channels],
  );
  const query = useQuery({
    queryKey: ['inbox-conversations', organization?.id],
    // SAME queryFn as useInboxConversations — sharing the merge logic is what
    // stops the badge poll from clobbering the list cache.
    queryFn: () => (organization?.id ? fetchConversationsMerged(queryClient, organization.id) : Promise.resolve([])),
    enabled: enabled && !!organization?.id,
    refetchInterval: enabled ? 30000 : false,
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });
  return { total: countUnreadConversations(query.data || [], emailInboxIds), isLoading: query.isLoading };
}

// Messages of a conversation (refetched on realtime events; polled as fallback).
// Passing altIds merges the threads of the contact's other conversations into one.
export function useInboxMessages(conversationId: number | null, altIds: number[] = [], live = false) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const allIds = conversationId ? [conversationId, ...altIds] : [];
  const queryKey = ['inbox-messages', organization?.id, conversationId, altIds.join(',')];
  return useQuery({
    queryKey,
    queryFn: async (): Promise<InboxMessage[]> => {
      if (!organization?.id || !conversationId) return [];
      const res = await invokeInbox<{ messages: InboxMessage[] }>(organization.id, {
        action: 'get_messages',
        conversation_ids: allIds,
      });
      const fetched = res.messages || [];
      // Merge-grace: keep very recent cache-only messages (landed via the
      // realtime broadcast append) that this GET doesn't include yet — under
      // load, Chatwoot's read API can lag its own webhook by a few seconds.
      // Without this, the refetch "un-appends" a message that was already on
      // screen (it flickers away and comes back on a later poll).
      const cached = queryClient.getQueryData<InboxMessage[]>(queryKey);
      if (!cached?.length) return fetched;
      const fetchedIds = new Set(fetched.map((m) => m.id));
      const now = Date.now();
      const grace = cached.filter((m) => {
        if (fetchedIds.has(m.id)) return false;
        const ms = typeof m.created_at === 'number'
          ? m.created_at * 1000
          : m.created_at ? Date.parse(m.created_at) : 0;
        return ms > 0 && now - ms < 20_000;
      });
      return grace.length > 0 ? [...fetched, ...grace] : fetched;
    },
    enabled: !!organization?.id && !!conversationId,
    staleTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    gcTime: 0,
  });
}

// Prefetch a conversation's thread into the cache so opening it is instant.
// Wired to row hover: by the time the agent clicks, the Chatwoot round-trip is
// already done (or in flight). No-op if already cached and fresh.
export function useInboxMessagePrefetch() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useCallback((conversationId: number, altIds: number[] = []) => {
    if (!organization?.id || !conversationId) return;
    const allIds = [conversationId, ...altIds];
    queryClient.prefetchQuery({
      queryKey: ['inbox-messages', organization.id, conversationId, altIds.join(',')],
      queryFn: async (): Promise<InboxMessage[]> => {
        const res = await invokeInbox<{ messages: InboxMessage[] }>(organization.id!, {
          action: 'get_messages',
          conversation_ids: allIds,
        });
        return res.messages || [];
      },
      staleTime: 8000,
    });
  }, [organization?.id, queryClient]);
}

// Server-side search across MESSAGE CONTENT (not just contact names).
export function useSearchConversations(q: string) {
  const { organization } = useAuth();
  const term = q.trim();
  return useQuery({
    queryKey: ['inbox-search', organization?.id, term],
    queryFn: async (): Promise<InboxConversation[]> => {
      if (!organization?.id || term.length < 3) return [];
      const res = await invokeInbox<{ conversations: InboxConversation[] }>(organization.id, {
        action: 'search',
        q: term,
      });
      return res.conversations || [];
    },
    enabled: !!organization?.id && term.length >= 3,
    staleTime: 30 * 1000,
  });
}

// Fetch a page of OLDER messages (before the given message id).
export function useLoadOlderMessages() {
  const { organization } = useAuth();
  return async (conversationId: number, beforeId: number): Promise<InboxMessage[]> => {
    if (!organization?.id) return [];
    const res = await invokeInbox<{ messages: InboxMessage[] }>(organization.id, {
      action: 'get_messages',
      conversation_id: conversationId,
      before: beforeId,
    });
    return res.messages || [];
  };
}

// Mark a conversation (and the contact's merged alts) as read.
// Optimistic: the unread badge clears on click; the server call (Chatwoot +
// WhatsApp blue ticks) runs behind. No invalidate — the regular refetch reconciles.
export function useMarkConversationRead() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, altIds = [] }: { conversationId: number; altIds?: number[] }) => {
      if (!organization?.id) return;
      await invokeInbox(organization.id, {
        action: 'mark_read',
        conversation_ids: [conversationId, ...altIds],
      });
    },
    onMutate: async ({ conversationId, altIds = [] }) => ({
      previous: await patchConversations(
        queryClient, organization?.id,
        // Cover the primary row whether the id passed is the primary or one of
        // the merged alt conversations.
        (c) => c.id === conversationId || (c.alt_ids ?? []).includes(conversationId) || altIds.includes(c.id),
        { unread_count: 0 },
      ),
    }),
    onError: (_e, _v, ctx) => rollbackConversations(queryClient, organization?.id, ctx?.previous),
  });
}

// Mark a conversation as UNREAD (list context menu) — the WhatsApp "keep this
// as a reminder" move. Optimistic: the badge shows "1" instantly.
export function useMarkConversationUnread() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: number) => {
      if (!organization?.id) return;
      await invokeInbox(organization.id, { action: 'mark_unread', conversation_id: conversationId });
    },
    onMutate: async (conversationId: number) => ({
      previous: await patchConversations(
        queryClient, organization?.id,
        (c) => c.id === conversationId,
        { unread_count: 1 },
      ),
    }),
    onError: (_e, _v, ctx) => rollbackConversations(queryClient, organization?.id, ctx?.previous),
  });
}

// Download an attachment via the edge function proxy (Chatwoot blocks direct
// browser fetches with CORS) and save it to disk.
export function useDownloadAttachment() {
  const { organization } = useAuth();
  return async (url: string, extension?: string | null) => {
    if (!organization?.id) return;
    const name = (() => {
      try {
        const last = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
        if (last && last.includes('.')) return last;
      } catch {
        // malformed URL — use the generic name below
      }
      return `anexo${extension ? `.${extension}` : ''}`;
    })();
    const { data, error } = await supabase.functions.invoke('chatwoot-inbox', {
      body: { organization_id: organization.id, action: 'download_attachment', url },
    });
    if (error || !(data instanceof Blob)) {
      // Proxy failed — last resort, let the browser open it.
      window.open(url, '_blank', 'noopener');
      return;
    }
    const objectUrl = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  };
}

export interface SendMessageVars {
  conversationId: number;
  content: string;
  contactPhone?: string | null;
  inboxId?: number | null;
  attachment?: OutgoingAttachment;
  quotedId?: string | null;
}

// Sends are DISPATCHED strictly in order. Two quick sends used to fire two
// parallel edge-function calls, and Evolution could deliver them to WhatsApp
// inverted — the queue guarantees the first message leaves before the second.
let sendChain: Promise<unknown> = Promise.resolve();

// Send a reply on a conversation (text, attachment, and/or quoting a message).
export function useSendInboxMessage() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      contactPhone,
      inboxId,
      attachment,
      quotedId,
    }: SendMessageVars) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const orgId = organization.id;
      const dispatch = () =>
        invokeInbox<{ ok: boolean }>(orgId, {
          action: 'send_message',
          conversation_id: conversationId,
          content,
          // Passing the phone lets the edge function skip a Chatwoot lookup.
          contact_phone: contactPhone ?? undefined,
          // Routes the reply through the right WhatsApp instance (multi-account).
          inbox_id: inboxId ?? undefined,
          attachment,
          quoted_id: quotedId ?? undefined,
        });
      // Chain behind the previous send whether it succeeded or failed — one
      // failed message must not block the rest of the queue.
      const run = sendChain.then(dispatch, dispatch);
      sendChain = run.then(() => undefined, () => undefined);
      return run;
    },
    // Optimistic: the conversation row updates instantly (preview + jumps to the
    // top); the thread bubble is handled by the page's `pending` mechanism.
    onMutate: async ({ conversationId, content, attachment }) => ({
      previous: await patchConversations(
        queryClient, organization?.id,
        (c) => c.id === conversationId,
        {
          last_message: content?.trim() || (attachment ? '📎 Anexo' : ''),
          last_outgoing: true,
          last_status: 'sent',
          updated_at: Math.floor(Date.now() / 1000),
          waiting_since: null,
        },
      ),
    }),
    onError: (_e, _v, ctx) => rollbackConversations(queryClient, organization?.id, ctx?.previous),
    onSuccess: (_data, variables) => {
      // Reconcile AFTER the mirror has had time to land in Chatwoot. An instant
      // refetch here was a wasted round trip on every send (the mirror is never
      // there yet) and piled load on an already-slow Chatwoot during bursts —
      // the realtime broadcast covers the instant path; this is the safety net.
      const orgId = organization?.id;
      window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['inbox-messages', orgId, variables.conversationId] });
      }, 2500);
    },
  });
}

// Post a private internal note (agent-only). Goes straight to Chatwoot, never to
// WhatsApp. The note lands in the thread on the next refetch/realtime event.
export function useSendInternalNote() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox<{ ok: boolean }>(organization.id, {
        action: 'send_note',
        conversation_id: conversationId,
        content,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', organization?.id, variables.conversationId] });
    },
  });
}

// Start a conversation with a number that never wrote to us. Supports an optional
// attachment as the first message (image/audio/doc/voice).
export function useStartConversation() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, content, inboxId, attachment }: { phone: string; content: string; inboxId?: number | null; attachment?: OutgoingAttachment }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox<{ ok: boolean }>(organization.id, {
        action: 'start_conversation',
        phone,
        content,
        inbox_id: inboxId ?? undefined,
        attachment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', organization?.id] });
    },
  });
}

// Archive (resolve) or reopen a conversation.
export function useToggleConversationStatus() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, status }: { conversationId: number; status: 'open' | 'resolved' }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox<{ ok: boolean }>(organization.id, {
        action: 'toggle_status',
        conversation_id: conversationId,
        status,
      });
    },
    onMutate: async ({ conversationId, status }) => ({
      previous: await patchConversations(
        queryClient, organization?.id,
        (c) => c.id === conversationId,
        { status },
      ),
    }),
    onError: (_e, _v, ctx) => rollbackConversations(queryClient, organization?.id, ctx?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', organization?.id] });
    },
  });
}

// ---- CRM linking: find the lead/client behind a WhatsApp phone number ----

export interface ContactMatch {
  kind: 'lead' | 'client';
  id: string;
  name: string;
  // Present on results from useSearchCrmRecords — needed to start a WhatsApp
  // conversation with the picked lead/client.
  phone?: string | null;
}

// Matches a CRM lead/client behind a conversation. By the last 9 digits of the
// phone (PT national number, so "+351 910...", "351910...", "910..." all match)
// and/or by email — the email path is what lets channels WITHOUT a phone
// (Instagram, Messenger, e-mail) still resolve to a CRM record.
export function useContactMatch(phone: string | null | undefined, email?: string | null) {
  const { organization } = useAuth();
  const digits = (phone || '').replace(/\D/g, '');
  const suffix = digits.length >= 9 ? digits.slice(-9) : '';
  const mail = (email || '').trim().toLowerCase();
  return useQuery({
    queryKey: ['inbox-contact-match', organization?.id, suffix, mail],
    queryFn: async (): Promise<ContactMatch | null> => {
      if (!organization?.id || (!suffix && !mail)) return null;
      // Build an OR filter against phone suffix and/or email. NOTE: in the
      // PostgREST .or() string syntax the LIKE wildcard is '*', not SQL '%'.
      const orParts: string[] = [];
      if (suffix) orParts.push(`phone.like.*${suffix}`);
      if (mail) orParts.push(`email.eq.${mail}`);
      const orFilter = orParts.join(',');
      const [{ data: clients }, { data: leads }] = await Promise.all([
        supabase.from('crm_clients').select('id, name').eq('organization_id', organization.id).or(orFilter).limit(1),
        supabase.from('leads').select('id, name').eq('organization_id', organization.id).or(orFilter).limit(1),
      ]);
      // A converted client outranks the original lead.
      if (clients && clients.length > 0) return { kind: 'client', id: clients[0].id, name: clients[0].name };
      if (leads && leads.length > 0) return { kind: 'lead', id: leads[0].id, name: leads[0].name };
      return null;
    },
    enabled: !!organization?.id && (!!suffix || !!mail),
    staleTime: 60 * 1000,
  });
}

// ---- Conversation tools: assign, rename, labels, canned responses, delete ----

export function useAssignConversation() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, userId, userName }: { conversationId: number; userId: string | null; userName: string | null }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, {
        action: 'assign_conversation',
        conversation_id: conversationId,
        user_id: userId,
        user_name: userName,
      });
    },
    onMutate: async ({ conversationId, userId, userName }) => ({
      previous: await patchConversations(
        queryClient, organization?.id,
        (c) => c.id === conversationId,
        { assigned_id: userId, assigned_name: userName },
      ),
    }),
    onError: (_e, _v, ctx) => rollbackConversations(queryClient, organization?.id, ctx?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', organization?.id] });
    },
  });
}

export function useRenameContact() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, name }: { contactId: number; name: string }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, { action: 'rename_contact', contact_id: contactId, name });
    },
    onMutate: async ({ contactId, name }) => ({
      previous: await patchConversations(
        queryClient, organization?.id,
        (c) => c.contact_id === contactId,
        { contact_name: name },
      ),
    }),
    onError: (_e, _v, ctx) => rollbackConversations(queryClient, organization?.id, ctx?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', organization?.id] });
    },
  });
}

export interface InboxLabel {
  id: number;
  title: string;
  color: string | null;
}

export function useInboxLabels() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['inbox-labels', organization?.id],
    queryFn: async (): Promise<InboxLabel[]> => {
      if (!organization?.id) return [];
      const res = await invokeInbox<{ labels: InboxLabel[] }>(organization.id, { action: 'list_labels' });
      return res.labels || [];
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLabel() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, { action: 'create_label', title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-labels', organization?.id] });
    },
  });
}

// Deletes a label account-wide (Chatwoot also strips it from every conversation).
export function useDeleteLabel() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (labelId: number) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, { action: 'delete_label', label_id: labelId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-labels', organization?.id] });
      // Conversations may have carried the deleted label — refresh their chips.
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', organization?.id] });
    },
  });
}

export function useSetConversationLabels() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, labels }: { conversationId: number; labels: string[] }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, { action: 'set_labels', conversation_id: conversationId, labels });
    },
    onMutate: async ({ conversationId, labels }) => ({
      previous: await patchConversations(
        queryClient, organization?.id,
        (c) => c.id === conversationId,
        { labels },
      ),
    }),
    onError: (_e, _v, ctx) => rollbackConversations(queryClient, organization?.id, ctx?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', organization?.id] });
    },
  });
}

export interface CannedResponse {
  id: number;
  content: string;
}

// Quick replies shared by the whole organization (stored as Chatwoot canned
// responses — no extra table needed). Use {{nome}} for the contact's first name.
export function useCannedResponses() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['inbox-canned', organization?.id],
    queryFn: async (): Promise<CannedResponse[]> => {
      if (!organization?.id) return [];
      const res = await invokeInbox<{ canned: CannedResponse[] }>(organization.id, { action: 'list_canned' });
      return res.canned || [];
    },
    enabled: !!organization?.id,
    staleTime: 60 * 1000,
  });
}

export function useCreateCannedResponse() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, { action: 'create_canned', content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-canned', organization?.id] });
    },
  });
}

export function useDeleteCannedResponse() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cannedId: number) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, { action: 'delete_canned', canned_id: cannedId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-canned', organization?.id] });
    },
  });
}

// Delete-for-everyone on WhatsApp. The Chatwoot mirror keeps the original text;
// the UI hides it locally after success. `inboxId` lets the edge function block
// the action on a restricted caixa the caller isn't assigned to (same check
// send_message already does) — omit only for caixas with no restriction.
export function useDeleteMessage() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ waId, phone, inboxId }: { waId: string; phone: string; inboxId?: number | null }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, { action: 'delete_message', wa_id: waId, phone, inbox_id: inboxId ?? undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', organization?.id] });
    },
  });
}

// Edit a sent WhatsApp message (allowed by WhatsApp within ~15 min; we cap the UI
// at 5 min). Evolution updates the message on WhatsApp; the UI overrides the text
// locally so the edit shows immediately.
export function useEditMessage() {
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async ({ waId, phone, content, inboxId }: { waId: string; phone: string; content: string; inboxId?: number | null }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, { action: 'edit_message', wa_id: waId, phone, content, inbox_id: inboxId ?? undefined });
    },
  });
}

// Send a WhatsApp emoji reaction (👍❤️😂...) to a message via Evolution.
// SEND-only: receiving a contact's reaction back into the thread isn't wired
// up in this pass — Chatwoot doesn't surface WhatsApp reactions as a
// documented, first-class field, so faking a receive path without a live
// Evolution payload to verify against would be guesswork.
export function useReactToMessage() {
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async ({ waId, phone, fromMe, emoji, inboxId }: { waId: string; phone: string; fromMe: boolean; emoji: string; inboxId?: number | null }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, { action: 'react', wa_id: waId, phone, from_me: fromMe, emoji, inbox_id: inboxId ?? undefined });
    },
  });
}

// Notify the contact's WhatsApp that we're typing (fire-and-forget).
export function useTypingPresence() {
  const { organization } = useAuth();
  return (phone: string | null | undefined, inboxId?: number | null) => {
    if (!organization?.id || !phone) return;
    supabase.functions
      .invoke('chatwoot-inbox', {
        body: { organization_id: organization.id, action: 'typing', phone, inbox_id: inboxId ?? undefined },
      })
      .catch(() => {});
  };
}

// AI-drafted next reply for the open conversation.
export function useSuggestReply() {
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async ({ conversationId, altIds = [] }: { conversationId: number; altIds?: number[] }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const res = await invokeInbox<{ suggestion: string }>(organization.id, {
        action: 'suggest_reply',
        conversation_ids: [conversationId, ...altIds],
      });
      return res.suggestion;
    },
  });
}

// ---- Out-of-hours auto-reply config (stored in messaging_channels.metadata) ----

export interface AutoReplyConfig {
  enabled: boolean;
  start: string; // "09:00"
  end: string;   // "18:00"
  message: string;
}

const DEFAULT_AUTO_REPLY: AutoReplyConfig = {
  enabled: false,
  start: '09:00',
  end: '18:00',
  message: 'Olá! Recebemos a tua mensagem. O nosso horário é das 9h às 18h — respondemos assim que possível. 🙏',
};

export function useAutoReplyConfig() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['inbox-auto-reply', organization?.id],
    queryFn: async (): Promise<AutoReplyConfig> => {
      if (!organization?.id) return DEFAULT_AUTO_REPLY;
      const { data } = await supabase
        .from('messaging_channels')
        .select('metadata')
        .eq('organization_id', organization.id)
        .eq('channel_type', 'whatsapp')
        .maybeSingle();
      const ar = (data?.metadata as { auto_reply?: Partial<AutoReplyConfig> } | null)?.auto_reply;
      return { ...DEFAULT_AUTO_REPLY, ...(ar ?? {}) };
    },
    enabled: !!organization?.id,
  });
}

export function useSaveAutoReplyConfig() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: AutoReplyConfig) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      // Atomic JSON merge (metadata = metadata || patch) — never clobbers the
      // channel's other metadata (ai_tasks_enabled, Evolution/Chatwoot config).
      // Cast: the RPC is newer than the generated Supabase types.
      const { error } = await (supabase.rpc as any)('merge_messaging_channel_metadata', {
        p_org_id: organization.id,
        p_channel_type: 'whatsapp',
        p_patch: { auto_reply: config },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-auto-reply', organization?.id] });
    },
  });
}

// ---- Scheduled messages (write now, send later via pg_cron) ----

export interface ScheduledMessage {
  id: string;
  phone: string;
  content: string;
  send_at: string;
  status: string;
  // Cheap label for the "scheduled" bar — set when the message carries an
  // attachment; the (large) base64 payload itself is never pulled into the list.
  attachment_name: string | null;
}

// The table is newer than the auto-generated Supabase types — hence the cast.
const scheduledTable = () => (supabase as any).from('scheduled_messages');

export function useScheduledMessages(phone: string | null | undefined) {
  const { organization } = useAuth();
  const suffix = (phone || '').replace(/\D/g, '').slice(-9);
  return useQuery({
    queryKey: ['inbox-scheduled', organization?.id, suffix],
    queryFn: async (): Promise<ScheduledMessage[]> => {
      if (!organization?.id || suffix.length < 9) return [];
      const { data, error } = await scheduledTable()
        .select('id, phone, content, send_at, status, attachment_name')
        .eq('organization_id', organization.id)
        .eq('status', 'pending')
        .eq('phone_key', suffix) // indexed; replaces unindexed LIKE '%suffix'
        .order('send_at', { ascending: true });
      if (error) {
        // Degrade gracefully if attachment_name isn't migrated yet: retry without it.
        const { data: d2 } = await scheduledTable()
          .select('id, phone, content, send_at, status')
          .eq('organization_id', organization.id)
          .eq('status', 'pending')
          .eq('phone_key', suffix)
          .order('send_at', { ascending: true });
        return ((d2 ?? []) as ScheduledMessage[]).map((m) => ({ ...m, attachment_name: null }));
      }
      return (data ?? []) as ScheduledMessage[];
    },
    enabled: !!organization?.id && suffix.length >= 9,
    retry: false,
    refetchInterval: 30000,
  });
}

export function useScheduleMessage() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, content, sendAt, attachment }: {
      phone: string; content: string; sendAt: Date; attachment?: OutgoingAttachment;
    }) => {
      if (!organization?.id || !user?.id) throw new Error('Organização não encontrada');
      // Only reference the attachment columns when there IS one, so text-only
      // scheduling keeps working even if the attachment migration hasn't run yet
      // (referencing an unknown column fails the whole insert in Postgres).
      const { error } = await scheduledTable().insert({
        organization_id: organization.id,
        created_by: user.id,
        phone: phone.replace(/\D/g, ''),
        content,
        send_at: sendAt.toISOString(),
        ...(attachment ? { attachment, attachment_name: attachment.filename } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-scheduled', organization?.id] });
    },
  });
}

export function useCancelScheduledMessage() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await scheduledTable().update({ status: 'cancelled' }).eq('id', id).eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-scheduled', organization?.id] });
    },
  });
}

// ---- CRM record behind the conversation (side panel) ----

export interface CrmRecordDetail {
  kind: 'lead' | 'client';
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  value: number | null;
  notes: string | null;
}

export function useCrmRecord(match: ContactMatch | null | undefined) {
  return useQuery({
    queryKey: ['inbox-crm-record', match?.kind, match?.id],
    queryFn: async (): Promise<CrmRecordDetail | null> => {
      if (!match) return null;
      if (match.kind === 'lead') {
        const { data } = await supabase
          .from('leads')
          .select('id, name, email, phone, status, value, notes')
          .eq('id', match.id)
          .maybeSingle();
        if (!data) return null;
        return { kind: 'lead', ...data, value: data.value ?? null, notes: data.notes ?? null };
      }
      const { data } = await supabase
        .from('crm_clients')
        .select('id, name, email, phone, notes')
        .eq('id', match.id)
        .maybeSingle();
      if (!data) return null;
      return { kind: 'client', ...data, status: null, value: null, notes: data.notes ?? null };
    },
    enabled: !!match,
    staleTime: 30 * 1000,
  });
}

export function useUpdateLeadNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, notes }: { leadId: string; notes: string }) => {
      const { error } = await supabase.from('leads').update({ notes }).eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-crm-record'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Mirror of useUpdateLeadNotes for clients — invalidates the inbox CRM panel so
// the saved note shows up immediately (the generic useUpdateClient doesn't).
export function useUpdateClientNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, notes }: { clientId: string; notes: string }) => {
      const { error } = await supabase.from('crm_clients').update({ notes }).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-crm-record'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// Create a lead directly from a WhatsApp conversation.
export function useCreateLeadFromContact() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase
        .from('leads')
        .insert({
          organization_id: organization.id,
          name,
          phone,
          email: '',
          source: 'whatsapp',
          status: 'new',
          gdpr_consent: true,
        })
        .select('id, name')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-contact-match'] });
    },
  });
}

// Create a client directly from a WhatsApp conversation.
export function useCreateClientFromContact() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase
        .from('crm_clients')
        .insert({
          organization_id: organization.id,
          name,
          phone,
          source: 'whatsapp',
          status: 'active',
        })
        .select('id, name')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-contact-match'] });
    },
  });
}

// Manually link the conversation to an existing lead/client (or clear it).
export function useLinkCrm() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      kind,
      id,
      name,
    }: {
      conversationId: number;
      kind: 'lead' | 'client' | null;
      id: string | null;
      name: string | null;
    }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      return invokeInbox(organization.id, {
        action: 'link_crm',
        conversation_id: conversationId,
        kind: kind ?? '',
        id: id ?? '',
        name: name ?? '',
      });
    },
    onMutate: async ({ conversationId, kind, id, name }) => ({
      previous: await patchConversations(
        queryClient, organization?.id,
        (c) => c.id === conversationId,
        { crm_kind: kind, crm_id: id, crm_name: name },
      ),
    }),
    onError: (_e, _v, ctx) => rollbackConversations(queryClient, organization?.id, ctx?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', organization?.id] });
    },
  });
}

// Search existing leads + clients by name (for manual association).
export function useSearchCrmRecords(query: string) {
  const { organization } = useAuth();
  const term = query.trim();
  return useQuery({
    queryKey: ['inbox-crm-search', organization?.id, term],
    queryFn: async (): Promise<ContactMatch[]> => {
      if (!organization?.id || term.length < 2) return [];
      // Match by name OR phone (digits), so a number search also finds the CRM
      // record. PostgREST .or() uses '*' as the LIKE wildcard.
      const digits = term.replace(/\D/g, '');
      const orFilter = digits.length >= 3
        ? `name.ilike.%${term}%,phone.like.*${digits}*`
        : `name.ilike.%${term}%`;
      const [{ data: leads }, { data: clients }] = await Promise.all([
        supabase
          .from('leads')
          .select('id, name, phone')
          .eq('organization_id', organization.id)
          .or(orFilter)
          .limit(8),
        supabase
          .from('crm_clients')
          .select('id, name, phone')
          .eq('organization_id', organization.id)
          .or(orFilter)
          .limit(8),
      ]);
      return [
        ...(clients ?? []).map((c) => ({ kind: 'client' as const, id: c.id, name: c.name, phone: c.phone })),
        ...(leads ?? []).map((l) => ({ kind: 'lead' as const, id: l.id, name: l.name, phone: l.phone })),
      ];
    },
    enabled: !!organization?.id && term.length >= 2,
    staleTime: 30 * 1000,
  });
}


const TRANSCRIPT_CACHE_PREFIX = 'inbox_transcript_v1_';

// Transcribes an audio attachment using Groq Whisper via the transcribe-audio
// edge function. Caches the result in localStorage so it survives page reload.
export function useTranscribeAudio(messageId: number, url: string | null) {
  const { organization } = useAuth();
  // Scope by org: message ids are per-Chatwoot-account, so a bare messageId key
  // could collide across orgs in the same browser.
  const cacheKey = `${TRANSCRIPT_CACHE_PREFIX}${organization?.id ?? 'x'}_${messageId}`;

  const [text, setText] = useState<string | null>(() => {
    try { return localStorage.getItem(cacheKey); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcribe = useCallback(async () => {
    if (!url || !organization?.id || text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('transcribe-audio', {
        body: { organization_id: organization.id, url },
      });
      if (fnErr) throw fnErr;
      const result: string = data?.text ?? '';
      setText(result);
      try { localStorage.setItem(cacheKey, result); } catch {}
    } catch (e) {
      setError('Não foi possível transcrever o áudio.');
      console.error('transcribe-audio error:', e);
    } finally {
      setLoading(false);
    }
  }, [url, organization?.id, text, loading, cacheKey]);

  return { text, loading, error, transcribe };
}

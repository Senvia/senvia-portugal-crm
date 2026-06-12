import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useWhatsappChannel } from "@/hooks/useMessagingChannels";
import {
  useInboxConversations,
  useInboxMessages,
  useSendInboxMessage,
  useMarkConversationRead,
  useDownloadAttachment,
  useLoadOlderMessages,
  useStartConversation,
  useToggleConversationStatus,
  useContactMatch,
  useCreateLeadFromContact,
  useCreateClientFromContact,
  useLinkCrm,
  useSearchCrmRecords,
  useSearchConversations,
  useAssignConversation,
  useRenameContact,
  useInboxLabels,
  useCreateLabel,
  useSetConversationLabels,
  useCannedResponses,
  useCreateCannedResponse,
  useDeleteCannedResponse,
  useDeleteMessage,
  useCrmRecord,
  useUpdateLeadNotes,
  useTypingPresence,
  useSuggestReply,
  useScheduledMessages,
  useScheduleMessage,
  useCancelScheduledMessage,
  useAutoReplyConfig,
  useSaveAutoReplyConfig,
  countUnreadConversations,
  loadMutedIds,
  saveMutedIds,
  AutoReplyConfig,
  InboxConversation,
  InboxAttachment,
  InboxMessage,
  OutgoingAttachment,
} from "@/hooks/useChatwootInbox";
import { useCreateCommunication } from "@/hooks/useClientCommunications";
import { useTeamMembers } from "@/hooks/useTeam";
import { useCreateEvent } from "@/hooks/useCalendarEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useClientProposals, useClientSales } from "@/hooks/useClientHistory";
import { useUpdateClient } from "@/hooks/useClients";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { AddLeadModal } from "@/components/leads/AddLeadModal";
import { ConnectWhatsAppModal } from "@/components/settings/ConnectWhatsAppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, MessageSquare, Send, ArrowLeft, Smartphone, Search, FileText, Clock,
  Check, CheckCheck, Download, Paperclip, Mic, Smile, Zap, X, Plus, Archive,
  ArchiveRestore, UserPlus, Reply, ChevronUp, Trash2, Pin, PinOff,
  Pencil, Tag, UserCog, PanelRight, AlarmClock, ExternalLink, Sparkles, PenLine,
  BellOff, Bell, Settings2, WifiOff, FileDown, ClipboardList, CalendarClock,
  ChevronsUpDown,
} from "lucide-react";
import { cn, matchesSearch } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

function toMs(value: string | number | null): number {
  if (!value) return 0;
  const ms = typeof value === "number" ? value * 1000 : Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function formatTime(value: string | number | null): string {
  const ms = toMs(value);
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

// WhatsApp-style list timestamp: today → 14:30, yesterday → "Ontem",
// this week → "ter.", older → 05/06/26.
function formatListDate(value: string | number | null): string {
  const ms = toMs(value);
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ms >= startOfToday) return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  if (ms >= startOfToday - 86400000) return "Ontem";
  if (ms >= startOfToday - 6 * 86400000) return d.toLocaleDateString("pt-PT", { weekday: "short" });
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// Thread date separator: "Hoje", "Ontem", "5 de junho".
function dayLabel(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ms >= startOfToday) return "Hoje";
  if (ms >= startOfToday - 86400000) return "Ontem";
  return d.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// "à espera 5m / 2h / 3d"
function waitingLabel(since: number | null): string | null {
  if (!since) return null;
  const mins = Math.floor((Date.now() - since * 1000) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Replace {{nome}} with the contact's first name in quick replies.
function applyVars(content: string, contactName: string): string {
  return content.replace(/\{\{\s*nome\s*\}\}/gi, firstName(contactName));
}

const EMOJIS = [
  "😀", "😂", "😍", "🥰", "😉", "😎", "🤔", "😅", "😢", "😡",
  "👍", "👎", "🙏", "👏", "💪", "🤝", "✌️", "👌", "🫶", "❤️",
  "🎉", "🔥", "⭐", "✅", "❌", "⚠️", "📅", "📞", "💰", "🚀",
];

const PINNED_KEY = "inbox-pinned-v1";

function loadPinned(): number[] {
  try {
    const arr = JSON.parse(localStorage.getItem(PINNED_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Short notification beep via WebAudio — no asset needed.
function playNotificationBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {
    // Audio blocked (no user gesture yet) — silently skip.
  }
}

async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function attachmentKind(mime: string): OutgoingAttachment["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

function DownloadButton({ url, extension, className }: { url: string; extension?: string | null; className?: string }) {
  const download = useDownloadAttachment();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      title="Transferir"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await download(url, extension);
        } finally {
          setBusy(false);
        }
      }}
      className={cn("shrink-0 rounded-md p-1.5 opacity-70 transition-opacity hover:opacity-100", className)}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  );
}

// Renders a message attachment by type: image, audio, video, or generic file link.
function AttachmentView({
  attachment,
  outgoing,
  onPreview,
}: {
  attachment: InboxAttachment;
  outgoing: boolean;
  onPreview: (url: string) => void;
}) {
  const url = attachment.data_url;
  if (!url) return <p className="text-xs italic opacity-70">📎 anexo indisponível</p>;

  if (attachment.file_type === "image") {
    return (
      <button type="button" onClick={() => onPreview(url)} className="block cursor-zoom-in">
        <img src={url} alt="Imagem" loading="lazy" className="max-h-64 max-w-full rounded-lg object-contain" />
      </button>
    );
  }
  if (attachment.file_type === "audio") {
    return (
      <div className="flex items-center gap-1">
        <audio controls src={url} className="max-w-full" preload="none" />
        <DownloadButton url={url} extension={attachment.extension} />
      </div>
    );
  }
  if (attachment.file_type === "video") {
    return (
      <div className="space-y-1">
        <video controls src={url} className="max-h-64 max-w-full rounded-lg" preload="metadata" />
        <div className="flex justify-end">
          <DownloadButton url={url} extension={attachment.extension} />
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        outgoing ? "border-primary-foreground/30" : "border-border",
      )}
    >
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-2 underline-offset-2 hover:underline"
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate">{attachment.extension ? `Documento .${attachment.extension}` : "Documento"}</span>
      </a>
      <DownloadButton url={url} extension={attachment.extension} />
    </div>
  );
}

// Delivery ticks on outgoing bubbles: ✓ sent, ✓✓ delivered, ✓✓ (blue) read.
function StatusTicks({ status }: { status: string | null }) {
  if (status === "read") return <CheckCheck className="h-3 w-3 text-sky-300" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3" />;
  if (status === "failed") return <X className="h-3 w-3 text-red-300" />;
  return <Check className="h-3 w-3" />;
}

// Contact avatar: shows the WhatsApp profile photo, falling back to initials.
function ContactAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const [errored, setErrored] = useState(false);
  if (src && !errored) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErrored(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

// Compact full-width action row used in the contact panel.
function PanelAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      {label}
    </button>
  );
}

function ReplyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Responder"
      onClick={onClick}
      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
    >
      <Reply className="h-3.5 w-3.5" />
    </button>
  );
}

type ListTab = "all" | "unread" | "waiting" | "mine" | "archived";

export default function Inbox() {
  const { channel } = useWhatsappChannel();
  const connected = channel?.status === "connected";
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ListTab>("all");
  const [draft, setDraft] = useState("");
  // Optimistic bubbles: sent messages show instantly, before Evolution mirrors
  // them back into Chatwoot (which only lands on a later poll).
  const [pending, setPending] = useState<Array<{ key: string; conversationId: number; content: string; at: number; sent?: boolean }>>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  // Pending outgoing attachments (picked/pasted/dropped files, not yet sent).
  const [outAttachments, setOutAttachments] = useState<Array<{ file: File; kind: OutgoingAttachment["kind"] }>>([]);
  // Reply/quote target.
  const [replyTo, setReplyTo] = useState<{ waId: string; content: string; outgoing: boolean } | null>(null);
  // Voice recording + pre-send preview.
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [pendingVoice, setPendingVoice] = useState<{ blob: Blob; url: string } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const discardRecordingRef = useRef(false);
  // Older messages loaded on demand, per conversation.
  const [olderByConv, setOlderByConv] = useState<Record<number, InboxMessage[]>>({});
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [noMoreOlder, setNoMoreOlder] = useState<Record<number, boolean>>({});
  // Messages deleted-for-everyone this session (Chatwoot mirror keeps them).
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  // Pinned conversations (localStorage).
  const [pinned, setPinned] = useState<number[]>(loadPinned);
  // Muted conversations (localStorage) — no sound/badge for these.
  const [muted, setMuted] = useState<number[]>(loadMutedIds);
  // Outgoing message signature (*Nome:*) — useful when several agents share the number.
  const [signing, setSigning] = useState<boolean>(() => localStorage.getItem("inbox-signature-v1") === "1");
  // Out-of-hours auto-reply settings dialog.
  const [autoReplyOpen, setAutoReplyOpen] = useState(false);
  const [autoReplyDraft, setAutoReplyDraft] = useState<AutoReplyConfig | null>(null);
  // Quick replies management.
  const [newQuickReply, setNewQuickReply] = useState("");
  // Label creation.
  const [newLabel, setNewLabel] = useState("");
  // New conversation modal.
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvPhone, setNewConvPhone] = useState("");
  const [newConvMessage, setNewConvMessage] = useState("");
  // Rename contact dialog.
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  // Schedule message dialog.
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  // Assignee combobox open state.
  const [assignOpen, setAssignOpen] = useState(false);
  // Reminder ("Lembrar") popover + custom date/time dialog.
  const [reminderOpen, setReminderOpen] = useState(false);
  const [customReminderOpen, setCustomReminderOpen] = useState(false);
  const [customReminderAt, setCustomReminderAt] = useState("");
  // CRM contact panel: fixed right column on desktop (persisted), Sheet on mobile.
  const [panelOpen, setPanelOpen] = useState<boolean>(() => localStorage.getItem("inbox-panel-v1") !== "0");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number>(0);
  const lastTypingRef = useRef<number>(0);
  const lastAutoReadRef = useRef<number>(0);

  // The full connect screen only shows when the channel was NEVER configured.
  // A configured-but-dropped channel keeps the inbox usable (Chatwoot still
  // serves history) with a reconnect banner instead.
  const channelConfigured = !!channel;
  const { data: conversations = [], isLoading: loadingConvos } = useInboxConversations(channelConfigured);
  const selected = conversations.find((c) => c.id === selectedId) || null;
  const altIds = selected?.alt_ids ?? [];
  const { data: messages = [], isLoading: loadingMessages } = useInboxMessages(selectedId, altIds);
  // Debounced server-side search (one request after typing pauses, not per key).
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(t);
  }, [search]);
  const { data: searchResults = [] } = useSearchConversations(channelConfigured ? debouncedSearch : "");
  const sendMessage = useSendInboxMessage();
  const { mutate: markRead } = useMarkConversationRead();
  const download = useDownloadAttachment();
  const loadOlder = useLoadOlderMessages();
  const startConversation = useStartConversation();
  const toggleStatus = useToggleConversationStatus();
  const assignConversation = useAssignConversation();
  const renameContact = useRenameContact();
  const { data: labels = [] } = useInboxLabels();
  const createLabel = useCreateLabel();
  const setLabels = useSetConversationLabels();
  const { data: canned = [] } = useCannedResponses();
  const createCanned = useCreateCannedResponse();
  const deleteCanned = useDeleteCannedResponse();
  const deleteMessage = useDeleteMessage();
  const { data: teamMembers = [] } = useTeamMembers();
  const createEvent = useCreateEvent();

  const { data: phoneMatch } = useContactMatch(selected?.contact_phone);
  const createLead = useCreateLeadFromContact();
  const createClient = useCreateClientFromContact();
  const linkCrm = useLinkCrm();
  // A manual link on the conversation overrides the phone-based auto-match.
  const contactMatch = useMemo(
    () =>
      selected?.crm_id && selected.crm_kind
        ? { kind: selected.crm_kind, id: selected.crm_id, name: selected.crm_name ?? "Registo" }
        : phoneMatch ?? null,
    [selected?.crm_id, selected?.crm_kind, selected?.crm_name, phoneMatch],
  );
  const { data: crmRecord } = useCrmRecord(contactMatch);
  const updateLeadNotes = useUpdateLeadNotes();
  const updateClient = useUpdateClient();
  // Open proposals/sales for client panel.
  const clientId = contactMatch?.kind === "client" ? contactMatch.id : null;
  const { data: openProposals = [] } = useClientProposals(clientId);
  const { data: openSales = [] } = useClientSales(clientId);
  const activeProposals = openProposals.filter((p: any) => ["draft","sent","negotiating"].includes(p.status));
  const activeSales = openSales.filter((s: any) => ["in_progress","fulfilled"].includes(s.status));
  // Associate-to-existing combobox.
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  // "Adicionar ao CRM" dialog.
  const [addToCrmOpen, setAddToCrmOpen] = useState(false);
  const [addToCrmTab, setAddToCrmTab] = useState<"lead" | "client" | "existing">("lead");
  // Modais nativos de criação.
  const [createClientModalOpen, setCreateClientModalOpen] = useState(false);
  const [createLeadModalOpen, setCreateLeadModalOpen] = useState(false);
  const { data: linkResults = [] } = useSearchCrmRecords(linkOpen ? linkQuery : "");
  const sendTyping = useTypingPresence();
  const suggestReply = useSuggestReply();
  const { data: scheduledMsgs = [] } = useScheduledMessages(selected?.contact_phone);
  const scheduleMessage = useScheduleMessage();
  const cancelScheduled = useCancelScheduledMessage();
  const { data: autoReplyConfig } = useAutoReplyConfig();
  const saveAutoReply = useSaveAutoReplyConfig();
  const createCommunication = useCreateCommunication();
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link from Leads/Clients: /inbox?phone=351912345678 opens (or starts)
  // the conversation with that number.
  useEffect(() => {
    const phoneParam = (searchParams.get("phone") || "").replace(/\D/g, "");
    if (!phoneParam || loadingConvos) return;
    const found = conversations.find(
      (c) => (c.contact_phone || "").replace(/\D/g, "").endsWith(phoneParam.slice(-9)),
    );
    if (found) {
      setSelectedId(found.id);
    } else {
      setNewConvPhone(`+${phoneParam}`);
      setNewConvOpen(true);
    }
    searchParams.delete("phone");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadingConvos, conversations.length]);

  // Hide the Evolution control bot's QR-code conversations from the inbox.
  const visible = useMemo(
    () => conversations.filter((c) => c.contact_name !== "EvolutionAPI"),
    [conversations],
  );

  const filtered = useMemo(() => {
    let list = visible;
    if (tab === "archived") list = list.filter((c) => c.status === "resolved");
    else {
      list = list.filter((c) => c.status !== "resolved");
      if (tab === "unread") list = list.filter((c) => c.unread_count > 0);
      if (tab === "waiting") list = list.filter((c) => !!c.waiting_since);
      if (tab === "mine") list = list.filter((c) => c.assigned_id === user?.id);
    }
    if (search.trim()) {
      const byName = list.filter(
        (c) => matchesSearch(c.contact_name, search) || matchesSearch(c.contact_phone || "", search),
      );
      // Server search matches MESSAGE CONTENT — merge in anything new.
      const ids = new Set(byName.map((c) => c.id));
      const extra = searchResults.filter((c) => !ids.has(c.id) && c.contact_name !== "EvolutionAPI");
      list = [...byName, ...extra];
    }
    // Pinned first, then newest activity.
    return [...list].sort((a, b) => {
      const pa = pinned.includes(a.id) ? 1 : 0;
      const pb = pinned.includes(b.id) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return (b.updated_at ?? 0) - (a.updated_at ?? 0);
    });
  }, [visible, search, tab, searchResults, pinned, user?.id]);

  // Number of CONVERSATIONS with unread messages (not message total) — matches
  // the sidebar badge and avoids inflated counts from old imported history.
  const unreadTotal = useMemo(() => countUnreadConversations(visible), [visible]);
  const waitingTotal = useMemo(
    () => visible.filter((c) => c.status !== "resolved" && !!c.waiting_since).length,
    [visible],
  );

  // Notification sound when new unread messages arrive while the page is open.
  useEffect(() => {
    if (unreadTotal > prevUnreadRef.current) playNotificationBeep();
    prevUnreadRef.current = unreadTotal;
  }, [unreadTotal]);

  // Thread = older pages (loaded on demand) + live page, deduped by id.
  const thread = useMemo(() => {
    const older = selectedId ? olderByConv[selectedId] ?? [] : [];
    const seen = new Set<number>();
    const all: InboxMessage[] = [];
    for (const m of [...older, ...messages]) {
      if (!seen.has(m.id) && !deletedIds.has(m.id)) { seen.add(m.id); all.push(m); }
    }
    return all.sort((a, b) => toMs(a.created_at) - toMs(b.created_at));
  }, [olderByConv, selectedId, messages, deletedIds]);

  // Drop optimistic bubbles once the real (mirrored) message arrives in the feed.
  // Attachment/voice bubbles never text-match the mirror, so confirmed ("sent")
  // bubbles also expire after 8s — by then the mirror is in the thread.
  useEffect(() => {
    if (pending.length === 0) return;
    const prune = () =>
      setPending((prev) =>
        prev.filter((p) => {
          if (p.sent && Date.now() - p.at > 8000) return false;
          return !messages.some(
            (m) => m.outgoing && m.content === p.content && p.conversationId === selectedId,
          );
        }),
      );
    prune();
    const t = window.setInterval(prune, 2000);
    return () => window.clearInterval(t);
  }, [messages, selectedId, pending.length]);

  // Auto mark-read while the conversation is OPEN and the tab visible — new
  // incoming messages get blue ticks without having to reopen the thread.
  useEffect(() => {
    if (!selectedId || messages.length === 0) return;
    if (document.visibilityState !== "visible") return;
    const last = messages[messages.length - 1];
    if (!last || last.outgoing) return;
    const lastMs = toMs(last.created_at);
    if (lastMs <= lastAutoReadRef.current) return;
    lastAutoReadRef.current = lastMs;
    markRead({ conversationId: selectedId, altIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, selectedId]);

  const visiblePending = pending.filter((p) => p.conversationId === selectedId);

  // Auto-scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, visiblePending.length, selectedId]);

  // Mark the conversation as read in Chatwoot + WhatsApp when it is opened.
  useEffect(() => {
    if (selectedId) {
      const conv = conversations.find((c) => c.id === selectedId);
      markRead({ conversationId: selectedId, altIds: conv?.alt_ids ?? [] });
    }
    // Reset per-conversation composer state.
    setReplyTo(null);
    setOutAttachments([]);
    setPendingVoice(null);
    setNotesDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, markRead]);

  const handleLoadOlder = useCallback(async () => {
    if (!selectedId || thread.length === 0 || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const older = await loadOlder(selectedId, thread[0].id);
      const fresh = older.filter((m) => !thread.some((t) => t.id === m.id));
      if (fresh.length === 0) {
        setNoMoreOlder((prev) => ({ ...prev, [selectedId]: true }));
      } else {
        setOlderByConv((prev) => ({ ...prev, [selectedId]: [...fresh, ...(prev[selectedId] ?? [])] }));
      }
    } catch {
      toast({ title: "Não foi possível carregar mensagens antigas", variant: "destructive" });
    } finally {
      setLoadingOlder(false);
    }
  }, [selectedId, thread, loadingOlder, loadOlder, toast]);

  const myName = teamMembers.find((m) => m.user_id === user?.id)?.full_name || "";

  const doSend = useCallback(
    async (rawText: string, attachment?: OutgoingAttachment) => {
      if (!selectedId) return;
      // Optional signature — lets the customer know WHO is talking when the
      // whole team shares one number.
      const text = signing && rawText && myName ? `*${firstName(myName)}:*\n${rawText}` : rawText;
      const key = `${selectedId}-${Date.now()}-${Math.random()}`;
      const bubbleText = text || (attachment ? (attachment.kind === "voice" ? "🎵 Mensagem de voz" : `📎 ${attachment.filename}`) : "");
      setPending((prev) => [...prev, { key, conversationId: selectedId, content: bubbleText, at: Date.now() }]);
      sendMessage.mutate(
        {
          conversationId: selectedId,
          content: text,
          contactPhone: selected?.contact_phone,
          attachment,
          quotedId: replyTo?.waId ?? undefined,
        },
        {
          // Evolution accepted the message — it IS on WhatsApp now; show the tick
          // while we wait for the mirrored copy to land in Chatwoot.
          onSuccess: () => {
            setPending((prev) => prev.map((p) => (p.key === key ? { ...p, sent: true } : p)));
          },
          onError: (err) => {
            setPending((prev) => prev.filter((p) => p.key !== key));
            if (rawText) setDraft(rawText);
            toast({ title: "Falha ao enviar", description: (err as Error).message, variant: "destructive" });
          },
        },
      );
      setReplyTo(null);
    },
    [selectedId, selected?.contact_phone, replyTo, sendMessage, toast, signing, myName],
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if ((!content && outAttachments.length === 0) || !selectedId) return;
    setDraft("");

    if (outAttachments.length > 0) {
      const list = outAttachments;
      setOutAttachments([]);
      // First file carries the caption; the rest go bare.
      for (let i = 0; i < list.length; i++) {
        try {
          const data = await fileToBase64(list[i].file);
          await doSend(i === 0 ? content : "", {
            data,
            mimetype: list[i].file.type || "application/octet-stream",
            filename: list[i].file.name,
            kind: list[i].kind,
          });
        } catch {
          toast({ title: `Falha ao ler ${list[i].file.name}`, variant: "destructive" });
        }
      }
      return;
    }
    doSend(content);
  };

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const accepted: Array<{ file: File; kind: OutgoingAttachment["kind"] }> = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: `${file.name} é demasiado grande`, description: "Máximo 10 MB.", variant: "destructive" });
          continue;
        }
        accepted.push({ file, kind: attachmentKind(file.type) });
      }
      if (accepted.length > 0) setOutAttachments((prev) => [...prev, ...accepted]);
    },
    [toast],
  );

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  // Paste an image/print straight into the composer.
  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  };

  // ---- Voice recording (with pre-send preview) ----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordChunksRef.current = [];
      discardRecordingRef.current = false;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
        setRecording(false);
        setRecordSeconds(0);
        if (discardRecordingRef.current) return;
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1000) return; // too short — ignore
        // Preview before sending — listen, then send or discard.
        setPendingVoice({ blob, url: URL.createObjectURL(blob) });
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      toast({ title: "Microfone indisponível", description: "Autoriza o acesso ao microfone no browser.", variant: "destructive" });
    }
  };

  const stopRecording = (discard: boolean) => {
    discardRecordingRef.current = discard;
    recorderRef.current?.stop();
  };

  const sendVoice = async () => {
    if (!pendingVoice) return;
    const voice = pendingVoice;
    setPendingVoice(null);
    URL.revokeObjectURL(voice.url);
    try {
      const data = await fileToBase64(voice.blob);
      await doSend("", { data, mimetype: voice.blob.type, filename: "voz.webm", kind: "voice" });
    } catch {
      toast({ title: "Falha ao enviar o áudio", variant: "destructive" });
    }
  };

  // ---- Pin ----
  const togglePin = (id: number) => {
    const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id];
    setPinned(next);
    localStorage.setItem(PINNED_KEY, JSON.stringify(next));
  };

  // ---- Snooze/reminder via calendar ----
  // Creates a follow-up event in the Agenda and a push notification that fires at
  // `when`. The check-reminders cron sends the push when
  // (start_time - reminder_minutes) is reached while start_time is still future —
  // so we place the event 2 min past `when` with a 2 min reminder window, landing
  // the push exactly at `when`.
  const createReminder = (when: Date) => {
    if (!selected) return;
    if (when.getTime() <= Date.now()) {
      toast({ title: "Escolhe uma hora no futuro", variant: "destructive" });
      return;
    }
    const eventStart = new Date(when.getTime() + 2 * 60000);
    createEvent.mutate(
      {
        title: `Responder a ${selected.contact_name} (WhatsApp)`,
        event_type: "follow_up",
        start_time: eventStart.toISOString(),
        reminder_minutes: 2,
        ...(contactMatch?.kind === "lead" ? { lead_id: contactMatch.id } : {}),
      },
      {
        onSuccess: () =>
          toast({
            title: "Lembrete criado",
            description: `Vais receber uma notificação a ${when.toLocaleString("pt-PT", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}. Também fica na tua Agenda.`,
          }),
      },
    );
  };

  const snooze = (hoursFromNow: number | "tomorrow") => {
    const when = new Date();
    if (hoursFromNow === "tomorrow") {
      when.setDate(when.getDate() + 1);
      when.setHours(9, 0, 0, 0);
    } else {
      when.setTime(when.getTime() + hoursFromNow * 3600000);
    }
    createReminder(when);
  };

  // ---- Conversation actions (used by the contact panel) ----
  const handleToggleMute = () => {
    if (!selected) return;
    const next = muted.includes(selected.id)
      ? muted.filter((m) => m !== selected.id)
      : [...muted, selected.id];
    setMuted(next);
    saveMutedIds(next);
    toast({ title: muted.includes(selected.id) ? "Notificações reativadas" : "Conversa silenciada" });
  };

  const handleExport = () => {
    if (!selected) return;
    const lines = thread
      .filter((m) => !m.is_activity)
      .map((m) => {
        const when = new Date(toMs(m.created_at)).toLocaleString("pt-PT");
        const who = m.outgoing ? (m.sender_name || "Eu") : selected.contact_name;
        const what = m.content || (m.attachments.length > 0 ? `[${m.attachments[0].file_type}]` : "");
        return `[${when}] ${who}: ${what}`;
      });
    const blob = new Blob(
      [`Conversa com ${selected.contact_name} (+${selected.contact_phone ?? ""})\n\n${lines.join("\n")}`],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversa-${selected.contact_name.replace(/\W+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegisterClient = () => {
    if (!selected || contactMatch?.kind !== "client") return;
    const transcript = thread
      .filter((m) => !m.is_activity && m.content)
      .slice(-20)
      .map((m) => `${m.outgoing ? "Nós" : selected.contact_name}: ${m.content}`)
      .join("\n");
    createCommunication.mutate(
      {
        client_id: contactMatch.id,
        type: "whatsapp",
        direction: "inbound",
        subject: "Conversa WhatsApp (Caixa de Entrada)",
        content: transcript,
      },
      {
        onSuccess: () => toast({ title: "Registado na timeline do cliente" }),
        onError: (err) => toast({ title: "Falha ao registar", description: (err as Error).message, variant: "destructive" }),
      },
    );
  };

  const handleToggleArchive = () => {
    if (!selected) return;
    const archived = selected.status === "resolved";
    toggleStatus.mutate(
      { conversationId: selected.id, status: archived ? "open" : "resolved" },
      {
        onSuccess: () => {
          toast({ title: archived ? "Conversa restaurada" : "Conversa arquivada" });
          if (!archived) setSelectedId(null);
        },
      },
    );
  };

  // ---- CRM: define a contact as Lead/Client, or link to an existing record ----
  const handleDefineAs = (kind: "lead" | "client") => {
    if (!selected?.contact_phone) return;
    const payload = { name: selected.contact_name, phone: `+${selected.contact_phone}` };
    const mutation = kind === "lead" ? createLead : createClient;
    mutation.mutate(payload, {
      onSuccess: (record) => {
        if (record?.id) {
          // Persist the link so it survives phone-formatting mismatches.
          linkCrm.mutate({ conversationId: selected.id, kind, id: record.id, name: record.name ?? selected.contact_name });
        }
        toast({ title: kind === "lead" ? "Lead criada" : "Cliente criado", description: `${selected.contact_name} adicionado.` });
      },
      onError: (err) => toast({ title: "Falha ao criar", description: (err as Error).message, variant: "destructive" }),
    });
  };

  const handleLinkExisting = (match: { kind: "lead" | "client"; id: string; name: string }) => {
    if (!selected) return;
    linkCrm.mutate(
      { conversationId: selected.id, kind: match.kind, id: match.id, name: match.name },
      {
        onSuccess: () => {
          setLinkOpen(false);
          setLinkQuery("");
          toast({ title: "Conversa associada", description: `Ligada a ${match.name}.` });
        },
        onError: (err) => toast({ title: "Falha ao associar", description: (err as Error).message, variant: "destructive" }),
      },
    );
  };

  const handleUnlink = () => {
    if (!selected) return;
    linkCrm.mutate(
      { conversationId: selected.id, kind: null, id: null, name: null },
      { onSuccess: () => toast({ title: "Associação removida" }) },
    );
  };

  // ---- New conversation ----
  const handleStartConversation = () => {
    const phone = newConvPhone.replace(/\D/g, "");
    const content = newConvMessage.trim();
    if (phone.length < 9 || !content) return;
    startConversation.mutate(
      { phone, content },
      {
        onSuccess: () => {
          setNewConvOpen(false);
          setNewConvPhone("");
          setNewConvMessage("");
          toast({ title: "Mensagem enviada", description: "A conversa vai aparecer na lista em segundos." });
        },
        onError: (err) => {
          toast({ title: "Falha ao enviar", description: (err as Error).message, variant: "destructive" });
        },
      },
    );
  };

  // ---- Empty state: WhatsApp never configured ----
  if (!channelConfigured) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-2xl bg-green-500/10 p-5">
          <Smartphone className="h-12 w-12 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Liga o teu WhatsApp</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Conecta o teu número para receberes e responderes às mensagens dos clientes aqui, dentro do Senvia.
          </p>
        </div>
        <Button onClick={() => setConnectOpen(true)}>
          <Smartphone className="mr-2 h-4 w-4" />
          Conectar WhatsApp
        </Button>
        <ConnectWhatsAppModal open={connectOpen} onOpenChange={setConnectOpen} />
      </div>
    );
  }

  const isArchived = selected?.status === "resolved";
  const isPinned = selected ? pinned.includes(selected.id) : false;

  // Contact profile panel (QuickReply-style): right column on desktop, Sheet on
  // mobile — same content in both. Order: profile → assign → tags → details →
  // notes → conversation actions.
  const contactPanel = selected && (
    <div className="flex h-full flex-col space-y-4 overflow-y-auto p-4">
      {/* Profile — avatar on the left, info on the right */}
      <div className="flex items-start gap-3 pt-2">
        <ContactAvatar name={selected.contact_name} src={selected.contact_thumbnail} className="h-20 w-20 shrink-0" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate font-semibold">{selected.contact_name}</p>
          {selected.contact_phone && (
            <p className="truncate text-xs text-muted-foreground">+{selected.contact_phone}</p>
          )}
          {crmRecord?.email && (
            <p className="truncate text-xs text-muted-foreground">{crmRecord.email}</p>
          )}
          <div className="pt-1">
            {contactMatch ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                {contactMatch.kind === "client" ? "Cliente" : "Lead"}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                Sem registo no CRM
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CRM association */}
      <div className="border-t pt-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">CRM</p>
        {contactMatch ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  contactMatch.kind === "client" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary",
                )}>
                  {contactMatch.kind === "client" ? "C" : "L"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{contactMatch.name}</p>
                  <p className="text-[11px] text-muted-foreground">{contactMatch.kind === "client" ? "Cliente" : "Lead"}</p>
                </div>
              </div>
              <button
                type="button"
                title="Remover associação"
                onClick={handleUnlink}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate(contactMatch.kind === "client" ? "/clients" : "/leads")}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Abrir ficha
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setLinkOpen(true)}>
                Alterar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Este contacto ainda não está no CRM.</p>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { setAddToCrmTab("existing"); setAddToCrmOpen(true); }}>
              <Search className="mr-1.5 h-3.5 w-3.5" /> Associar a existente
            </Button>
          </div>
        )}

        {/* Associate-to-existing combobox */}
        <Popover open={linkOpen} onOpenChange={(o) => { setLinkOpen(o); if (!o) setLinkQuery(""); }}>
          <PopoverTrigger asChild>
            <span className="sr-only">Associar</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <Command shouldFilter={false}>
              <CommandInput value={linkQuery} onValueChange={setLinkQuery} placeholder="Procurar lead ou cliente..." className="h-9" />
              <CommandList>
                <CommandEmpty>
                  {linkQuery.trim().length < 2 ? "Escreve para procurar..." : "Nada encontrado."}
                </CommandEmpty>
                <CommandGroup>
                  {linkResults.map((r) => (
                    <CommandItem
                      key={`${r.kind}-${r.id}`}
                      value={`${r.kind}-${r.id}`}
                      onSelect={() => handleLinkExisting(r)}
                    >
                      <span className={cn(
                        "mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                        r.kind === "client" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary",
                      )}>
                        {r.kind === "client" ? "C" : "L"}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{r.name}</span>
                      <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                        {r.kind === "client" ? "Cliente" : "Lead"}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Assign to team member — searchable combobox (scales to large teams) */}
      <div className="border-t pt-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <UserCog className="h-3.5 w-3.5" /> Atribuir a
        </p>
        <Popover open={assignOpen} onOpenChange={setAssignOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between font-normal">
              <span className="flex min-w-0 items-center gap-2">
                {selected.assigned_name ? (
                  <>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                      {initials(selected.assigned_name)}
                    </span>
                    <span className="truncate">{selected.assigned_name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Não atribuída</span>
                )}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Procurar colaborador..." className="h-9" />
              <CommandList>
                <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                <CommandGroup>
                  {selected.assigned_id && (
                    <CommandItem
                      value="__none__ não atribuída remover"
                      onSelect={() => {
                        assignConversation.mutate(
                          { conversationId: selected.id, userId: null, userName: null },
                          { onSuccess: () => toast({ title: "Atribuição removida" }) },
                        );
                        setAssignOpen(false);
                      }}
                      className="text-muted-foreground"
                    >
                      <X className="mr-2 h-3.5 w-3.5" />
                      Remover atribuição
                    </CommandItem>
                  )}
                  {teamMembers.filter((m) => !m.is_banned).map((m) => {
                    const active = selected.assigned_id === m.user_id;
                    return (
                      <CommandItem
                        key={m.user_id}
                        value={m.full_name}
                        onSelect={() => {
                          if (!active) {
                            assignConversation.mutate(
                              { conversationId: selected.id, userId: m.user_id, userName: m.full_name },
                              { onSuccess: () => toast({ title: `Atribuída a ${m.full_name}` }) },
                            );
                          }
                          setAssignOpen(false);
                        }}
                      >
                        <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                          {initials(m.full_name)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{m.full_name}</span>
                        {active && <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-primary" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tags */}
      <div className="border-t pt-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Tag className="h-3.5 w-3.5" /> Etiquetas
        </p>
        <div className="flex flex-wrap gap-1.5">
          {labels.map((l) => {
            const active = selected.labels.includes(l.title);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  const next = active
                    ? selected.labels.filter((t) => t !== l.title)
                    : [...selected.labels, l.title];
                  setLabels.mutate({ conversationId: selected.id, labels: next });
                }}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {l.title}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nova etiqueta..."
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newLabel.trim()) {
                e.preventDefault();
                createLabel.mutate(newLabel.trim(), { onSuccess: () => setNewLabel("") });
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 px-2"
            disabled={!newLabel.trim() || createLabel.isPending}
            onClick={() => createLabel.mutate(newLabel.trim(), { onSuccess: () => setNewLabel("") })}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Details */}
      {crmRecord?.kind === "lead" && (
        <div className="space-y-2 border-t pt-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Estado</span>
            <span className="text-xs font-medium">{crmRecord.status || "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Valor</span>
            <span className="text-xs font-medium">
              {crmRecord.value != null ? `${Number(crmRecord.value).toLocaleString("pt-PT")} €` : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Open proposals / sales — only for clients */}
      {(activeProposals.length > 0 || activeSales.length > 0) && (
        <div className="border-t pt-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Em aberto</p>
          {activeSales.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
              <span className="truncate font-medium">{s.title || "Venda"}</span>
              <span className="ml-2 shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">Venda</span>
            </div>
          ))}
          {activeProposals.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
              <span className="truncate font-medium">{p.title || "Proposta"}</span>
              <span className="ml-2 shrink-0 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">Proposta</span>
            </div>
          ))}
        </div>
      )}

      {/* Internal notes — leads and clients */}
      {crmRecord && (
        <div className="border-t pt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Notas internas</p>
          <Textarea
            value={notesDraft ?? crmRecord.notes ?? ""}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={3}
            placeholder={`Notas sobre ${crmRecord.kind === "lead" ? "esta lead" : "este cliente"}...`}
            className="text-sm"
          />
          <Button
            size="sm"
            variant="secondary"
            className="mt-2 w-full"
            disabled={notesDraft === null || updateLeadNotes.isPending || updateClient.isPending}
            onClick={() => {
              const notes = notesDraft ?? "";
              if (crmRecord.kind === "lead") {
                updateLeadNotes.mutate(
                  { leadId: crmRecord.id, notes },
                  { onSuccess: () => { setNotesDraft(null); toast({ title: "Notas guardadas" }); } },
                );
              } else {
                updateClient.mutate(
                  { id: crmRecord.id, notes },
                  { onSuccess: () => { setNotesDraft(null); toast({ title: "Notas guardadas" }); } },
                );
              }
            }}
          >
            {(updateLeadNotes.isPending || updateClient.isPending) ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Guardar notas
          </Button>
        </div>
      )}

      {/* Conversation actions */}
      <div className="border-t pt-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Ações</p>
        <div className="space-y-0.5">
          <PanelAction icon={Pencil} label="Renomear contacto" onClick={() => { setRenameValue(selected.contact_name); setRenameOpen(true); }} />
          <PanelAction
            icon={isPinned ? PinOff : Pin}
            label={isPinned ? "Desafixar" : "Fixar no topo"}
            onClick={() => togglePin(selected.id)}
          />
          <PanelAction
            icon={muted.includes(selected.id) ? Bell : BellOff}
            label={muted.includes(selected.id) ? "Reativar notificações" : "Silenciar conversa"}
            onClick={handleToggleMute}
          />
          <Popover open={reminderOpen} onOpenChange={setReminderOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <AlarmClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                Lembrar-me de responder
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
              <p className="px-2 py-1 text-[11px] text-muted-foreground">
                Cria um lembrete na Agenda e envia-te uma notificação.
              </p>
              {[
                { label: "Daqui a 1 hora", run: () => snooze(1) },
                { label: "Daqui a 3 horas", run: () => snooze(3) },
                { label: "Amanhã de manhã (9h)", run: () => snooze("tomorrow") },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => { opt.run(); setReminderOpen(false); }}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {opt.label}
                </button>
              ))}
              <div className="my-1 border-t" />
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 60 * 60000);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  setCustomReminderAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                  setReminderOpen(false);
                  setCustomReminderOpen(true);
                }}
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                Escolher data e hora...
              </button>
            </PopoverContent>
          </Popover>
          <PanelAction icon={FileDown} label="Exportar conversa (.txt)" onClick={handleExport} />
          {contactMatch?.kind === "client" && (
            <PanelAction icon={ClipboardList} label="Registar no cliente" onClick={handleRegisterClient} />
          )}
          <PanelAction
            icon={isArchived ? ArchiveRestore : Archive}
            label={isArchived ? "Restaurar conversa" : "Arquivar conversa"}
            onClick={handleToggleArchive}
          />
        </div>
      </div>

    </div>
  );

  // Thread rows with date separators interleaved.
  const threadRows: Array<{ type: "sep"; key: string; label: string } | { type: "msg"; key: string; msg: InboxMessage }> = [];
  let lastDay = "";
  for (const m of thread.filter((m) => !m.is_activity)) {
    const ms = toMs(m.created_at);
    const k = dayKey(ms);
    if (k !== lastDay) {
      lastDay = k;
      threadRows.push({ type: "sep", key: `sep-${k}`, label: dayLabel(ms) });
    }
    threadRows.push({ type: "msg", key: `m-${m.id}`, msg: m });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Reconnect banner: channel configured but the WhatsApp session dropped */}
      {!connected && (
        <div className="flex items-center gap-2 border-b bg-red-500/10 px-4 py-2 text-sm text-red-700">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            O WhatsApp está desconectado — os envios vão falhar até reconectares.
          </span>
          <Button size="sm" variant="destructive" onClick={() => setConnectOpen(true)}>
            Reconectar
          </Button>
          <ConnectWhatsAppModal open={connectOpen} onOpenChange={setConnectOpen} />
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* ---- Conversation list ---- */}
      <aside
        className={cn(
          "w-full flex-col border-r md:flex md:w-80 lg:w-96",
          selectedId ? "hidden md:flex" : "flex",
        )}
      >
        <div className="border-b p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <MessageSquare className="h-5 w-5 text-primary" />
              Caixa de Entrada
            </h1>
            <div className="flex gap-1.5">
              <Button
                size="icon"
                variant="ghost"
                title="Auto-resposta fora de horário"
                onClick={() => {
                  setAutoReplyDraft(autoReplyConfig ?? null);
                  setAutoReplyOpen(true);
                }}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" title="Nova conversa" onClick={() => setNewConvOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar por nome ou mensagem..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([
              ["all", "Todas"],
              ["unread", unreadTotal > 0 ? `Não lidas (${unreadTotal})` : "Não lidas"],
              ["waiting", waitingTotal > 0 ? `À espera (${waitingTotal})` : "À espera"],
              ["mine", "Minhas"],
              ["archived", "Arquivadas"],
            ] as Array<[ListTab, string]>).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  tab === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                  key === "waiting" && tab !== key && waitingTotal > 0 && "text-amber-600",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">A carregar conversas...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {search
                ? "Nenhuma conversa encontrada."
                : tab === "archived"
                  ? "Sem conversas arquivadas."
                  : tab === "unread"
                    ? "Sem conversas por ler. 🎉"
                    : tab === "waiting"
                      ? "Ninguém à espera de resposta. 🎉"
                      : tab === "mine"
                        ? "Nenhuma conversa atribuída a ti."
                        : "Ainda não há conversas. Quando um cliente enviar uma mensagem, ela aparece aqui."}
            </div>
          ) : (
            filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === selectedId}
                pinned={pinned.includes(c.id)}
                muted={muted.includes(c.id)}
                onClick={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ---- Thread ---- */}
      <section
        className={cn("flex-1 flex-col", selectedId ? "flex" : "hidden md:flex")}
        onDragOver={(e) => {
          if (selectedId) e.preventDefault();
        }}
        onDrop={(e) => {
          if (!selectedId) return;
          e.preventDefault();
          if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
        }}
      >
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-40" />
            <p className="text-sm">Seleciona uma conversa para começar</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 border-b p-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <ContactAvatar name={selected.contact_name} src={selected.contact_thumbnail} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium">{selected.contact_name}</p>
                  {isPinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-2">
                  {selected.contact_phone && (
                    <p className="truncate text-xs text-muted-foreground">+{selected.contact_phone}</p>
                  )}
                  {selected.assigned_name && (
                    <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                      {selected.assigned_name}
                    </span>
                  )}
                  {selected.labels.map((l) => (
                    <span key={l} className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{l}</span>
                  ))}
                </div>
              </div>

              {/* Adicionar ao CRM — abre diálogo com opções */}
              {!contactMatch && selected.contact_phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex"
                  onClick={() => setAddToCrmOpen(true)}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar ao CRM
                </Button>
              )}

              {/* Contact panel toggle: fixed column on desktop, sheet on mobile */}
              <Button
                variant="ghost"
                size="icon"
                title="Painel do contacto"
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    const next = !panelOpen;
                    setPanelOpen(next);
                    localStorage.setItem("inbox-panel-v1", next ? "1" : "0");
                  } else {
                    setSheetOpen(true);
                  }
                }}
              >
                <PanelRight className={cn("h-4 w-4", panelOpen && "text-primary")} />
              </Button>

            </div>

            {/* Messages */}
            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4">
              {loadingMessages && thread.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">A carregar mensagens...</span>
                </div>
              ) : (
                <>
                  {thread.length >= 20 && !noMoreOlder[selected.id] && (
                    <div className="flex justify-center">
                      <Button variant="ghost" size="sm" disabled={loadingOlder} onClick={handleLoadOlder}>
                        {loadingOlder ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ChevronUp className="mr-1.5 h-3.5 w-3.5" />}
                        Carregar mensagens anteriores
                      </Button>
                    </div>
                  )}
                  {threadRows.map((row) =>
                    row.type === "sep" ? (
                      <div key={row.key} className="flex justify-center py-1">
                        <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {row.label}
                        </span>
                      </div>
                    ) : (
                      <MessageBubble
                        key={row.key}
                        m={row.msg}
                        onPreview={setPreviewUrl}
                        onReply={(m) => setReplyTo({ waId: m.wa_id!, content: m.content, outgoing: m.outgoing })}
                        onDelete={
                          row.msg.outgoing && row.msg.wa_id && selected.contact_phone
                            ? (m) => {
                                if (!window.confirm("Apagar esta mensagem para todos no WhatsApp?")) return;
                                deleteMessage.mutate(
                                  { waId: m.wa_id!, phone: selected.contact_phone! },
                                  {
                                    onSuccess: () => {
                                      setDeletedIds((prev) => new Set([...prev, m.id]));
                                      toast({ title: "Mensagem apagada no WhatsApp" });
                                    },
                                    onError: (err) =>
                                      toast({ title: "Falha ao apagar", description: (err as Error).message, variant: "destructive" }),
                                  },
                                );
                              }
                            : undefined
                        }
                      />
                    ),
                  )}
                  {visiblePending.map((p) => (
                    <div key={p.key} className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary/80 px-3 py-2 text-sm text-primary-foreground">
                        <p className="whitespace-pre-wrap break-words">{p.content}</p>
                        <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-primary-foreground/70">
                          {p.sent ? <Check className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                          {p.sent ? "" : "a enviar..."}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Scheduled messages for this contact */}
            {scheduledMsgs.length > 0 && (
              <div className="space-y-1 border-t bg-violet-500/5 px-3 py-2">
                {scheduledMsgs.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                    <span className="shrink-0 font-medium text-violet-600">
                      {new Date(s.send_at).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.content}</span>
                    <button
                      type="button"
                      title="Cancelar envio"
                      onClick={() => cancelScheduled.mutate(s.id, { onSuccess: () => toast({ title: "Envio cancelado" }) })}
                      className="rounded p-1 hover:bg-accent"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Reply quote bar */}
            {replyTo && (
              <div className="flex items-center gap-2 border-t bg-muted/40 px-3 py-2">
                <Reply className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  A responder a: <span className="italic">{replyTo.content || "📎 anexo"}</span>
                </p>
                <button type="button" onClick={() => setReplyTo(null)} className="rounded p-1 hover:bg-accent">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Pending attachment chips */}
            {outAttachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t bg-muted/40 px-3 py-2">
                {outAttachments.map((a, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-[160px] truncate">{a.file.name}</span>
                    <button
                      type="button"
                      onClick={() => setOutAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="rounded p-0.5 hover:bg-accent"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Voice preview before sending */}
            {pendingVoice && (
              <div className="flex items-center gap-2 border-t bg-muted/40 px-3 py-2">
                <audio controls src={pendingVoice.url} className="h-9 flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Descartar"
                  onClick={() => {
                    URL.revokeObjectURL(pendingVoice.url);
                    setPendingVoice(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" title="Enviar áudio" onClick={sendVoice}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Composer */}
            {recording ? (
              <div className="flex items-center gap-3 border-t p-3">
                <span className="flex items-center gap-2 text-sm text-red-500">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  A gravar... {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, "0")}
                </span>
                <div className="flex-1" />
                <Button type="button" variant="ghost" size="icon" title="Cancelar" onClick={() => stopRecording(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" title="Parar e ouvir" onClick={() => stopRecording(false)}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSend} onPaste={handlePaste} className="flex items-center gap-1.5 border-t p-3">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handlePickFile} />
                <Button type="button" variant="ghost" size="icon" title="Anexar ficheiros" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" />
                </Button>

                {/* Emoji picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" title="Emoji">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-64 p-2">
                    <div className="grid grid-cols-10 gap-0.5">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setDraft((d) => d + e)}
                          className="rounded p-1 text-lg hover:bg-accent"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Quick replies (org-wide, with {{nome}} variable) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" title="Respostas rápidas">
                      <Zap className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-80 p-3">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Respostas rápidas da equipa</p>
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Usa <code className="rounded bg-muted px-1">{"{{nome}}"}</code> para o primeiro nome do contacto.
                    </p>
                    {canned.length === 0 && (
                      <p className="mb-2 text-xs text-muted-foreground">Ainda não há respostas guardadas.</p>
                    )}
                    <div className="mb-2 max-h-48 space-y-1 overflow-y-auto">
                      {canned.map((qr) => (
                        <div key={qr.id} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDraft(applyVars(qr.content, selected.contact_name))}
                            className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                            title={qr.content}
                          >
                            {qr.content}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCanned.mutate(qr.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-accent"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Input
                        value={newQuickReply}
                        onChange={(e) => setNewQuickReply(e.target.value)}
                        placeholder="Nova resposta rápida..."
                        className="h-8 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newQuickReply.trim()) {
                            e.preventDefault();
                            createCanned.mutate(newQuickReply.trim(), { onSuccess: () => setNewQuickReply("") });
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8"
                        disabled={!newQuickReply.trim() || createCanned.isPending}
                        onClick={() => createCanned.mutate(newQuickReply.trim(), { onSuccess: () => setNewQuickReply("") })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* AI suggestion */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Sugerir resposta com IA"
                  disabled={suggestReply.isPending || thread.length === 0}
                  onClick={() =>
                    suggestReply.mutate(
                      { conversationId: selected.id, altIds },
                      {
                        onSuccess: (suggestion) => setDraft(suggestion),
                        onError: (err) =>
                          toast({ title: "Falha na sugestão", description: (err as Error).message, variant: "destructive" }),
                      },
                    )
                  }
                >
                  {suggestReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-violet-500" />}
                </Button>

                {/* Signature toggle */}
                {teamMembers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={signing ? "Assinatura ativa — o cliente vê o teu nome" : "Assinar mensagens com o teu nome"}
                    onClick={() => {
                      const next = !signing;
                      setSigning(next);
                      localStorage.setItem("inbox-signature-v1", next ? "1" : "0");
                    }}
                  >
                    <PenLine className={cn("h-4 w-4", signing && "text-primary")} />
                  </Button>
                )}

                <Input
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    // Show "typing..." on the contact's WhatsApp (throttled).
                    if (selected?.contact_phone && Date.now() - lastTypingRef.current > 4000) {
                      lastTypingRef.current = Date.now();
                      sendTyping(selected.contact_phone);
                    }
                  }}
                  placeholder={outAttachments.length > 0 ? "Legenda (opcional)..." : "Escreve uma mensagem..."}
                  autoComplete="off"
                />

                {draft.trim() && selected.contact_phone && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Agendar envio"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(9, 0, 0, 0);
                      // datetime-local needs local time without timezone suffix.
                      const pad = (n: number) => String(n).padStart(2, "0");
                      setScheduleAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                      setScheduleOpen(true);
                    }}
                  >
                    <CalendarClock className="h-4 w-4" />
                  </Button>
                )}

                {draft.trim() || outAttachments.length > 0 ? (
                  <Button type="submit" size="icon" disabled={sendMessage.isPending}>
                    {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                ) : (
                  <Button type="button" size="icon" variant="ghost" title="Gravar mensagem de voz" onClick={startRecording}>
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
              </form>
            )}
          </>
        )}
      </section>

      {/* ---- Contact panel (desktop right column) ---- */}
      {selected && panelOpen && (
        <aside className="hidden w-72 shrink-0 flex-col border-l lg:flex">
          {contactPanel}
        </aside>
      )}
      </div>

      {/* Image lightbox */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          {previewUrl && (
            <div className="space-y-2">
              <img src={previewUrl} alt="Imagem" className="max-h-[80vh] w-full rounded-lg object-contain" />
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={downloading}
                  onClick={async () => {
                    setDownloading(true);
                    try {
                      await download(previewUrl);
                    } finally {
                      setDownloading(false);
                    }
                  }}
                >
                  {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Transferir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New conversation modal */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Número de WhatsApp</label>
              <Input
                value={newConvPhone}
                onChange={(e) => setNewConvPhone(e.target.value)}
                placeholder="+351 912 345 678"
                inputMode="tel"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Mensagem</label>
              <Textarea
                value={newConvMessage}
                onChange={(e) => setNewConvMessage(e.target.value)}
                placeholder="Escreve a primeira mensagem..."
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={newConvPhone.replace(/\D/g, "").length < 9 || !newConvMessage.trim() || startConversation.isPending}
              onClick={handleStartConversation}
            >
              {startConversation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule message dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Agendar envio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="rounded-md bg-muted px-3 py-2 text-sm">{draft}</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Enviar em</label>
              <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            </div>
            <Button
              className="w-full"
              disabled={!scheduleAt || new Date(scheduleAt) <= new Date() || scheduleMessage.isPending}
              onClick={() =>
                scheduleMessage.mutate(
                  { phone: selected!.contact_phone!, content: draft.trim(), sendAt: new Date(scheduleAt) },
                  {
                    onSuccess: () => {
                      setScheduleOpen(false);
                      setDraft("");
                      toast({
                        title: "Mensagem agendada",
                        description: `Será enviada a ${new Date(scheduleAt).toLocaleString("pt-PT")}.`,
                      });
                    },
                    onError: (err) =>
                      toast({ title: "Falha ao agendar", description: (err as Error).message, variant: "destructive" }),
                  },
                )
              }
            >
              {scheduleMessage.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
              Agendar
            </Button>
            {scheduleAt && new Date(scheduleAt) <= new Date() && (
              <p className="text-xs text-destructive">A data tem de ser no futuro.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Adicionar ao CRM */}
      <Dialog open={addToCrmOpen} onOpenChange={(o) => { setAddToCrmOpen(o); if (!o) setLinkQuery(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar ao CRM</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Tab selector */}
              <div className="flex rounded-lg border p-1 gap-1">
                {(["lead", "client", "existing"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setAddToCrmTab(tab)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                      addToCrmTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {tab === "lead" ? "Nova Lead" : tab === "client" ? "Novo Cliente" : "Associar"}
                  </button>
                ))}
              </div>

              {addToCrmTab !== "existing" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Preenche os dados e cria {addToCrmTab === "lead" ? "a lead" : "o cliente"} com este contacto já ligado.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setAddToCrmOpen(false);
                      if (addToCrmTab === "client") setCreateClientModalOpen(true);
                      else setCreateLeadModalOpen(true);
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Abrir formulário de {addToCrmTab === "lead" ? "Lead" : "Cliente"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Procura e associa esta conversa a um registo existente.</p>
                  <Command shouldFilter={false} className="rounded-lg border">
                    <CommandInput value={linkQuery} onValueChange={setLinkQuery} placeholder="Procurar lead ou cliente..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>{linkQuery.trim().length < 2 ? "Escreve para procurar..." : "Nada encontrado."}</CommandEmpty>
                      <CommandGroup>
                        {linkResults.map((r) => (
                          <CommandItem
                            key={`${r.kind}-${r.id}`}
                            value={`${r.kind}-${r.id}`}
                            onSelect={() => { handleLinkExisting(r); setAddToCrmOpen(false); }}
                          >
                            <span className={cn(
                              "mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                              r.kind === "client" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary",
                            )}>
                              {r.kind === "client" ? "C" : "L"}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{r.name}</span>
                            <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                              {r.kind === "client" ? "Cliente" : "Lead"}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modais nativos de criação — com dados do contacto pré-preenchidos */}
      {selected && (
        <>
          <CreateClientModal
            open={createClientModalOpen}
            onOpenChange={setCreateClientModalOpen}
            initialData={{
              name: selected.contact_name,
              phone: selected.contact_phone ? `+${selected.contact_phone}` : undefined,
              source: "whatsapp",
            }}
            onCreated={(clientId) => {
              linkCrm.mutate({ conversationId: selected.id, kind: "client", id: clientId, name: selected.contact_name });
            }}
          />
          <AddLeadModal
            open={createLeadModalOpen}
            onOpenChange={setCreateLeadModalOpen}
          />
        </>
      )}

      {/* Custom reminder date/time */}
      <Dialog open={customReminderOpen} onOpenChange={setCustomReminderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Lembrar-me de responder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Data e hora</label>
              <Input type="datetime-local" value={customReminderAt} onChange={(e) => setCustomReminderAt(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Recebes uma notificação a esta hora e fica registado na tua Agenda.
            </p>
            <Button
              className="w-full"
              disabled={!customReminderAt || new Date(customReminderAt) <= new Date()}
              onClick={() => {
                createReminder(new Date(customReminderAt));
                setCustomReminderOpen(false);
              }}
            >
              <AlarmClock className="mr-2 h-4 w-4" />
              Criar lembrete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Out-of-hours auto-reply settings */}
      <Dialog open={autoReplyOpen} onOpenChange={setAutoReplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Auto-resposta fora de horário</DialogTitle>
          </DialogHeader>
          {autoReplyDraft && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoReplyDraft.enabled}
                  onChange={(e) => setAutoReplyDraft({ ...autoReplyDraft, enabled: e.target.checked })}
                  className="h-4 w-4"
                />
                Responder automaticamente fora do horário de trabalho
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Início do horário</label>
                  <Input
                    type="time"
                    value={autoReplyDraft.start}
                    onChange={(e) => setAutoReplyDraft({ ...autoReplyDraft, start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Fim do horário</label>
                  <Input
                    type="time"
                    value={autoReplyDraft.end}
                    onChange={(e) => setAutoReplyDraft({ ...autoReplyDraft, end: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Mensagem automática</label>
                <Textarea
                  value={autoReplyDraft.message}
                  onChange={(e) => setAutoReplyDraft({ ...autoReplyDraft, message: e.target.value })}
                  rows={3}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Enviada no máximo uma vez por conversa a cada 6 horas, fora do horário definido (hora de Lisboa).
                </p>
              </div>
              <Button
                className="w-full"
                disabled={saveAutoReply.isPending || (autoReplyDraft.enabled && !autoReplyDraft.message.trim())}
                onClick={() =>
                  saveAutoReply.mutate(autoReplyDraft, {
                    onSuccess: () => {
                      setAutoReplyOpen(false);
                      toast({ title: "Auto-resposta guardada" });
                    },
                    onError: (err) =>
                      toast({ title: "Falha ao guardar", description: (err as Error).message, variant: "destructive" }),
                  })
                }
              >
                {saveAutoReply.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename contact dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renomear contacto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Nome do contacto" />
            <Button
              className="w-full"
              disabled={!renameValue.trim() || !selected?.contact_id || renameContact.isPending}
              onClick={() =>
                renameContact.mutate(
                  { contactId: selected!.contact_id!, name: renameValue.trim() },
                  {
                    onSuccess: () => {
                      setRenameOpen(false);
                      toast({ title: "Contacto renomeado" });
                    },
                    onError: (err) => toast({ title: "Falha ao renomear", description: (err as Error).message, variant: "destructive" }),
                  },
                )
              }
            >
              {renameContact.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CRM contact panel (mobile sheet — same content as the desktop column) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4 pb-3">
            <SheetTitle>Contacto</SheetTitle>
          </SheetHeader>
          {contactPanel}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MessageBubble({
  m,
  onPreview,
  onReply,
  onDelete,
}: {
  m: InboxMessage;
  onPreview: (url: string) => void;
  onReply: (m: InboxMessage) => void;
  onDelete?: (m: InboxMessage) => void;
}) {
  return (
    <div className={cn("group flex items-end gap-1", m.outgoing ? "justify-end" : "justify-start")}>
      {m.outgoing && (
        <div className="flex items-center">
          {onDelete && (
            <button
              type="button"
              title="Apagar para todos"
              onClick={() => onDelete(m)}
              className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {m.wa_id && <ReplyButton onClick={() => onReply(m)} />}
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] space-y-1 rounded-2xl px-3 py-2 text-sm",
          m.outgoing
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-card border",
        )}
      >
        {m.outgoing && m.sender_name && (
          <p className="text-[10px] font-medium text-primary-foreground/70">{m.sender_name}</p>
        )}
        {m.attachments?.map((a, i) => (
          <AttachmentView key={a.id ?? i} attachment={a} outgoing={m.outgoing} onPreview={onPreview} />
        ))}
        {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
        <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", m.outgoing ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {formatTime(m.created_at)}
          {m.outgoing && <StatusTicks status={m.status} />}
        </p>
      </div>
      {!m.outgoing && m.wa_id && <ReplyButton onClick={() => onReply(m)} />}
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  pinned,
  muted,
  onClick,
}: {
  conversation: InboxConversation;
  active: boolean;
  pinned: boolean;
  muted: boolean;
  onClick: () => void;
}) {
  const waiting = conversation.status !== "resolved" ? waitingLabel(conversation.waiting_since) : null;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50",
        active && "bg-accent",
      )}
    >
      <ContactAvatar name={conversation.contact_name} src={conversation.contact_thumbnail} className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 truncate text-sm font-medium">
            {pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
            {muted && <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" />}
            <span className="truncate">{conversation.contact_name}</span>
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">{formatListDate(conversation.updated_at)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{conversation.last_message || "—"}</p>
          {waiting && (
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              à espera {waiting}
            </span>
          )}
        </div>
        {(conversation.assigned_name || conversation.labels.length > 0) && (
          <div className="mt-0.5 flex items-center gap-1.5 overflow-hidden">
            {conversation.assigned_name && (
              <span className="shrink-0 rounded-full bg-muted px-1.5 text-[9px] text-muted-foreground">
                {conversation.assigned_name}
              </span>
            )}
            {conversation.labels.slice(0, 3).map((l) => (
              <span key={l} className="shrink-0 rounded-full bg-primary/10 px-1.5 text-[9px] text-primary">{l}</span>
            ))}
          </div>
        )}
      </div>
      {conversation.unread_count > 0 && (
        <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-semibold text-white">
          {conversation.unread_count}
        </span>
      )}
    </button>
  );
}

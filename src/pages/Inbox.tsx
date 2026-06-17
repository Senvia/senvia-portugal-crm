import { useState, useRef, useEffect, useMemo, useCallback, memo, lazy, Suspense } from "react";
import { useWhatsappChannel, useMessagingChannels, MessagingChannel } from "@/hooks/useMessagingChannels";
import {
  useInboxConversations,
  useInboxMessages,
  useInboxRealtime,
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
  useDeleteLabel,
  useSetConversationLabels,
  useCannedResponses,
  useCreateCannedResponse,
  useDeleteCannedResponse,
  useDeleteMessage,
  useCrmRecord,
  useTypingPresence,
  useSuggestReply,
  useScheduledMessages,
  useScheduleMessage,
  useCancelScheduledMessage,
  useAutoReplyConfig,
  useSaveAutoReplyConfig,
  countUnreadConversations,
  useInboxMessagePrefetch,
  loadMutedIds,
  saveMutedIds,
  AutoReplyConfig,
  InboxConversation,
  InboxAttachment,
  InboxMessage,
  OutgoingAttachment,
  PresencePeer,
  useInboxPresence,
  useTranscribeAudio,
} from "@/hooks/useChatwootInbox";
import { useCreateCommunication } from "@/hooks/useClientCommunications";
import { useTeamMembers } from "@/hooks/useTeam";
import { ConversationTasks } from "@/components/inbox/ConversationTasks";
import { InboxTasksModal } from "@/components/inbox/InboxTasksModal";
import { InboxCaixaRail } from "@/components/inbox/InboxCaixaRail";
import { EmailListReader } from "@/components/email/EmailListReader";
import { ContactNotes } from "@/components/contacts/ContactNotes";
import { useOpenInboxTasks, isTaskOverdue, phoneSuffix } from "@/hooks/useInboxTasks";
import { useCreateEvent } from "@/hooks/useCalendarEvents";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useClientProposals, useClientSales } from "@/hooks/useClientHistory";
import { useClient } from "@/hooks/useClients";
import { useLeadById, useUpdateLeadStatus, useUpdateLead } from "@/hooks/useLeads";
const CreateClientModal = lazy(() => import("@/components/clients/CreateClientModal").then(m => ({ default: m.CreateClientModal })));
const EditClientModal = lazy(() => import("@/components/clients/EditClientModal").then(m => ({ default: m.EditClientModal })));
const AddLeadModal = lazy(() => import("@/components/leads/AddLeadModal").then(m => ({ default: m.AddLeadModal })));
const LeadDetailsModal = lazy(() => import("@/components/leads/LeadDetailsModal").then(m => ({ default: m.LeadDetailsModal })));
import { ConnectWhatsAppModal } from "@/components/settings/ConnectWhatsAppModal";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  ChevronsUpDown, Eye, Inbox as InboxIcon,
} from "lucide-react";
import { cn, matchesSearch } from "@/lib/utils";
import { INBOX_CONFIG } from "@/lib/constants";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "@/integrations/supabase/client";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

// Group messages arrive from Evolution with the individual sender embedded in the
// body as a bold prefix, e.g. "**+351 910 812 500 - Ana Silva:**\n\nactual text".
// Pull that out so we can show the sender's name + avatar like WhatsApp does,
// and strip it from the visible body. Returns null sender for non-group/no-prefix.
const GROUP_SENDER_RE = /^\*\*\s*(.+?)\s*:\*\*\s*\n*/;
function parseGroupMessage(content: string): { sender: string | null; body: string } {
  const match = content.match(GROUP_SENDER_RE);
  if (!match) return { sender: null, body: content };
  const inner = match[1].trim(); // e.g. "+351 910 812 500 - Ana Silva"
  const body = content.slice(match[0].length);
  const dash = inner.indexOf(" - ");
  if (dash > -1) {
    const phone = inner.slice(0, dash).trim();
    const name = inner.slice(dash + 3).trim();
    return { sender: name || phone, body };
  }
  return { sender: inner, body };
}

// Stable per-sender colour (WhatsApp-style) so each participant in a group keeps
// the same accent across their messages. Hashes the name into a fixed palette.
const GROUP_SENDER_COLORS = [
  "text-rose-600", "text-amber-600", "text-emerald-600", "text-sky-600",
  "text-violet-600", "text-fuchsia-600", "text-teal-600", "text-orange-600",
];
function senderColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return GROUP_SENDER_COLORS[Math.abs(h) % GROUP_SENDER_COLORS.length];
}

// E.164 display: exactly one leading "+". Chatwoot may store the number already
// with a "+", so a naive `+${phone}` would render "++351...". Strip non-digits
// and re-add a single prefix — idempotent whether or not the source has a "+".
function displayPhone(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

// Chatwoot forces label titles to lowercase-hyphenated slugs ("a-fazer").
// Convert back to a readable form for display ("A Fazer").
function formatLabel(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

// SLA severity by how long the customer has been waiting for a reply.
// Chat: ok < 15 min, warn 15–60 min, late ≥ 60 min.
// Email: ok < 4 h, warn 4–24 h, late ≥ 24 h.
type SlaLevel = "ok" | "warn" | "late";
function slaLevel(since: number | null, isEmail = false): SlaLevel | null {
  if (!since) return null;
  const mins = (Date.now() - since * 1000) / 60000;
  const warnMin = isEmail ? 240 : INBOX_CONFIG.SLA_WARN_MIN;
  const lateMin = isEmail ? 1440 : INBOX_CONFIG.SLA_LATE_MIN;
  if (mins >= lateMin) return "late";
  if (mins >= warnMin) return "warn";
  return "ok";
}
const SLA_DOT: Record<SlaLevel, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  late: "bg-red-500",
};
const SLA_BADGE: Record<SlaLevel, string> = {
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  late: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

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

// Chatwoot emits conversation activity/system messages in English ("X added
// <label>", "Conversation resolved by Y"). Translate the common ones to pt-PT so
// the list preview reads in Portuguese even before the backend (which now hides
// activities from the preview) is redeployed. Patterns are tightly shaped — a
// capitalised agent name + a verb — so real customer messages are left untouched.
// Precompiled once (was rebuilding two RegExp objects per call, per row, per render).
const _ACT_NAME = String.raw`\p{Lu}[\p{L}]+(?:[ '\-]\p{L}+)*`;
const _ACT_LABELS = String.raw`[\p{L}\p{N}_-]+(?:,\s*[\p{L}\p{N}_-]+)*`;
const RE_ACT_ADDED = new RegExp(`^(${_ACT_NAME}) added (${_ACT_LABELS})$`, "u");
const RE_ACT_REMOVED = new RegExp(`^(${_ACT_NAME}) removed (${_ACT_LABELS})$`, "u");

function translateActivity(text: string): string {
  if (!text) return text;
  let m: RegExpMatchArray | null;
  if ((m = text.match(RE_ACT_ADDED))) {
    return `${m[1]} adicionou ${m[2].includes(",") ? "as etiquetas" : "a etiqueta"} ${m[2]}`;
  }
  if ((m = text.match(RE_ACT_REMOVED))) {
    return `${m[1]} removeu ${m[2].includes(",") ? "as etiquetas" : "a etiqueta"} ${m[2]}`;
  }
  if ((m = text.match(/^Assigned to (.+?) by (.+)$/))) return `Atribuída a ${m[1]} por ${m[2]}`;
  if ((m = text.match(/^(.+?) self-assigned this conversation$/i))) return `${m[1]} atribuiu a conversa a si`;
  if ((m = text.match(/^Conversation was marked resolved by (.+)$/i))) return `Conversa resolvida por ${m[1]}`;
  if ((m = text.match(/^Conversation was (?:marked )?reopened by (.+)$/i))) return `Conversa reaberta por ${m[1]}`;
  if (/^Conversation was marked resolved$/i.test(text)) return "Conversa resolvida";
  if (/^Conversation was reopened$/i.test(text)) return "Conversa reaberta";
  if (/^Conversation was marked pending$/i.test(text)) return "Conversa marcada como pendente";
  return text;
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

// Audio attachment with inline Groq Whisper transcription (on-demand, cached in localStorage).
function AudioAttachment({ url, extension, outgoing, messageId }: {
  url: string; extension: string | null; outgoing: boolean; messageId: number;
}) {
  const { text, loading, error, transcribe } = useTranscribeAudio(messageId, url);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <audio controls src={url} className="max-w-full" preload="none" />
        <DownloadButton url={url} extension={extension} />
      </div>
      {text ? (
        <p className={cn(
          "rounded-lg px-2.5 py-1.5 text-xs leading-relaxed",
          outgoing ? "bg-primary-foreground/10 text-primary-foreground/90" : "bg-muted text-foreground",
        )}>
          {text}
        </p>
      ) : (
        <button
          type="button"
          onClick={transcribe}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
            outgoing
              ? "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
            loading && "cursor-not-allowed opacity-60",
          )}
        >
          {loading
            ? <><Loader2 className="h-3 w-3 animate-spin" /> A transcrever...</>
            : error
              ? <><Mic className="h-3 w-3" /> Tentar novamente</>
              : <><Mic className="h-3 w-3" /> Transcrever</>
          }
        </button>
      )}
    </div>
  );
}

// Renders a message attachment by type: image, audio, video, or generic file link.
function AttachmentView({
  attachment,
  outgoing,
  messageId,
  onPreview,
}: {
  attachment: InboxAttachment;
  outgoing: boolean;
  messageId: number;
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
    return <AudioAttachment url={url} extension={attachment.extension} outgoing={outgoing} messageId={messageId} />;
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
        loading="lazy"
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

// DEV / opt-in diagnostic switch for the inbox memory probe. Set
// localStorage["inbox-debug"]="1" to enable it in a production preview build.
const MEM_DEBUG = import.meta.env.DEV
  || (typeof window !== "undefined" && (() => { try { return window.localStorage.getItem("inbox-debug") === "1"; } catch { return false; } })());

export default function Inbox() {
  const { channel } = useWhatsappChannel();
  const connected = channel?.status === "connected";
  const { data: channels = [] } = useMessagingChannels();
  // Caixas that map to a known Chatwoot inbox (so we can filter conversations by them).
  const channelByInbox = useMemo(() => {
    const m = new Map<number, MessagingChannel>();
    for (const c of channels) if (c.chatwoot_inbox_id != null) m.set(c.chatwoot_inbox_id, c);
    return m;
  }, [channels]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const prefetchMessages = useInboxMessagePrefetch();
  const { isAdmin } = usePermissions();
  // Caixas the current user may see (mirrors the server visibility rule): admin,
  // caixa with no assignees, or a caixa the user is assigned to.
  const visibleCaixas = useMemo(
    () => [...channelByInbox.values()].filter(
      (c) => isAdmin || !c.assigned_user_ids?.length || (!!user?.id && c.assigned_user_ids.includes(user.id)),
    ),
    [channelByInbox, isAdmin, user?.id],
  );
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ListTab>("all");
  // Inbox filter by caixa (chatwoot_inbox_id). null = all caixas.
  const [caixaFilter, setCaixaFilter] = useState<number | null>(null);
  // Email mode: when an email caixa is picked in the rail, the chat columns are
  // replaced by the email list+reader for the selected folder.
  const [emailChannelId, setEmailChannelId] = useState<string | null>(null);
  const [emailFolderId, setEmailFolderId] = useState<string | null>(null);
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
  // Whether WE are actively typing — broadcast to teammates for collision warnings.
  const [selfTyping, setSelfTyping] = useState(false);
  const typingResetRef = useRef<number | null>(null);
  // Composer "+" menu: 'menu' (actions) or 'emoji' (picker grid).
  const [plusOpen, setPlusOpen] = useState(false);
  const [plusView, setPlusView] = useState<"menu" | "emoji">("menu");
  // Outgoing message signature (*Nome:*) — useful when several agents share the number.
  const [signing, setSigning] = useState<boolean>(() => localStorage.getItem("inbox-signature-v1") === "1");
  // Out-of-hours auto-reply settings dialog.
  const [autoReplyOpen, setAutoReplyOpen] = useState(false);
  const [autoReplyDraft, setAutoReplyDraft] = useState<AutoReplyConfig | null>(null);
  // Quick replies management.
  const [newQuickReply, setNewQuickReply] = useState("");
  // Label creation.
  const [newLabel, setNewLabel] = useState("");
  // New conversation picker + draft.
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvCaixa, setNewConvCaixa] = useState<number | null>(null); // chatwoot_inbox_id to send from
  // Draft conversation: a not-yet-created chat shown in the right pane so the user
  // types the first message in the normal composer (no separate "send" modal).
  // The real Chatwoot conversation is created on first send (start_conversation).
  const [draftConv, setDraftConv] = useState<{ phone: string; name: string; inboxId: number | null } | null>(null);
  // After starting a draft, watch the list for the real conversation by phone and
  // auto-open it.
  const [pendingSelectPhone, setPendingSelectPhone] = useState<string | null>(null);
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
  // Generic destructive-action confirmation (replaces window.confirm).
  const [confirm, setConfirm] = useState<{ title: string; description: string; action: () => void } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const prevSelectedRef = useRef<number | null>(null);
  // True while a freshly-opened conversation still owes its initial scroll to the
  // bottom (messages and/or images load asynchronously after the switch).
  const needsInitialScrollRef = useRef(false);
  // Latest list/selection/action for the singly-bound keyboard handler.
  const kbdRef = useRef<{
    filtered: InboxConversation[];
    selectedId: number | null;
    archive: () => void;
  }>({ filtered: [], selectedId: null, archive: () => {} });
  const prevUnreadRef = useRef<number>(0);
  const lastTypingRef = useRef<number>(0);
  const lastAutoReadRef = useRef<number>(0);

  // The full connect screen only shows when the channel was NEVER configured.
  // A configured-but-dropped channel keeps the inbox usable (Chatwoot still
  // serves history) with a reconnect banner instead.
  // Inbox is usable as soon as the org has ANY connected caixa (not only WhatsApp).
  const channelConfigured = channels.some((c) => c.status === "connected") || !!channel;
  // Realtime: refetch the instant a message lands (incoming or our mirrored
  // sends). While connected, the polls below stretch into mere safety nets.
  const live = useInboxRealtime();
  const { data: conversations = [], isLoading: loadingConvos } = useInboxConversations(channelConfigured, live);
  // Synthetic conversation for the draft (id < 0 so it never collides with a real
  // Chatwoot id). selectedId stays null for drafts, so message fetch / mark-read /
  // presence all stay disabled — the thread is simply empty until the first send.
  const draftSelected: InboxConversation | null = draftConv
    ? {
        id: -1, alt_ids: [], contact_id: null,
        contact_name: draftConv.name || `+${draftConv.phone}`,
        contact_phone: draftConv.phone, contact_email: null, contact_identifier: null,
        contact_thumbnail: null, last_message: null, email_subject: null,
        unread_count: 0, status: "open", channel: "whatsapp",
        inbox_id: draftConv.inboxId, updated_at: null, waiting_since: null,
        labels: [], assigned_id: null, assigned_name: null,
        crm_kind: null, crm_id: null, crm_name: null,
      }
    : null;
  const selected = (selectedId ? conversations.find((c) => c.id === selectedId) : null) || draftSelected;
  const altIds = selected?.alt_ids ?? [];
  const isEmailSelected = !!(selected?.channel?.toLowerCase().includes('email'));
  // WhatsApp group: the JID ends in @g.us (robust), with a (GROUP) name fallback.
  const isGroupSelected =
    !!selected?.contact_identifier?.includes('@g.us') || /\(GROUP\)/i.test(selected?.contact_name ?? '');
  const { data: messages = [], isLoading: loadingMessages } = useInboxMessages(selectedId, altIds, live);
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
  const deleteLabel = useDeleteLabel();
  const setLabels = useSetConversationLabels();
  const [managingLabels, setManagingLabels] = useState(false);
  const { data: canned = [] } = useCannedResponses();
  const createCanned = useCreateCannedResponse();
  const deleteCanned = useDeleteCannedResponse();
  const deleteMessage = useDeleteMessage();
  const { data: teamMembers = [] } = useTeamMembers();
  const createEvent = useCreateEvent();

  const { data: phoneMatch } = useContactMatch(selected?.contact_phone, selected?.contact_email);
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
  // Open proposals/sales for client panel.
  const clientId = contactMatch?.kind === "client" ? contactMatch.id : null;
  const { data: openProposals = [] } = useClientProposals(clientId);
  const { data: openSales = [] } = useClientSales(clientId);
  const activeProposals = openProposals.filter((p: any) => ["draft","sent","negotiating"].includes(p.status));
  const activeSales = openSales.filter((s: any) => ["in_progress","fulfilled"].includes(s.status));
  // Associate-to-existing combobox.
  // Edit client / lead modal — opens inline without leaving inbox.
  const [editCrmOpen, setEditCrmOpen] = useState(false);
  const editClientId = editCrmOpen && contactMatch?.kind === "client" ? contactMatch.id : null;
  const editLeadId   = editCrmOpen && contactMatch?.kind === "lead"   ? contactMatch.id : null;
  const { data: editClientData } = useClient(editClientId);
  const { data: editLeadData }   = useLeadById(editLeadId);
  const updateLeadStatus = useUpdateLeadStatus();
  const updateLeadInline = useUpdateLead();

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  // "Adicionar ao CRM" dialog.
  const [addToCrmOpen, setAddToCrmOpen] = useState(false);
  const [addToCrmTab, setAddToCrmTab] = useState<"lead" | "client" | "existing">("lead");
  // Modais nativos de criação.
  const [createClientModalOpen, setCreateClientModalOpen] = useState(false);
  const [createLeadModalOpen, setCreateLeadModalOpen] = useState(false);
  const searchActive = linkOpen || (addToCrmOpen && addToCrmTab === "existing");
  const { data: linkResults = [] } = useSearchCrmRecords(searchActive ? linkQuery : "");
  const sendTyping = useTypingPresence();
  const suggestReply = useSuggestReply();
  const { data: scheduledMsgs = [] } = useScheduledMessages(selected?.contact_phone);
  const scheduleMessage = useScheduleMessage();
  const cancelScheduled = useCancelScheduledMessage();
  const { data: autoReplyConfig } = useAutoReplyConfig();
  const saveAutoReply = useSaveAutoReplyConfig();
  const createCommunication = useCreateCommunication();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- Tarefas ----
  const { data: openTasks = [] } = useOpenInboxTasks(channelConfigured);
  // "Transformar mensagem em tarefa" pre-fills the panel quick-add.
  const [taskPrefill, setTaskPrefill] = useState<string | null>(null);
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  // Badge per conversation: phone suffix -> open / overdue.
  const taskStateByPhone = useMemo(() => {
    const map = new Map<string, "open" | "overdue">();
    for (const t of openTasks) {
      const key = phoneSuffix(t.contact_phone);
      if (!key) continue;
      if (isTaskOverdue(t)) map.set(key, "overdue");
      else if (!map.has(key)) map.set(key, "open");
    }
    return map;
  }, [openTasks]);
  // Minhas tarefas (atribuídas a mim, ou sem responsável criadas por mim).
  const myTasks = useMemo(
    () => openTasks.filter((t) => t.assigned_to === user?.id || (!t.assigned_to && t.created_by === user?.id)),
    [openTasks, user?.id],
  );
  const myOverdueCount = useMemo(() => myTasks.filter(isTaskOverdue).length, [myTasks]);
  const openTaskConversation = (phone: string | null) => {
    const suffix = phoneSuffix(phone);
    if (!suffix) return;
    const found = conversations.find((c) => phoneSuffix(c.contact_phone) === suffix);
    if (found) setSelectedId(found.id);
    else toast({ title: "Conversa não encontrada", description: "O contacto já não está na caixa de entrada." });
  };

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
      // No conversation yet: open a draft straight in the pane (default caixa).
      setSelectedId(null);
      setDraftConv({ phone: phoneParam, name: `+${phoneParam}`, inboxId: null });
    }
    searchParams.delete("phone");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadingConvos, conversations.length]);

  // Selecting a real conversation always dismisses any open draft.
  useEffect(() => {
    if (selectedId != null && draftConv) setDraftConv(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // After a draft's first message is sent, the real conversation lands via
  // realtime/poll — find it by phone and open it (clearing the draft).
  useEffect(() => {
    if (!pendingSelectPhone) return;
    const suffix = pendingSelectPhone.replace(/\D/g, "").slice(-9);
    const found = conversations.find(
      (c) => (c.contact_phone || "").replace(/\D/g, "").slice(-9) === suffix,
    );
    if (found) {
      setSelectedId(found.id);
      setPendingSelectPhone(null);
    }
  }, [pendingSelectPhone, conversations]);

  // Chatwoot inbox ids that belong to EMAIL caixas — these are now handled by the
  // dedicated email client (rail + reader), so they must never show in the chat
  // conversation list ("Todas as conversas" is messaging-only).
  const emailInboxIds = useMemo(
    () => new Set(
      channels
        .filter((c) => c.channel_type === "email" && c.chatwoot_inbox_id != null)
        .map((c) => c.chatwoot_inbox_id as number),
    ),
    [channels],
  );

  // Hide the Evolution control bot's QR-code conversations + email conversations.
  const visible = useMemo(
    () => conversations.filter(
      (c) => c.contact_name !== "EvolutionAPI" && !(c.inbox_id != null && emailInboxIds.has(c.inbox_id)),
    ),
    [conversations, emailInboxIds],
  );

  const filtered = useMemo(() => {
    let list = visible;
    if (caixaFilter != null) list = list.filter((c) => c.inbox_id === caixaFilter);
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
  }, [visible, search, tab, searchResults, pinned, user?.id, caixaFilter]);

  // Number of CONVERSATIONS with unread messages (not message total) — matches
  // the sidebar badge and avoids inflated counts from old imported history.
  // Tab counts reflect the active caixa filter (else the numbers mislead when a
  // single caixa is selected).
  const scoped = useMemo(
    () => (caixaFilter != null ? visible.filter((c) => c.inbox_id === caixaFilter) : visible),
    [visible, caixaFilter],
  );
  const unreadTotal = useMemo(() => countUnreadConversations(scoped), [scoped]);
  // Unread conversation count per messaging caixa (inbox_id) for the rail badges.
  const unreadByInbox = useMemo(() => {
    const muted = new Set(loadMutedIds());
    const map = new Map<number, number>();
    for (const c of visible) {
      if (c.status === "resolved" || muted.has(c.id) || (c.unread_count || 0) <= 0 || c.inbox_id == null) continue;
      map.set(c.inbox_id, (map.get(c.inbox_id) || 0) + 1);
    }
    return map;
  }, [visible]);
  const waitingTotal = useMemo(
    () => scoped.filter((c) => c.status !== "resolved" && !!c.waiting_since).length,
    [scoped],
  );

  // Notification sound when new unread messages arrive while the page is open.
  // Skip the FIRST run so opening the inbox with pre-existing unreads doesn't beep.
  const beepInitRef = useRef(false);
  useEffect(() => {
    if (!beepInitRef.current) {
      beepInitRef.current = true;
      prevUnreadRef.current = unreadTotal;
      return;
    }
    if (unreadTotal > prevUnreadRef.current) playNotificationBeep();
    prevUnreadRef.current = unreadTotal;
  }, [unreadTotal]);

  // Thread = older pages (loaded on demand) + live page, deduped by id.
  const thread = useMemo(() => {
    const older = selectedId ? olderByConv[selectedId] ?? [] : [];
    const seen = new Set<number>();
    const all: InboxMessage[] = [];
    for (const m of [...older, ...messages]) {
      // Private Chatwoot messages (legacy notes + send-failure system notices)
      // are not shown in the thread — notes now live in the DB-backed panel.
      if (m.is_private) continue;
      if (!seen.has(m.id) && !deletedIds.has(m.id)) { seen.add(m.id); all.push(m); }
    }
    return all.sort((a, b) => toMs(a.created_at) - toMs(b.created_at));
  }, [olderByConv, selectedId, messages, deletedIds]);

  // Thread rows with date separators + WhatsApp-style grouping. Memoized (and
  // kept ABOVE the early returns so the hook order is stable) — rebuilding this
  // in the render body cost on every keystroke.
  type ThreadRow =
    | { type: "sep"; key: string; label: string }
    | { type: "msg"; key: string; msg: InboxMessage; firstOfGroup: boolean; lastOfGroup: boolean; groupSender?: string | null; displayContent?: string };
  const threadRows = useMemo<ThreadRow[]>(() => {
    const rows: ThreadRow[] = [];
    const GROUP_WINDOW = INBOX_CONFIG.GROUP_WINDOW_MS;
    const msgs = thread.filter((m) => !m.is_activity);
    // In a WhatsApp group, the individual sender is embedded in each incoming
    // body. Parse it once so grouping + rendering both share the same identity.
    const parsedSender = new Map<number, string | null>();
    const parsedBody = new Map<number, string>();
    if (isGroupSelected) {
      for (const m of msgs) {
        if (m.outgoing) continue;
        const { sender, body } = parseGroupMessage(m.content || "");
        if (sender) { parsedSender.set(m.id, sender); parsedBody.set(m.id, body); }
      }
    }
    const senderOf = (m: InboxMessage) =>
      m.outgoing ? (m.sender_name || "") : (parsedSender.get(m.id) || "");
    const sameSender = (a: InboxMessage, b: InboxMessage) =>
      a.outgoing === b.outgoing &&
      senderOf(a) === senderOf(b) &&
      !!a.is_private === !!b.is_private;
    let lastDay = "";
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const ms = toMs(m.created_at);
      const k = dayKey(ms);
      const dayChanged = k !== lastDay;
      if (dayChanged) {
        lastDay = k;
        rows.push({ type: "sep", key: `sep-${k}`, label: dayLabel(ms) });
      }
      const prev = msgs[i - 1];
      const next = msgs[i + 1];
      const firstOfGroup =
        dayChanged || !prev || !sameSender(prev, m) || ms - toMs(prev.created_at) > GROUP_WINDOW;
      const lastOfGroup =
        !next ||
        dayKey(toMs(next.created_at)) !== k ||
        !sameSender(next, m) ||
        toMs(next.created_at) - ms > GROUP_WINDOW;
      rows.push({
        type: "msg",
        key: `m-${m.id}`,
        msg: m,
        firstOfGroup,
        lastOfGroup,
        groupSender: parsedSender.get(m.id) ?? null,
        displayContent: parsedBody.get(m.id),
      });
    }
    return rows;
  }, [thread, isGroupSelected]);

  // DEV-only diagnostic for the inbox OOM/freeze: samples the JS heap + render
  // rate once a second so the next crash leaves a trail (console + sessionStorage
  // key "inbox-mem-last"). A linearly climbing heap = leak; a sudden spike = one
  // big allocation (e.g. an email body); renders/s in the hundreds = a render loop.
  const renderCountRef = useRef(0);
  const memSnapRef = useRef({ thread: 0, convs: 0, sel: null as number | null, live: false });
  useEffect(() => {
    renderCountRef.current++;
    memSnapRef.current = { thread: thread.length, convs: conversations.length, sel: selectedId, live };
    // Catch a render LOOP even if the 500ms sampler never gets a turn: every 100
    // commits, stamp the count so the trail survives the freeze.
    if (MEM_DEBUG && renderCountRef.current % 100 === 0) {
      try { sessionStorage.setItem("inbox-render-burst", `${renderCountRef.current} renders @ ${new Date().toISOString().slice(11, 23)}`); } catch { /* quota */ }
    }
  });
  useEffect(() => {
    if (!MEM_DEBUG) return;
    let last = 0;
    const sample = () => {
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      const used = mem ? Math.round(mem.usedJSHeapSize / 1048576) : -1;
      const limit = mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : -1;
      const renders = renderCountRef.current;
      const delta = renders - last;
      last = renders;
      const s = memSnapRef.current;
      const clock = new Date().toISOString().slice(11, 23);
      const line = `${clock} heap=${used}/${limit}MB renders=${renders}(+${delta}) thread=${s.thread} convs=${s.convs} sel=${s.sel ?? "none"} live=${s.live}`;
      const hot = delta > 15 || (limit > 0 && used / limit > 0.8);
      if (hot) console.warn("[inbox-mem]", line);
      else console.log("[inbox-mem]", line);
      // Ring buffer (last 30 samples = ~15s) survives the crash in sessionStorage,
      // so after the tab dies + reloads we can read the trajectory leading up to it.
      try {
        const prev = sessionStorage.getItem("inbox-mem-trace") ?? "";
        sessionStorage.setItem("inbox-mem-trace", (prev + "\n" + line).split("\n").slice(-30).join("\n"));
      } catch { /* quota */ }
    };
    sample();
    const id = window.setInterval(sample, 500);
    return () => window.clearInterval(id);
  }, []);

  // Drop optimistic bubbles once the real (mirrored) message arrives in the feed.
  // Attachment/voice bubbles never text-match the mirror, so confirmed ("sent")
  // bubbles also expire after 8s — by then the mirror is in the thread.
  useEffect(() => {
    if (pending.length === 0) return;
    const prune = () =>
      setPending((prev) =>
        prev.filter((p) => {
          // Hard cap: never keep an optimistic bubble forever (covers attachment
          // bubbles and pendings of conversations that aren't currently open).
          if (Date.now() - p.at > 30000) return false;
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

  // Auto-grow the composer with its content: reset to 1 line, then expand to fit
  // (capped at ~10 lines by the CSS max-height, after which it scrolls). Runs on
  // every draft change, including the reset to empty after a send.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, selectedId]);

  // Auto-scroll to the latest message — but DON'T yank the view to the bottom
  // while the agent is reading older history. Always jump on opening a different
  // conversation; otherwise only follow when already near the bottom.
  const jumpToBottom = useCallback(() => {
    // Pin via the container (instant, no smooth) so async image/layout reflow
    // doesn't leave the view stranded mid-thread.
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    bottomRef.current?.scrollIntoView();
  }, []);
  useEffect(() => {
    const switched = prevSelectedRef.current !== selectedId;
    prevSelectedRef.current = selectedId;
    if (switched) {
      // Owe an initial bottom scroll until the thread (and its images) settle.
      needsInitialScrollRef.current = true;
      composerRef.current?.focus();
    }
    // While we still owe the opening scroll, keep pinning to the bottom as the
    // messages arrive and images load (each changes scrollHeight). Re-correct a
    // few times, then release control back to the agent.
    if (needsInitialScrollRef.current) {
      if (messages.length === 0) return; // nothing to scroll to yet
      jumpToBottom();
      requestAnimationFrame(jumpToBottom);
      const t1 = window.setTimeout(jumpToBottom, 120);
      const t2 = window.setTimeout(jumpToBottom, 400);
      const t3 = window.setTimeout(() => { jumpToBottom(); needsInitialScrollRef.current = false; }, 800);
      return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); };
    }
    // Only follow to the bottom when the agent is already near it — don't yank
    // the view (a synchronous full-thread reflow) while they read older history.
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, visiblePending.length, selectedId, jumpToBottom]);

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
    setSelfTyping(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, markRead]);

  // Cleanup on unmount: stop any live mic stream and clear pending timers so
  // leaving the page mid-recording doesn't leave the microphone on / intervals
  // firing.
  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      } catch {
        // recorder already stopped — ignore
      }
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      if (typingResetRef.current) window.clearTimeout(typingResetRef.current);
    };
  }, []);

  // Revoke the previous voice-preview object URL whenever it changes or on
  // unmount (switching conversation nulls pendingVoice without revoking).
  useEffect(() => {
    if (!pendingVoice) return;
    const url = pendingVoice.url;
    return () => URL.revokeObjectURL(url);
  }, [pendingVoice]);

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

  // Live presence of other agents: collision detection (who else is in this chat).
  const presence = useInboxPresence(selectedId, selfTyping, myName);
  const peersHere = selectedId ? presence.get(selectedId) ?? [] : [];

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
          inboxId: selected?.inbox_id,
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
            // Restore the text ONLY if the composer is still empty — never clobber
            // something the user has started typing since.
            if (rawText) setDraft((d) => d.trim() ? d : rawText);
            toast({ title: "Falha ao enviar", description: (err as Error).message, variant: "destructive" });
          },
        },
      );
      setReplyTo(null);
      setSelfTyping(false);
      if (typingResetRef.current) window.clearTimeout(typingResetRef.current);
    },
    [selectedId, selected?.contact_phone, selected?.inbox_id, replyTo, sendMessage, toast, signing, myName],
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();

    // Draft conversation: create it by sending the first message (start_conversation),
    // then auto-open the real conversation once it lands. Supports text and/or
    // attachments — the first file carries the caption, the rest go bare.
    if (draftConv) {
      if (!content && outAttachments.length === 0) return;
      const { phone, inboxId } = draftConv;
      setDraft("");
      try {
        if (outAttachments.length > 0) {
          const list = outAttachments;
          setOutAttachments([]);
          for (let i = 0; i < list.length; i++) {
            const data = await fileToBase64(list[i].file);
            await startConversation.mutateAsync({
              phone,
              content: i === 0 ? content : "",
              inboxId,
              attachment: {
                data,
                mimetype: list[i].file.type || "application/octet-stream",
                filename: list[i].file.name,
                kind: list[i].kind,
              },
            });
          }
        } else {
          await startConversation.mutateAsync({ phone, content, inboxId });
        }
        setPendingSelectPhone(phone);
        toast({ title: "Mensagem enviada", description: "A abrir a conversa..." });
      } catch (err) {
        if (content) setDraft((d) => (d.trim() ? d : content));
        toast({ title: "Falha ao enviar", description: (err as Error).message, variant: "destructive" });
      }
      return;
    }

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
        if (file.size > INBOX_CONFIG.ATTACHMENT_MAX_BYTES) {
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
  const handleToggleMute = async () => {
    if (!selected) return;
    const wasMuted = muted.includes(selected.id);
    const next = wasMuted
      ? muted.filter((m) => m !== selected.id)
      : [...muted, selected.id];
    setMuted(next);
    saveMutedIds(next);
    // Sync to server so the push edge function can filter per-user
    if (user?.id && organization?.id) {
      await supabase
        .from('push_subscriptions')
        .update({ muted_conversation_ids: next })
        .eq('user_id', user.id)
        .eq('organization_id', organization.id);
    }
    toast({ title: wasMuted ? "Notificações reativadas" : "Conversa silenciada" });
  };

  const handleExport = () => {
    if (!selected) return;
    const lines = thread
      .filter((m) => !m.is_activity)
      .map((m) => {
        const when = new Date(toMs(m.created_at)).toLocaleString("pt-PT");
        // In groups, pull the individual sender (and clean body) from the prefix.
        const parsed = !m.outgoing && isGroupSelected ? parseGroupMessage(m.content || "") : null;
        const who = m.outgoing ? (m.sender_name || "Eu") : (parsed?.sender || selected.contact_name);
        const text = parsed?.sender ? parsed.body : m.content;
        const what = text || (m.attachments.length > 0 ? `[${m.attachments[0].file_type}]` : "");
        return `[${when}] ${who}: ${what}`;
      });
    const contactRef = displayPhone(selected.contact_phone) || selected.contact_email || "";
    const blob = new Blob(
      [`Conversa com ${selected.contact_name}${contactRef ? ` (${contactRef})` : ""}\n\n${lines.join("\n")}`],
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

  // Stable callbacks so memoized MessageBubble rows don't re-render on every
  // composer keystroke (when only `draft` changed).
  const handleReplyTo = useCallback(
    (m: InboxMessage) => setReplyTo({ waId: m.wa_id!, content: m.content, outgoing: m.outgoing }),
    [],
  );
  const handleTaskFromMessage = useCallback(
    (m: InboxMessage) => {
      setTaskPrefill(m.content || "Follow-up");
      toast({ title: "Tarefa pré-preenchida", description: "Completa-a no painel de tarefas à direita." });
    },
    [toast],
  );
  const selectedPhone = selected?.contact_phone ?? null;
  const handleDeleteMessage = useCallback(
    (m: InboxMessage) => {
      if (!selectedPhone) return;
      setConfirm({
        title: "Apagar mensagem?",
        description: "A mensagem será apagada para todos no WhatsApp.",
        action: () => deleteMessage.mutate(
          { waId: m.wa_id!, phone: selectedPhone },
          {
            onSuccess: () => {
              setDeletedIds((prev) => new Set([...prev, m.id]));
              toast({ title: "Mensagem apagada no WhatsApp" });
            },
            onError: (err) =>
              toast({ title: "Falha ao apagar", description: (err as Error).message, variant: "destructive" }),
          },
        ),
      });
    },
    [selectedPhone, deleteMessage, toast],
  );

  // Keep the keyboard handler's data fresh without rebinding the listener.
  kbdRef.current = { filtered, selectedId, archive: handleToggleArchive };

  // Virtual list for the conversation panel — only renders ~15 visible rows
  // instead of the full 200-cap, dramatically reducing DOM nodes and memory.
  const ROW_HEIGHT = 73; // px: border-b + py-3 (24px) + two text lines (~49px)
  const listVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listScrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });
  // ---- Keyboard shortcuts (desktop power-use): j/k navigate, e archive,
  // / search, c new conversation, n toggle note. Ignored while typing. ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Don't let single-key shortcuts (e archive, c new conversation, ...) fire
      // while a modal/sheet is open — they'd act on the list behind the dialog.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) {
        if (e.key === "Escape") t?.blur();
        return;
      }
      const { filtered: list, selectedId: sel, archive } = kbdRef.current;
      const move = (delta: number) => {
        if (list.length === 0) return;
        const idx = list.findIndex((c) => c.id === sel);
        const next =
          idx === -1
            ? delta > 0 ? 0 : list.length - 1
            : Math.min(list.length - 1, Math.max(0, idx + delta));
        setSelectedId(list[next].id);
      };
      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          move(1);
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          move(-1);
          break;
        case "e":
          if (sel) {
            e.preventDefault();
            archive();
          }
          break;
        case "/":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case "c":
          e.preventDefault();
          setNewConvOpen(true);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- CRM: define a contact as Lead/Client, or link to an existing record ----
  const handleDefineAs = (kind: "lead" | "client") => {
    if (!selected?.contact_phone) return;
    const payload = { name: selected.contact_name, phone: displayPhone(selected.contact_phone) };
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
  // Caixas the user can send a new conversation from (visible + connected).
  // Only WhatsApp: a new conversation is started by phone number, so email
  // inboxes (Geral Senvia, Geral Pro Peças, ...) must not appear here.
  const sendableCaixas = useMemo(
    () => visibleCaixas.filter((c) => c.status === "connected" && c.channel_type === "whatsapp"),
    [visibleCaixas],
  );
  const effectiveNewConvCaixa =
    newConvCaixa
    ?? (caixaFilter != null && sendableCaixas.some((c) => c.chatwoot_inbox_id === caixaFilter)
      ? caixaFilter
      : sendableCaixas[0]?.chatwoot_inbox_id)
    ?? null;

  // Open the conversation for a phone: select the existing one, or start a draft.
  const openConversationForContact = (phone: string, name: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) return;
    const suffix = digits.slice(-9);
    const existing = conversations.find(
      (c) => (c.contact_phone || "").replace(/\D/g, "").slice(-9) === suffix,
    );
    setNewConvOpen(false);
    if (existing) {
      setSelectedId(existing.id);
    } else {
      setSelectedId(null);
      setDraftConv({ phone: digits, name, inboxId: effectiveNewConvCaixa });
    }
  };

  // ---- Empty state: no caixa connected yet ----
  if (!channelConfigured) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-2xl bg-primary/10 p-5">
          <InboxIcon className="h-12 w-12 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Liga a tua primeira caixa de entrada</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Conecta um canal (WhatsApp, Email e mais) para receberes e responderes às mensagens dos clientes aqui, dentro do Senvia.
          </p>
        </div>
        <Button onClick={() => navigate('/settings?tab=inboxes&addInbox=1')}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar caixa de entrada
        </Button>
      </div>
    );
  }

  const isArchived = selected?.status === "resolved";
  const isPinned = selected ? pinned.includes(selected.id) : false;

  // Contact profile panel (QuickReply-style): right column on desktop, Sheet on
  // mobile — same content in both. Order: profile → assign → tags → details →
  // notes → conversation actions.
  const contactPanel = selected && (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Profile — gradient header */}
      <div className="relative bg-gradient-to-br from-green-500/15 via-primary/5 to-transparent px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <ContactAvatar name={selected.contact_name} src={selected.contact_thumbnail} className="h-16 w-16 shrink-0 ring-2 ring-white/80 shadow-md" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate font-semibold">{selected.contact_name}</p>
            {selected.contact_phone && (
              <p className="truncate text-xs text-muted-foreground">{displayPhone(selected.contact_phone)}</p>
            )}
            {crmRecord?.email && (
              <p className="truncate text-xs text-muted-foreground">{crmRecord.email}</p>
            )}
            {visibleCaixas.length > 1 && selected.inbox_id != null && channelByInbox.get(selected.inbox_id) && (
              <p className="truncate text-[11px] text-muted-foreground">
                via {channelByInbox.get(selected.inbox_id)!.label || "WhatsApp"}
              </p>
            )}
            <div className="pt-1">
              {contactMatch ? (
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  contactMatch.kind === "client"
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-primary/10 text-primary",
                )}>
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
      </div>{/* end gradient header */}
      {/* Action icon bar — compact row right below the profile */}
      <div className="flex items-center justify-around border-t border-border/50 bg-muted/20 px-2 py-1.5">
        <button type="button" title="Renomear contacto" onClick={() => { setRenameValue(selected.contact_name); setRenameOpen(true); }}
          className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Pencil className="h-4 w-4 text-blue-500" /><span>Renomear</span>
        </button>
        <button type="button" title={isPinned ? "Desafixar" : "Fixar no topo"} onClick={() => togglePin(selected.id)}
          className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          {isPinned ? <PinOff className="h-4 w-4 text-amber-500" /> : <Pin className="h-4 w-4 text-amber-500" />}
          <span>{isPinned ? "Desafixar" : "Fixar"}</span>
        </button>
        <button type="button" title={muted.includes(selected.id) ? "Reativar notificações" : "Silenciar"} onClick={handleToggleMute}
          className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          {muted.includes(selected.id) ? <Bell className="h-4 w-4 text-slate-400" /> : <BellOff className="h-4 w-4 text-slate-400" />}
          <span>{muted.includes(selected.id) ? "Reativar" : "Silenciar"}</span>
        </button>
        <Popover open={reminderOpen} onOpenChange={setReminderOpen}>
          <PopoverTrigger asChild>
            <button type="button" title="Lembrar-me de responder"
              className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <AlarmClock className="h-4 w-4 text-orange-500" /><span>Lembrar</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-52 p-1">
            <p className="px-2 py-1 text-[11px] text-muted-foreground">Cria um lembrete e envia notificação.</p>
            {[{ label: "Daqui a 1 hora", run: () => snooze(1) }, { label: "Daqui a 3 horas", run: () => snooze(3) }, { label: "Amanhã de manhã (9h)", run: () => snooze("tomorrow") }].map((opt) => (
              <button key={opt.label} type="button" onClick={() => { opt.run(); setReminderOpen(false); }}
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent">{opt.label}</button>
            ))}
            <div className="my-1 border-t" />
            <button type="button" onClick={() => {
              const d = new Date(Date.now() + 60 * 60000); const pad = (n: number) => String(n).padStart(2, "0");
              setCustomReminderAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
              setReminderOpen(false); setCustomReminderOpen(true);
            }} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent">Escolher data e hora...</button>
          </PopoverContent>
        </Popover>
        <button type="button" title={isArchived ? "Restaurar conversa" : "Arquivar conversa"} onClick={handleToggleArchive}
          className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          {isArchived ? <ArchiveRestore className="h-4 w-4 text-emerald-500" /> : <Archive className="h-4 w-4 text-destructive" />}
          <span>{isArchived ? "Restaurar" : "Arquivar"}</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">

      {/* Assign to team member — searchable combobox (scales to large teams) */}
      <div className="rounded-xl border bg-card p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <UserCog className="h-3.5 w-3.5 text-primary" /> Atribuir a
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
      <div className="rounded-xl border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Tag className="h-3.5 w-3.5 text-violet-500" /> Etiquetas
          </p>
          {labels.length > 0 && (
            <button
              type="button"
              onClick={() => setManagingLabels((v) => !v)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                managingLabels ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {managingLabels ? "Concluir" : "Gerir"}
            </button>
          )}
        </div>
        {managingLabels && (
          <p className="mb-2 text-[10px] text-muted-foreground">
            Apagar remove a etiqueta de toda a equipa e de todas as conversas.
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {labels.map((l) => {
            const active = selected.labels.includes(l.title);
            if (managingLabels) {
              return (
                <span
                  key={l.id}
                  className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {formatLabel(l.title)}
                  <button
                    type="button"
                    title={`Apagar etiqueta "${formatLabel(l.title)}"`}
                    disabled={deleteLabel.isPending}
                    onClick={() => setConfirm({
                      title: `Apagar etiqueta "${formatLabel(l.title)}"?`,
                      description: "Será removida de toda a equipa e de todas as conversas.",
                      action: () => deleteLabel.mutate(l.id, {
                        onSuccess: () => toast({ title: "Etiqueta apagada" }),
                        onError: (err) =>
                          toast({ title: "Falha ao apagar", description: (err as Error).message, variant: "destructive" }),
                      }),
                    })}
                    className="rounded-full p-0.5 hover:bg-red-500/10 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            }
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
                {formatLabel(l.title)}
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

      {/* Unified contact notes (DB-backed, shared with the CRM record) */}
      <ContactNotes phone={selected.contact_phone} source="inbox" />

      {/* Details */}
      {crmRecord?.kind === "lead" && (
        <div className="rounded-xl border bg-card p-3 space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detalhes</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Estado</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{crmRecord.status || "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Valor</span>
            <span className="text-xs font-semibold text-emerald-600">
              {crmRecord.value != null ? `${Number(crmRecord.value).toLocaleString("pt-PT")} €` : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Open proposals / sales — only for clients */}
      {(activeProposals.length > 0 || activeSales.length > 0) && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-500/5 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Em aberto</p>
          {activeSales.map((s: any) => {
            const saleStatusLabel: Record<string, string> = { in_progress: "Em curso", fulfilled: "Concluída", pending: "Pendente" };
            const saleStatusColor: Record<string, string> = { in_progress: "bg-amber-500 text-white", fulfilled: "bg-emerald-500 text-white", pending: "bg-slate-400 text-white" };
            return (
              <button key={s.id} type="button" onClick={() => navigate(`/sales?sale=${s.id}`)}
                className="w-full rounded-lg border border-amber-200/50 bg-white/60 px-2.5 py-2 text-left transition-colors hover:bg-amber-50/80 dark:bg-card/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{s.code ? `Venda ${s.code}` : (s.title || "Venda")}</p>
                    {s.title && s.code && <p className="truncate text-[11px] text-muted-foreground">{s.title}</p>}
                  </div>
                  <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium", saleStatusColor[s.status] ?? "bg-slate-400 text-white")}>
                    {saleStatusLabel[s.status] ?? s.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {s.total_value != null && (
                    <span className="font-medium text-amber-700">
                      {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(s.total_value)}
                    </span>
                  )}
                  {s.created_at && (
                    <span>{new Date(s.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  )}
                </div>
              </button>
            );
          })}
          {activeProposals.map((p: any) => {
            const propStatusLabel: Record<string, string> = { draft: "Rascunho", sent: "Enviada", negotiating: "Em negociação" };
            const propStatusColor: Record<string, string> = { draft: "bg-slate-400 text-white", sent: "bg-blue-500 text-white", negotiating: "bg-violet-500 text-white" };
            return (
              <button key={p.id} type="button" onClick={() => navigate(`/proposals?proposal=${p.id}`)}
                className="w-full rounded-lg border border-blue-200/50 bg-white/60 px-2.5 py-2 text-left transition-colors hover:bg-blue-50/80 dark:bg-card/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{p.code ? `Proposta ${p.code}` : (p.title || "Proposta")}</p>
                    {p.title && p.code && <p className="truncate text-[11px] text-muted-foreground">{p.title}</p>}
                  </div>
                  <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium", propStatusColor[p.status] ?? "bg-slate-400 text-white")}>
                    {propStatusLabel[p.status] ?? p.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {p.total_value != null && (
                    <span className="font-medium text-blue-700">
                      {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(p.total_value)}
                    </span>
                  )}
                  {p.created_at && (
                    <span>{new Date(p.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tarefas da conversa — "prometi e não esqueço" */}
      {selected?.contact_phone && (
        <ConversationTasks
          phone={selected.contact_phone}
          contactName={selected.contact_name}
          conversationId={selected.id}
          leadId={contactMatch?.kind === "lead" ? contactMatch.id : null}
          clientId={contactMatch?.kind === "client" ? contactMatch.id : null}
          teamMembers={teamMembers}
          prefill={taskPrefill}
          onPrefillConsumed={() => setTaskPrefill(null)}
        />
      )}

      </div>{/* end gap-3 flex col */}
    </div>
  );

  // Thread rows with date separators interleaved. Consecutive messages from the
  // same sender within a short window are grouped: only the LAST keeps a tail +
  // timestamp, and the gap between them tightens — the WhatsApp "grouped" look.
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
      <InboxCaixaRail
        caixas={visibleCaixas}
        caixaFilter={caixaFilter}
        unreadByInbox={unreadByInbox}
        emailChannelId={emailChannelId}
        emailFolderId={emailFolderId}
        onSelectAll={() => { setEmailChannelId(null); setCaixaFilter(null); }}
        onSelectMessaging={(ch) => { setEmailChannelId(null); setCaixaFilter(ch.chatwoot_inbox_id ?? null); }}
        onSelectEmail={(ch) => { setEmailChannelId(ch.id); setEmailFolderId(null); setSelectedId(null); }}
        onSelectFolder={(fid) => setEmailFolderId(fid)}
      />
      {emailChannelId ? (
        <EmailListReader channelId={emailChannelId} folderId={emailFolderId} />
      ) : (
      <>
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
                title="Tarefas"
                className="relative"
                onClick={() => setTasksModalOpen(true)}
              >
                <ClipboardList className="h-4 w-4" />
                {myTasks.length > 0 && (
                  <span
                    className={cn(
                      "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white",
                      myOverdueCount > 0 ? "bg-red-500" : "bg-primary",
                    )}
                  >
                    {myTasks.length}
                  </span>
                )}
              </Button>
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
              {sendableCaixas.length > 0 && (
                <Button size="icon" variant="outline" title="Nova conversa" onClick={() => setNewConvOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar por nome ou mensagem... ( / )"
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

          {/* Caixa selection moved to the unified left rail (InboxCaixaRail) */}
        </div>

        <div ref={listScrollRef} className="flex-1 overflow-y-auto">
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
            <div style={{ height: listVirtualizer.getTotalSize(), position: "relative" }}>
              {listVirtualizer.getVirtualItems().map((vItem) => {
                const c = filtered[vItem.index];
                return (
                  <div
                    key={c.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${vItem.start}px)`,
                    }}
                  >
                    <ConversationRow
                      conversation={c}
                      active={c.id === selectedId}
                      pinned={pinned.includes(c.id)}
                      muted={muted.includes(c.id)}
                      taskState={taskStateByPhone.get(phoneSuffix(c.contact_phone)) ?? null}
                      viewers={presence.get(c.id)}
                      caixaLabel={visibleCaixas.length > 1 && c.inbox_id != null ? channelByInbox.get(c.inbox_id)?.label ?? null : null}
                      caixaColor={c.inbox_id != null ? channelByInbox.get(c.inbox_id)?.color ?? null : null}
                      onSelect={setSelectedId}
                      onHover={prefetchMessages}
                    />
                  </div>
                );
              })}
            </div>
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
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium">{selected.contact_name}</p>
                  {isPinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
                  {(() => {
                    const sla = selected.status !== "resolved" ? slaLevel(selected.waiting_since, isEmailSelected) : null;
                    if (!sla) return null;
                    return (
                      <span
                        className={cn("flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", SLA_BADGE[sla])}
                        title={sla === "late" ? (isEmailSelected ? "Resposta atrasada (>24h)" : "Resposta atrasada (>1h)") : sla === "warn" ? (isEmailSelected ? "À espera (>4h)" : "À espera (>15m)") : "À espera"}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", SLA_DOT[sla])} />
                        à espera {waitingLabel(selected.waiting_since)}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  {isEmailSelected && selected.email_subject ? (
                    <p className="truncate text-xs font-medium text-foreground/80">{selected.email_subject}</p>
                  ) : selected.contact_phone ? (
                    <p className="truncate text-xs text-muted-foreground">{displayPhone(selected.contact_phone)}</p>
                  ) : null}
                  {selected.assigned_name && (
                    <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                      {selected.assigned_name}
                    </span>
                  )}
                  {(selected.labels ?? []).map((l) => (
                    <span key={l} className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{formatLabel(l)}</span>
                  ))}
                </div>
              </div>

              {/* Arquivar / Restaurar */}
              <Button
                size="sm"
                title={isArchived ? "Restaurar conversa" : "Arquivar conversa"}
                onClick={handleToggleArchive}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isArchived ? <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> : <Archive className="mr-1.5 h-3.5 w-3.5" />}
                {isArchived ? "Restaurar" : "Arquivar"}
              </Button>

              {/* CRM: contacto associado → ficha + alterar; desconhecido → adicionar */}
              {contactMatch ? (
                <div className="hidden items-center gap-1 sm:flex">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        {contactMatch.kind === "client" ? "Cliente" : "Lead"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(contactMatch.kind === "client" ? `/clients?highlight=${contactMatch.id}` : `/leads?lead=${contactMatch.id}`)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Ver ficha completa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditCrmOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar ficha
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : selected.contact_phone ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex"
                  onClick={() => setAddToCrmOpen(true)}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar ao CRM
                </Button>
              ) : null}

              {/* Contact panel toggle: fixed column on desktop, sheet on mobile */}
              <Button
                variant="ghost"
                size="icon"
                title="Painel do contacto"
                onClick={() => {
                  if (window.innerWidth >= INBOX_CONFIG.DESKTOP_BREAKPOINT) {
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

            {/* Collision warning: another agent is in this same conversation */}
            {peersHere.length > 0 && (
              <div
                className={cn(
                  "flex items-center gap-2 border-b px-3 py-1.5 text-xs",
                  peersHere.some((p) => p.typing)
                    ? "bg-red-500/10 text-red-700"
                    : "bg-amber-500/10 text-amber-700",
                )}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {peersHere.some((p) => p.typing) ? (
                    <>
                      <span className="font-medium">
                        {peersHere.filter((p) => p.typing).map((p) => firstName(p.name) || "Alguém").join(", ")}
                      </span>{" "}
                      está a responder — cuidado com respostas duplicadas
                    </>
                  ) : (
                    <>
                      <span className="font-medium">
                        {peersHere.map((p) => firstName(p.name) || "Alguém").join(", ")}
                      </span>{" "}
                      {peersHere.length > 1 ? "estão a ver esta conversa" : "está a ver esta conversa"}
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto bg-muted/20 p-4">
              {loadingMessages && thread.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">A carregar mensagens...</span>
                </div>
              ) : (
                <>
                  {thread.length >= 20 && !noMoreOlder[selected.id] && (
                    <div className="flex justify-center pb-2">
                      <Button variant="ghost" size="sm" disabled={loadingOlder} onClick={handleLoadOlder}>
                        {loadingOlder ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ChevronUp className="mr-1.5 h-3.5 w-3.5" />}
                        Carregar mensagens anteriores
                      </Button>
                    </div>
                  )}
                  {threadRows.map((row) =>
                    row.type === "sep" ? (
                      <div key={row.key} className="flex justify-center py-2">
                        <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {row.label}
                        </span>
                      </div>
                    ) : (
                      <MessageBubble
                        key={row.key}
                        m={row.msg}
                        firstOfGroup={row.firstOfGroup}
                        lastOfGroup={row.lastOfGroup}
                        emailMode={isEmailSelected}
                        groupSender={row.groupSender}
                        displayContent={row.displayContent}
                        onPreview={setPreviewUrl}
                        onReply={handleReplyTo}
                        onTask={selectedPhone ? handleTaskFromMessage : undefined}
                        onDelete={row.msg.outgoing && row.msg.wa_id && selectedPhone ? handleDeleteMessage : undefined}
                      />
                    ),
                  )}
                  {visiblePending.map((p) => (
                    <div key={p.key} className="mt-0.5 flex justify-end">
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
              <div className="border-t">
                {isEmailSelected && selected.email_subject && (
                  <div className="flex items-center gap-1.5 border-b bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 fill-current opacity-60"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    <span className="truncate">Re: {selected.email_subject}</span>
                  </div>
                )}
              <form onSubmit={handleSend} onPaste={handlePaste} className="flex items-end gap-1.5 p-3">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handlePickFile} />

                {/* "+" menu — groups attach / emoji / schedule / signature to keep the bar uncluttered */}
                <Popover
                  open={plusOpen}
                  onOpenChange={(o) => {
                    setPlusOpen(o);
                    if (!o) setPlusView("menu");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" title="Mais opções">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-60 p-1.5">
                    {plusView === "emoji" ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setPlusView("menu")}
                          className="mb-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" /> Emoji
                        </button>
                        <div className="grid grid-cols-8 gap-0.5">
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
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => {
                            setPlusOpen(false);
                            fileInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-accent"
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground" /> Anexar ficheiros
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlusView("emoji")}
                          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-accent"
                        >
                          <Smile className="h-4 w-4 text-muted-foreground" /> Emoji
                        </button>
                        {selected.contact_phone && (
                          <button
                            type="button"
                            disabled={!draft.trim()}
                            onClick={() => {
                              setPlusOpen(false);
                              const d = new Date();
                              d.setDate(d.getDate() + 1);
                              d.setHours(9, 0, 0, 0);
                              const pad = (n: number) => String(n).padStart(2, "0");
                              setScheduleAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                              setScheduleOpen(true);
                            }}
                            className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <CalendarClock className="h-4 w-4 text-muted-foreground" /> Agendar envio
                          </button>
                        )}
                        {teamMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = !signing;
                              setSigning(next);
                              localStorage.setItem("inbox-signature-v1", next ? "1" : "0");
                            }}
                            className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent"
                          >
                            <span className="flex items-center gap-2.5">
                              <PenLine className={cn("h-4 w-4", signing ? "text-primary" : "text-muted-foreground")} />
                              Assinar com o meu nome
                            </span>
                            {signing && <Check className="h-4 w-4 text-primary" />}
                          </button>
                        )}
                      </div>
                    )}
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

                <Textarea
                  value={draft}
                  rows={1}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    // Show "typing..." on the contact's WhatsApp (throttled, not for email).
                    if (!isEmailSelected && selected?.contact_phone && Date.now() - lastTypingRef.current > 4000) {
                      lastTypingRef.current = Date.now();
                      sendTyping(selected.contact_phone);
                    }
                    // Broadcast typing to teammates; auto-clear after a short pause.
                    setSelfTyping(true);
                    if (typingResetRef.current) window.clearTimeout(typingResetRef.current);
                    typingResetRef.current = window.setTimeout(() => setSelfTyping(false), 3000);
                  }}
                  onKeyDown={(e) => {
                    // Enter sends; Shift+Enter inserts a newline. Ignore while the
                    // IME is composing (accents / Asian input) so it doesn't send mid-word.
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={
                    outAttachments.length > 0
                      ? "Legenda (opcional)..."
                      : isEmailSelected
                        ? "Escreve a tua resposta ao email..."
                        : "Escreve uma mensagem... (Enter envia, Shift+Enter nova linha)"
                  }
                  autoComplete="off"
                  ref={composerRef}
                  // Grows with the text up to ~10 lines, then scrolls. min-h-0 + the
                  // resize effect override the component's default 80px min height.
                  className="max-h-[240px] min-h-0 resize-none py-2"
                />

                {draft.trim() || outAttachments.length > 0 ? (
                  <Button type="submit" size="icon" disabled={sendMessage.isPending || startConversation.isPending}>
                    {(sendMessage.isPending || startConversation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                ) : !isEmailSelected ? (
                  <Button type="button" size="icon" variant="ghost" title="Gravar mensagem de voz" onClick={startRecording}>
                    <Mic className="h-4 w-4" />
                  </Button>
                ) : null}
              </form>
              </div>
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
      </>
      )}
      </div>

      {/* Image lightbox */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Pré-visualização de imagem</DialogTitle>
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
      <InboxTasksModal
        open={tasksModalOpen}
        onOpenChange={setTasksModalOpen}
        tasks={openTasks}
        teamMembers={teamMembers}
        currentUserId={user?.id}
        onOpenConversation={openTaskConversation}
      />

      <NewConversationPicker
        open={newConvOpen}
        onOpenChange={setNewConvOpen}
        caixas={sendableCaixas}
        selectedCaixa={effectiveNewConvCaixa}
        onSelectCaixa={setNewConvCaixa}
        conversations={conversations}
        onPick={openConversationForContact}
      />

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
        <Suspense fallback={null}>
          <CreateClientModal
            open={createClientModalOpen}
            onOpenChange={setCreateClientModalOpen}
            initialData={{
              name: selected.contact_name,
              phone: selected.contact_phone ? displayPhone(selected.contact_phone) : undefined,
              source: "whatsapp",
            }}
            onCreated={(clientId) => {
              linkCrm.mutate({ conversationId: selected.id, kind: "client", id: clientId, name: selected.contact_name });
            }}
          />
          <AddLeadModal
            open={createLeadModalOpen}
            onOpenChange={setCreateLeadModalOpen}
            initialData={{
              name: selected.contact_name,
              phone: selected.contact_phone ? displayPhone(selected.contact_phone) : undefined,
              email: selected.contact_email ?? undefined,
              source: "whatsapp",
            }}
            onCreated={(leadId) => {
              linkCrm.mutate({ conversationId: selected.id, kind: "lead", id: leadId, name: selected.contact_name });
            }}
          />
          {/* Edit client inline — no need to leave inbox */}
          <EditClientModal
            client={editClientData ?? null}
            open={editCrmOpen && contactMatch?.kind === "client" && !!editClientData}
            onOpenChange={(o) => { if (!o) setEditCrmOpen(false); }}
            inboxContact={{ name: selected.contact_name, phone: selected.contact_phone }}
          />
          {/* Edit lead inline */}
          <LeadDetailsModal
            lead={editLeadData ?? null}
            open={editCrmOpen && contactMatch?.kind === "lead" && !!editLeadData}
            onOpenChange={(o) => { if (!o) setEditCrmOpen(false); }}
            onStatusChange={(leadId, status) => updateLeadStatus.mutate({ leadId, status })}
            onUpdate={(leadId, updates) => updateLeadInline.mutate({ leadId, updates })}
            inboxContact={{ name: selected.contact_name, phone: selected.contact_phone }}
          />
        </Suspense>
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

      {/* Destructive-action confirmation (replaces window.confirm) */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { confirm?.action(); setConfirm(null); }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Detect HTML content: Chatwoot may set content_type='html' or may not set it at all
// even when the body contains raw HTML. Check the content itself as fallback.
function looksLikeHtml(content: string | null | undefined): boolean {
  if (!content) return false;
  return /&[a-z]+;|<[a-z][^>]*>/i.test(content);
}

// Wrap plain text in minimal HTML for iframe so fonts/spacing match the card.
function bodyForIframe(content: string | null | undefined, isHtml: boolean): string {
  const body = content ?? '';
  if (isHtml) {
    // Inject a base style so the iframe doesn't use browser defaults with huge fonts.
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}
      body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#111;word-break:break-word;overflow-wrap:break-word}
      a{color:#2563eb}
      img{max-width:100%;height:auto}
    </style></head><body>${body}</body></html>`;
  }
  const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#111;white-space:pre-wrap;word-break:break-word}
  </style></head><body>${escaped}</body></html>`;
}

// Email message card: shown instead of a chat bubble for email channel messages.
// Displays From / To / CC / Subject header + full body (rendered in sandboxed iframe).
function EmailMessageCard({ m, onPreview }: { m: InboxMessage; onPreview: (url: string) => void }) {
  const fromLabel = m.email_from || m.sender_name || (m.outgoing ? 'Você' : 'Contacto');
  // Prefer the full HTML body from content_attributes; fall back to content field.
  const rawBody = m.email_html_body || m.content;
  const isHtml = !!m.email_html_body || m.content_type === 'html' || m.content_type === 'text/html' || looksLikeHtml(m.content);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const failed = m.outgoing && m.status === 'failed';
  return (
    <div className={cn(
      "my-2 w-full max-w-[92%] rounded-xl border bg-card shadow-sm text-sm",
      m.outgoing ? "ml-auto" : "mr-auto",
      failed && "border-red-300 dark:border-red-500/40",
    )}>
      <div className="border-b px-4 py-2.5 space-y-1">
        {m.email_subject && <p className="font-semibold text-foreground leading-snug">{m.email_subject}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span><span className="font-medium text-foreground/70">De:</span> {fromLabel}</span>
          {m.email_to && <span><span className="font-medium text-foreground/70">Para:</span> {m.email_to}</span>}
          {m.email_cc && <span><span className="font-medium text-foreground/70">CC:</span> {m.email_cc}</span>}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-muted-foreground">{formatTime(m.created_at)}</p>
          {failed && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
              <X className="h-2.5 w-2.5" /> Falha no envio
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        {m.attachments?.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {m.attachments.map((a, i) => (
              <AttachmentView key={a.id ?? i} attachment={a} outgoing={m.outgoing} messageId={m.id} onPreview={onPreview} />
            ))}
          </div>
        )}
        {rawBody ? (
          <iframe
            ref={iframeRef}
            srcDoc={bodyForIframe(rawBody, isHtml)}
            sandbox="allow-same-origin"
            className="w-full border-0"
            style={{ height: '120px' }}
            title="Email"
            onLoad={() => {
              try {
                const doc = iframeRef.current?.contentDocument;
                const h = doc?.documentElement?.scrollHeight ?? doc?.body?.scrollHeight ?? 0;
                if (h > 0 && iframeRef.current) {
                  iframeRef.current.style.height = `${Math.min(h + 8, 700)}px`;
                }
              } catch { /* cross-origin blocked */ }
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({
  m,
  onPreview,
  onReply,
  onDelete,
  onTask,
  emailMode = false,
  firstOfGroup = true,
  lastOfGroup = true,
  groupSender = null,
  displayContent,
}: {
  m: InboxMessage;
  onPreview: (url: string) => void;
  onReply: (m: InboxMessage) => void;
  onDelete?: (m: InboxMessage) => void;
  onTask?: (m: InboxMessage) => void;
  emailMode?: boolean;
  firstOfGroup?: boolean;
  lastOfGroup?: boolean;
  // Individual sender in a WhatsApp group (incoming only); null otherwise.
  groupSender?: string | null;
  // Body with the group-sender prefix stripped; falls back to m.content.
  displayContent?: string;
}) {
  // Show the per-participant avatar + name only for incoming group messages.
  const showGroupSender = !m.outgoing && !!groupSender;
  const body = displayContent ?? m.content;
  const taskButton = onTask ? (
    <button
      type="button"
      title="Criar tarefa a partir desta mensagem"
      onClick={() => onTask(m)}
      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
    >
      <ClipboardList className="h-3.5 w-3.5" />
    </button>
  ) : null;

  if (emailMode) {
    return (
      <div className={cn("group", firstOfGroup ? "mt-3" : "mt-1")}>
        {taskButton && <div className="mb-1 flex justify-end">{taskButton}</div>}
        <EmailMessageCard m={m} onPreview={onPreview} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-end gap-1",
        firstOfGroup ? "mt-2.5" : "mt-0.5",
        m.outgoing ? "justify-end" : "justify-start",
      )}
    >
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
          {taskButton}
          {m.wa_id && <ReplyButton onClick={() => onReply(m)} />}
        </div>
      )}
      {/* Group participant avatar (initials), aligned to the last bubble like WhatsApp.
          Space is reserved on the other rows so the bubbles stay aligned. */}
      {showGroupSender && (
        lastOfGroup ? (
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full bg-muted text-[10px] font-semibold", senderColor(groupSender!))}>
            {initials(groupSender!)}
          </div>
        ) : (
          <div className="w-7 shrink-0" />
        )
      )}
      <div
        className={cn(
          "max-w-[75%] space-y-1 rounded-2xl px-3 py-2 text-sm",
          m.outgoing
            ? cn("bg-primary text-primary-foreground", lastOfGroup && "rounded-br-sm")
            : cn("border bg-card", lastOfGroup && "rounded-bl-sm"),
        )}
      >
        {m.outgoing && m.sender_name && firstOfGroup && (
          <p className="text-[10px] font-medium text-primary-foreground/70">{m.sender_name}</p>
        )}
        {showGroupSender && firstOfGroup && (
          <p className={cn("text-[11px] font-semibold", senderColor(groupSender!))}>{groupSender}</p>
        )}
        {m.attachments?.map((a, i) => (
          <AttachmentView key={a.id ?? i} attachment={a} outgoing={m.outgoing} messageId={m.id} onPreview={onPreview} />
        ))}
        {body && <p className="whitespace-pre-wrap break-words">{body}</p>}
        {lastOfGroup && (
          <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", m.outgoing ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {formatTime(m.created_at)}
            {m.outgoing && <StatusTicks status={m.status} />}
          </p>
        )}
      </div>
      {!m.outgoing && (
        <div className="flex items-center">
          {m.wa_id && <ReplyButton onClick={() => onReply(m)} />}
          {taskButton}
        </div>
      )}
    </div>
  );
});

// Picker for starting a new conversation: search existing leads/clients (by name
// or number) OR type a brand-new number. Picking a target does NOT compose here —
// it opens the conversation (existing or a draft) so the first message is written
// in the normal composer.
function NewConversationPicker({
  open, onOpenChange, caixas, selectedCaixa, onSelectCaixa, conversations, onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caixas: { id: string; label: string | null; phone_number: string | null; chatwoot_inbox_id: number | null }[];
  selectedCaixa: number | null;
  onSelectCaixa: (id: number | null) => void;
  conversations: InboxConversation[];
  onPick: (phone: string, name: string) => void;
}) {
  const [term, setTerm] = useState("");
  useEffect(() => { if (open) setTerm(""); }, [open]);
  const { data: results = [], isFetching } = useSearchCrmRecords(term);
  const digits = term.replace(/\D/g, "");
  const isPhone = digits.length >= 9;

  const hasConv = (phone?: string | null) => {
    const sfx = (phone || "").replace(/\D/g, "").slice(-9);
    if (!sfx) return false;
    return conversations.some((c) => (c.contact_phone || "").replace(/\D/g, "").slice(-9) === sfx);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
          <DialogDescription>Procura um lead ou cliente, ou escreve um número novo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {caixas.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Enviar pela caixa</label>
              <div className="flex flex-wrap gap-1.5">
                {caixas.map((c) => {
                  const active = selectedCaixa === c.chatwoot_inbox_id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectCaixa(c.chatwoot_inbox_id ?? null)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                        active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {c.label || "WhatsApp"}{c.phone_number ? ` · +${c.phone_number}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Nome do contacto, ou número (+351...)"
              className="pl-9"
            />
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {/* Raw number option */}
            {isPhone && (
              <button
                type="button"
                onClick={() => onPick(digits, `+${digits}`)}
                className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Iniciar conversa com +{digits}</p>
                  <p className="text-xs text-muted-foreground">Número novo, fora do CRM</p>
                </div>
              </button>
            )}

            {/* CRM results */}
            {results.map((r) => {
              const phone = (r.phone || "").trim();
              const disabled = !phone;
              const existing = hasConv(phone);
              return (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => phone && onPick(phone, r.name)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors",
                    disabled ? "cursor-not-allowed opacity-50" : "hover:bg-accent",
                  )}
                >
                  <ContactAvatar name={r.name} className="h-9 w-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {phone ? phone : "Sem número"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {r.kind === "client" ? "Cliente" : "Lead"}
                  </span>
                  {existing && (
                    <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600">
                      conversa
                    </span>
                  )}
                </button>
              );
            })}

            {/* Empty / hint states */}
            {term.trim().length < 2 && !isPhone && (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                Escreve um nome para procurar, ou um número para começar.
              </p>
            )}
            {term.trim().length >= 2 && !isFetching && results.length === 0 && !isPhone && (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                Nenhum lead ou cliente encontrado.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelBadge({ channel }: { channel: string | null }) {
  if (!channel) return null;
  const ch = channel.toLowerCase();
  if (ch.includes("instagram")) {
    return (
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-background"
        style={{ background: "linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)" }}>
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.9 4.9 0 0 1 1.772 1.153 4.9 4.9 0 0 1 1.153 1.772c.163.46.35 1.26.403 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.403 2.43a4.9 4.9 0 0 1-1.153 1.772 4.9 4.9 0 0 1-1.772 1.153c-.46.163-1.26.35-2.43.403-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.403a4.9 4.9 0 0 1-1.772-1.153 4.9 4.9 0 0 1-1.153-1.772c-.163-.46-.35-1.26-.403-2.43C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.403-2.43A4.9 4.9 0 0 1 3.79 2.948a4.9 4.9 0 0 1 1.772-1.153c.46-.163 1.26-.35 2.43-.403C9.258 1.334 9.638 1.322 12 1.322Zm0 1.838c-3.162 0-3.535.012-4.787.069-1.055.048-1.63.224-2.011.372a3.07 3.07 0 0 0-1.138.74 3.07 3.07 0 0 0-.74 1.138c-.148.382-.324.956-.372 2.011-.057 1.252-.069 1.625-.069 4.787s.012 3.535.069 4.787c.048 1.055.224 1.63.372 2.011.19.487.45.9.74 1.138.238.29.651.55 1.138.74.382.148.956.324 2.011.372 1.252.057 1.625.069 4.787.069s3.535-.012 4.787-.069c1.055-.048 1.63-.224 2.011-.372a3.07 3.07 0 0 0 1.138-.74 3.07 3.07 0 0 0 .74-1.138c.148-.382.324-.956.372-2.011.057-1.252.069-1.625.069-4.787s-.012-3.535-.069-4.787c-.048-1.055-.224-1.63-.372-2.011a3.07 3.07 0 0 0-.74-1.138 3.07 3.07 0 0 0-1.138-.74c-.382-.148-.956-.324-2.011-.372-1.252-.057-1.625-.069-4.787-.069ZM12 6.865a5.135 5.135 0 1 1 0 10.27 5.135 5.135 0 0 1 0-10.27Zm0 1.838a3.297 3.297 0 1 0 0 6.594 3.297 3.297 0 0 0 0-6.594Zm5.338-3.205a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"/></svg>
      </span>
    );
  }
  if (ch.includes("telegram")) {
    return (
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#229ED9] ring-2 ring-background">
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
      </span>
    );
  }
  if (ch.includes("email")) {
    return (
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-500 ring-2 ring-background">
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
      </span>
    );
  }
  if (ch.includes("facebook")) {
    return (
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2] ring-2 ring-background">
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-white"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
      </span>
    );
  }
  // Default: WhatsApp (api channel or any other → assume WhatsApp since that's the main channel here)
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#25D366] ring-2 ring-background">
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
    </span>
  );
}

const ConversationRow = memo(function ConversationRow({
  conversation,
  active,
  pinned,
  muted,
  taskState,
  viewers,
  caixaLabel,
  caixaColor,
  onSelect,
  onHover,
}: {
  conversation: InboxConversation;
  active: boolean;
  pinned: boolean;
  muted: boolean;
  taskState?: "open" | "overdue" | null;
  viewers?: PresencePeer[];
  // Caixa name, shown only when the org has more than one caixa (else redundant).
  caixaLabel?: string | null;
  // Custom hex color set by the admin for this channel.
  caixaColor?: string | null;
  // Stable parent callback (setSelectedId) so memo can skip re-renders on
  // unrelated parent state changes (e.g. composer typing).
  onSelect: (id: number) => void;
  // Prefetch the thread on hover so the click opens instantly.
  onHover?: (id: number, altIds: number[]) => void;
}) {
  const open = conversation.status !== "resolved";
  const waiting = open ? waitingLabel(conversation.waiting_since) : null;
  const isEmailCh = !!(conversation.channel?.toLowerCase().includes('email'));
  const sla = open ? slaLevel(conversation.waiting_since, isEmailCh) : null;
  return (
    <button
      onClick={() => onSelect(conversation.id)}
      onMouseEnter={() => onHover?.(conversation.id, conversation.alt_ids ?? [])}
      className={cn(
        "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50",
        active && "bg-accent",
      )}
    >
      <div className="relative shrink-0">
        <ContactAvatar name={conversation.contact_name} src={conversation.contact_thumbnail} className="h-10 w-10" />
        <ChannelBadge channel={conversation.channel} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 truncate text-sm font-medium">
            {pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
            {muted && <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" />}
            <span className="truncate">{conversation.contact_name}</span>
            {taskState && (
              <ClipboardList
                className={cn("h-3 w-3 shrink-0", taskState === "overdue" ? "text-red-500" : "text-amber-500")}
                aria-label={taskState === "overdue" ? "Tarefa atrasada" : "Tarefa aberta"}
              />
            )}
            {viewers && viewers.length > 0 && (
              <Eye
                className={cn("h-3 w-3 shrink-0", viewers.some((v) => v.typing) ? "animate-pulse text-red-500" : "text-amber-500")}
                aria-label={`${viewers.map((v) => firstName(v.name) || "Agente").join(", ")} ${viewers.some((v) => v.typing) ? "está a responder" : "está a ver"}`}
              />
            )}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {caixaLabel && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold truncate max-w-[80px]"
                style={caixaColor
                  ? { backgroundColor: caixaColor + '28', color: caixaColor }
                  : { backgroundColor: 'hsl(var(--primary)/.15)', color: 'hsl(var(--primary))' }
                }
              >
                {caixaLabel}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">{formatListDate(conversation.updated_at)}</span>
          </div>
        </div>
        {isEmailCh && conversation.email_subject && (
          <p className="truncate text-xs font-medium text-foreground/80">{conversation.email_subject}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {conversation.last_message ? translateActivity(conversation.last_message) : "—"}
          </p>
          {waiting && sla && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                SLA_BADGE[sla],
              )}
              title={
                sla === "late"
                  ? "Resposta atrasada (>1h)"
                  : sla === "warn"
                    ? "À espera há algum tempo (>15m)"
                    : "À espera há pouco tempo"
              }
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", SLA_DOT[sla])} />
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
              <span key={l} className="shrink-0 rounded-full bg-primary/10 px-1.5 text-[9px] text-primary">{formatLabel(l)}</span>
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
});

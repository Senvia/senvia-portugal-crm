// Unified detection of Chatwoot activity/system messages.
// Used by useChatwootInbox.ts (realtime + list preview) and Inbox.tsx (thread).
// The edge function (chatwoot-inbox) has its own mirror in
// supabase/functions/_shared/activity-detection.ts — keep them in sync when
// adding patterns.

// Activity / system messages Chatwoot injects into the conversation timeline.
// These must NEVER be shown as the list preview — they're not real customer
// messages. Match both the English originals ("Conversation was reopened")
// AND the Portuguese localizations ("O sistema reabriu a conversa...",
// "Conversa resolvida por...") the Chatwoot instance emits, so the preview is
// always the last REAL message regardless of the account's language.
const ACTIVITY_PATTERNS: RegExp[] = [
  /^Conversation was/i,
  /^Assigned to/i,
  /self-assigned this conversation/i,
  /^O sistema /i,
  /^Conversa resolvida/i,
  /^Conversa reaberta/i,
  /^Conversa marcada como pendente/i,
  /^Atribu\u00edda a/i,
  /^A conversa foi/i,
];

// Precompiled name + label fragments for the "X added/removed <label>" activity
// lines (capitalised agent name + a verb). Used by translateActivity below.
const _ACT_NAME = String.raw`\p{Lu}[\p{L}]+(?:[ '\-]\p{L}+)*`;
const _ACT_LABELS = String.raw`[\p{L}\p{N}_-]+(?:,\s*[\p{L}\p{N}_-]+)*`;
const RE_ACT_ADDED = new RegExp(`^(${_ACT_NAME}) added (${_ACT_LABELS})$`, "u");
const RE_ACT_REMOVED = new RegExp(`^(${_ACT_NAME}) removed (${_ACT_LABELS})$`, "u");

export function isActivityText(text: string | null | undefined): boolean {
  if (!text) return false;
  // Fast path: the most common patterns first (startsWith is cheaper than
  // running the full regex array).
  const lower = text.toLowerCase();
  if (lower.startsWith("conversation was")) return true;
  if (lower.startsWith("assigned to")) return true;
  if (lower.includes("self-assigned")) return true;
  if (lower.startsWith("o sistema")) return true;
  if (lower.startsWith("a conversa")) return true;
  if (lower.startsWith("conversa re")) return true;
  if (lower.includes(" added ") || lower.includes(" removed ")) return true;
  if (lower.includes("reabriu") || lower.includes("resolvida") || lower.includes("atribu")) return true;
  if (lower.includes("due to a new") || lower.includes("devido a uma nova")) return true;
  return ACTIVITY_PATTERNS.some((re) => re.test(text));
}

// Translate English activity lines to pt-PT for display in the thread. Already-
// localized Portuguese system messages pass through unchanged.
export function translateActivity(text: string): string {
  if (!text) return text;
  let m: RegExpMatchArray | null;
  if ((m = text.match(RE_ACT_ADDED))) {
    return `${m[1]} adicionou ${m[2].includes(",") ? "as etiquetas" : "a etiqueta"} ${m[2]}`;
  }
  if ((m = text.match(RE_ACT_REMOVED))) {
    return `${m[1]} removeu ${m[2].includes(",") ? "as etiquetas" : "a etiqueta"} ${m[2]}`;
  }
  if ((m = text.match(/^Assigned to (.+?) by (.+)$/))) return `Atribu\u00edda a ${m[1]} por ${m[2]}`;
  if ((m = text.match(/^(.+?) self-assigned this conversation$/i))) return `${m[1]} atribuiu a conversa a si`;
  if ((m = text.match(/^Conversation was marked resolved by (.+)$/i))) return `Conversa resolvida por ${m[1]}`;
  if ((m = text.match(/^Conversation was (?:marked )?reopened by (.+)$/i))) return `Conversa reaberta por ${m[1]}`;
  if (/^Conversation was marked resolved$/i.test(text)) return "Conversa resolvida";
  if (/^Conversation was reopened$/i.test(text)) return "Conversa reaberta";
  if (/^Conversation was marked pending$/i.test(text)) return "Conversa marcada como pendente";
  // Portuguese system messages from the Chatwoot instance — already localized,
  // pass through unchanged so the preview renders them in italics (activity
  // style) instead of as a normal message.
  if (/^O sistema /i.test(text)) return text;
  if (/^Conversa resolvida/i.test(text)) return text;
  if (/^Conversa reaberta/i.test(text)) return text;
  if (/^Conversa marcada como pendente/i.test(text)) return text;
  if (/^Atribu\u00edda a/i.test(text)) return text;
  if (/^A conversa foi/i.test(text)) return text;
  return text;
}

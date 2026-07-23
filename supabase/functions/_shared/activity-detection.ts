// Unified detection of Chatwoot activity/system messages (edge function side).
// Mirror of src/lib/activity-detection.ts — keep in sync when adding patterns.
// Used by chatwoot-inbox (list preview) and chatwoot-webhook (broadcast flag).

const ACTIVITY_CONTENT_PATTERNS = [
  /^Conversation was /i,
  /^Assigned to /i,
  /self-assigned this conversation$/i,
  /^O sistema /i,
  /^Conversa resolvida/i,
  /^Conversa reaberta/i,
  /^Conversa marcada como pendente/i,
  /^Atribu\u00edda a /i,
  /^A conversa foi /i,
];

export function isActivityContent(content: string | null | undefined): boolean {
  if (!content) return false;
  return ACTIVITY_CONTENT_PATTERNS.some((re) => re.test(content));
}

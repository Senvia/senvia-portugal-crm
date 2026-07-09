export function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

export function formatListDate(value: string | number | null): string {
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

function toMs(value: string | number | null): number {
  if (!value) return 0;
  const ms = typeof value === "number" ? value * 1000 : Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

export function waitingLabel(since: number | null): string | null {
  if (!since) return null;
  const mins = Math.floor((Date.now() - since * 1000) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const _ACT_NAME = String.raw`\p{Lu}[\p{L}]+(?:[ '\-]\p{L}+)*`;
const _ACT_LABELS = String.raw`[\p{L}\p{N}_-]+(?:,\s*[\p{L}\p{N}_-]+)*`;
const RE_ACT_ADDED = new RegExp(`^(${_ACT_NAME}) added (${_ACT_LABELS})$`, "u");
const RE_ACT_REMOVED = new RegExp(`^(${_ACT_NAME}) removed (${_ACT_LABELS})$`, "u");

export function translateActivity(text: string): string {
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

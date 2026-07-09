import { renderWithEmoji } from "@/lib/emoji";

const WA_FORMAT_RE = /(\*[^\s*](?:[^*]*[^\s*])?\*)|(_[^\s_](?:[^_]*[^_])?_)|(~[^\s~](?:[^~]*[^~])?~)|(```[^`]+```)/g;

export function renderWhatsAppFormatting(text: string, keyPrefix?: string, highlight?: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  WA_FORMAT_RE.lastIndex = 0;
  while ((match = WA_FORMAT_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...renderWithEmoji(text.slice(lastIndex, match.index), { keyPrefix: `${keyPrefix}t${lastIndex}` }));
    }
    const token = match[0];
    const isMono = token.startsWith("```");
    const inner = isMono ? token.slice(3, -3) : token.slice(1, -1);
    const key = `${keyPrefix}f${match.index}`;
    if (match[1]) {
      parts.push(<strong key={key} className="font-semibold">{renderWithEmoji(inner, { keyPrefix: key })}</strong>);
    } else if (match[2]) {
      parts.push(<em key={key} className="italic">{renderWithEmoji(inner, { keyPrefix: key })}</em>);
    } else if (match[3]) {
      parts.push(<span key={key} className="line-through">{renderWithEmoji(inner, { keyPrefix: key })}</span>);
    } else {
      parts.push(<code key={key} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em] dark:bg-white/10">{inner}</code>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (highlight) {
      const q = highlight.toLowerCase();
      const lowered = remaining.toLowerCase();
      let idx = 0;
      let pos: number;
      while ((pos = lowered.indexOf(q, idx)) !== -1) {
        if (pos > idx) parts.push(...renderWithEmoji(remaining.slice(idx, pos), { keyPrefix: `${keyPrefix}t${idx}` }));
        parts.push(<mark key={`${keyPrefix}h${pos}`} className="rounded-sm bg-yellow-200/70 px-0.5 dark:bg-yellow-700/70">{remaining.slice(pos, pos + q.length)}</mark>);
        idx = pos + q.length;
      }
      if (idx < remaining.length) parts.push(...renderWithEmoji(remaining.slice(idx), { keyPrefix: `${keyPrefix}t${idx}` }));
    } else {
      parts.push(...renderWithEmoji(remaining, { keyPrefix: `${keyPrefix}t${lastIndex}` }));
    }
  }
  return parts.length > 0 ? parts : (highlight && text.toLowerCase().includes(highlight.toLowerCase())
    ? (() => { const q = highlight.toLowerCase(); const l = text.toLowerCase(); const i = l.indexOf(q); return [<span key="pre">{text.slice(0, i)}</span>, <mark key="hl" className="rounded-sm bg-yellow-200/70 px-0.5 dark:bg-yellow-700/70">{text.slice(i, i + q.length)}</mark>, <span key="post">{text.slice(i + q.length)}</span>]; })()
    : renderWithEmoji(text, { keyPrefix }));
}

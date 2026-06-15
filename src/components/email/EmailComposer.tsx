import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Loader2, Send, X, Paperclip, FileText, Bold, Italic, Underline,
  List, ListOrdered, Minus, BookmarkCheck, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useEmailActions } from '@/hooks/useEmailActions';
import { fmtSize } from './emailShared';
import { cn } from '@/lib/utils';
import type { EmailMessage, EmailAddress, EmailDraft } from '@/hooks/useEmail';

interface Attached { filename: string; contentType: string; b64: string; size: number; }
export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

function parseAddrs(s: string): EmailAddress[] {
  return s.split(/[,;]/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const m = p.match(/^(.*?)<([^>]+)>$/);
    if (m) return { name: m[1].trim(), address: m[2].trim() };
    return { name: '', address: p };
  });
}

function fmtAddrs(list: EmailAddress[]) {
  return (list || []).map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(', ');
}

function ensurePrefix(subject: string, prefix: 'Re:' | 'Fwd:') {
  const s = subject || '';
  return new RegExp(`^${prefix}`, 'i').test(s) ? s : `${prefix} ${s}`;
}

function quoteHtml(original: EmailMessage) {
  const who = original.from_name
    ? `${original.from_name} &lt;${original.from_address}&gt;`
    : original.from_address || '';
  const when = original.date ? new Date(original.date).toLocaleString('pt-PT') : '';
  const body = original.html_body
    || (original.text_body
      ? original.text_body
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>')
      : '');
  return `<br><br><div style="border-left:3px solid #e5e7eb;padding-left:10px;margin-left:4px;color:#6b7280">
    <p style="margin:0 0 6px;font-size:13px">Em ${when}, ${who} escreveu:</p>
    <div style="font-size:13px">${body}</div>
  </div>`;
}

// Detect if a string is already HTML (has common tags) or plain text.
function toEditorHtml(s: string | null): string {
  if (!s) return '';
  if (/<(br|p|div|b|i|u|ol|ul|blockquote|strong|em|pre)\b/i.test(s)) return s;
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

// Email chip input: addresses become removable pills; commit on Enter/comma/semicolon/Tab/blur.
function EmailChipInput({
  value, onChange, placeholder,
}: {
  value: EmailAddress[];
  onChange: (addrs: EmailAddress[]) => void;
  placeholder?: string;
}) {
  const [raw, setRaw] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useCallback(() => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    onChange([...value, ...parseAddrs(trimmed)]);
    setRaw('');
  }, [raw, value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === ';' || e.key === 'Tab') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !raw && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  return (
    <div
      className="flex flex-1 min-w-0 flex-wrap items-center gap-1 cursor-text py-0.5"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((a, i) => (
        <span
          key={i}
          className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
        >
          <span className="max-w-[180px] truncate">{a.name || a.address}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(i); }}
            className="text-primary/60 hover:text-primary"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function EmailComposer({
  open, onOpenChange, channelId, folderId, mode, original, selfAddress, initialDraft,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  channelId: string | null;
  folderId: string | null;
  mode: ComposeMode;
  original: EmailMessage | null;
  selfAddress?: string;
  initialDraft?: EmailDraft | null;
}) {
  const { toast } = useToast();
  const actions = useEmailActions(channelId, folderId);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [bodyVersion, setBodyVersion] = useState(0);

  const [to, setTo] = useState<EmailAddress[]>([]);
  const [cc, setCc] = useState<EmailAddress[]>([]);
  const [bcc, setBcc] = useState<EmailAddress[]>([]);
  const [subject, setSubject] = useState('');
  const [attachments, setAttachments] = useState<Attached[]>([]);

  const initial = useMemo(() => {
    if (initialDraft) {
      return {
        to: initialDraft.to_addresses || [],
        cc: initialDraft.cc_addresses || [],
        bcc: initialDraft.bcc_addresses || [],
        subject: initialDraft.subject || '',
        bodyHtml: toEditorHtml(initialDraft.body_html),
        attachments: (initialDraft.attachments || []) as unknown as Attached[],
      };
    }
    if (!original || mode === 'new') {
      return { to: [], cc: [], bcc: [], subject: '', bodyHtml: '', attachments: [] };
    }
    const from: EmailAddress = { name: original.from_name || '', address: original.from_address || '' };
    if (mode === 'forward') {
      return {
        to: [], cc: [], bcc: [],
        subject: ensurePrefix(original.subject || '', 'Fwd:'),
        bodyHtml: quoteHtml(original),
        attachments: [],
      };
    }
    const self = (selfAddress || '').toLowerCase();
    const ccAddrs = mode === 'replyAll'
      ? [...(original.to_addresses || []), ...(original.cc_addresses || [])]
          .filter((a) => a.address && a.address.toLowerCase() !== self && a.address.toLowerCase() !== from.address.toLowerCase())
      : [];
    return {
      to: [from], cc: ccAddrs, bcc: [],
      subject: ensurePrefix(original.subject || '', 'Re:'),
      bodyHtml: quoteHtml(original),
      attachments: [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDraft?.id]);

  // Reset all fields when dialog opens.
  useEffect(() => {
    if (!open) { setMinimized(false); return; }
    setTo(initial.to);
    setCc(initial.cc);
    setBcc(initial.bcc);
    setSubject(initial.subject);
    setAttachments(initial.attachments);
    setShowCc(initial.cc.length > 0);
    setShowBcc(initial.bcc.length > 0);
    setDraftId(initialDraft?.id ?? null);
    setBodyVersion(0);
    // Set editor HTML after mount.
    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.innerHTML = initial.bodyHtml;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  // Auto-save draft (debounced 4 s) when compose is open and has content.
  useEffect(() => {
    if (!open) return;
    const html = editorRef.current?.innerHTML || '';
    const hasContent = to.length > 0 || cc.length > 0 || bcc.length > 0 || subject.trim() || html.replace(/<[^>]+>/g, '').trim();
    if (!hasContent) return;
    const t = setTimeout(async () => {
      try {
        const result = await actions.saveDraft({
          id: draftId,
          to,
          cc: showCc ? cc : [],
          bcc: showBcc ? bcc : [],
          subject,
          bodyHtml: editorRef.current?.innerHTML || '',
          inReplyTo: original?.message_id ?? initialDraft?.in_reply_to ?? null,
          replyMessageId: initialDraft?.reply_message_id ?? null,
          attachments: attachments.map((a) => ({ filename: a.filename, contentType: a.contentType, b64: a.b64 })),
        });
        setDraftId(result.id);
      } catch { /* silent */ }
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, to, cc, bcc, subject, bodyVersion, attachments.length, showCc, showBcc]);

  const format = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    setBodyVersion((v) => v + 1);
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const result = await actions.saveDraft({
        id: draftId,
        to,
        cc: showCc ? cc : [],
        bcc: showBcc ? bcc : [],
        subject,
        bodyHtml: editorRef.current?.innerHTML || '',
        inReplyTo: original?.message_id ?? initialDraft?.in_reply_to ?? null,
        replyMessageId: initialDraft?.reply_message_id ?? null,
        attachments: attachments.map((a) => ({ filename: a.filename, contentType: a.contentType, b64: a.b64 })),
      });
      setDraftId(result.id);
      toast({ title: 'Rascunho guardado' });
    } catch (e) {
      toast({ title: 'Falha ao guardar rascunho', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDiscard = async () => {
    const idToDelete = draftId ?? initialDraft?.id ?? null;
    if (idToDelete) {
      try { await actions.deleteDraft(idToDelete); } catch { /* non-critical */ }
    }
    onOpenChange(false);
  };

  const handleSend = async () => {
    if (to.length === 0) { toast({ title: 'Indica pelo menos um destinatário', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const html = editorRef.current?.innerHTML || '';
      const text = editorRef.current?.innerText || '';
      const refs = original
        ? [...((original as any).email_references || []), original.message_id].filter(Boolean) as string[]
        : undefined;
      await actions.send({
        to,
        cc: showCc ? cc : [],
        bcc: showBcc ? bcc : [],
        subject,
        text,
        html,
        inReplyTo: mode === 'reply' || mode === 'replyAll' ? original?.message_id ?? null : null,
        references: refs,
        attachments: attachments.map((a) => ({ filename: a.filename, contentType: a.contentType, b64: a.b64 })),
      });
      const idToDelete = draftId ?? initialDraft?.id ?? null;
      if (idToDelete) {
        try { await actions.deleteDraft(idToDelete); } catch { /* non-critical */ }
      }
      toast({ title: 'Email enviado' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Falha ao enviar', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const MAX = 15 * 1024 * 1024;
    let running = attachments.reduce((s, a) => s + a.size, 0);
    const added: Attached[] = [];
    for (const f of Array.from(files)) {
      running += f.size;
      if (running > MAX) {
        toast({ title: `${f.name} excede o limite (15 MB no total)`, variant: 'destructive' });
        continue;
      }
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1] || '');
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      added.push({ filename: f.name, contentType: f.type || 'application/octet-stream', b64, size: f.size });
    }
    if (added.length) setAttachments((prev) => [...prev, ...added]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const title = mode === 'reply' ? 'Responder'
    : mode === 'replyAll' ? 'Responder a todos'
    : mode === 'forward' ? 'Reencaminhar'
    : 'Nova mensagem';

  if (!open) return null;

  return (
    <div
      className="fixed bottom-0 right-6 z-50 flex flex-col shadow-2xl"
      style={{ width: 540 }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="flex select-none items-center gap-2 rounded-t-xl bg-[#1f2937] px-4 py-2.5 text-white"
        onDoubleClick={() => setMinimized((m) => !m)}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
        <button
          type="button"
          title="Minimizar"
          onClick={() => setMinimized((m) => !m)}
          className="rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Fechar"
          onClick={() => onOpenChange(false)}
          className="rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Body (hidden when minimized) ────────────────────────── */}
      {!minimized && (
        <div className="flex flex-col border border-t-0 border-border bg-background dark:bg-background">
          {/* Para */}
          <div className="flex min-h-[44px] items-center border-b border-border px-4 py-1.5">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">Para</span>
            <EmailChipInput value={to} onChange={setTo} placeholder="nome@exemplo.com" />
            <div className="ml-2 flex shrink-0 gap-2 text-xs text-muted-foreground">
              {!showCc && (
                <button type="button" className="hover:text-foreground transition-colors" onClick={() => setShowCc(true)}>Cc</button>
              )}
              {!showBcc && (
                <button type="button" className="hover:text-foreground transition-colors" onClick={() => setShowBcc(true)}>Cco</button>
              )}
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex min-h-[44px] items-center border-b border-border px-4 py-1.5">
              <span className="w-12 shrink-0 text-xs text-muted-foreground">Cc</span>
              <EmailChipInput value={cc} onChange={setCc} placeholder="cc@exemplo.com" />
              <button
                type="button"
                className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => { setShowCc(false); setCc([]); }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Cco */}
          {showBcc && (
            <div className="flex min-h-[44px] items-center border-b border-border px-4 py-1.5">
              <span className="w-12 shrink-0 text-xs text-muted-foreground">Cco</span>
              <EmailChipInput value={bcc} onChange={setBcc} placeholder="cco@exemplo.com" />
              <button
                type="button"
                className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => { setShowBcc(false); setBcc([]); }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Assunto */}
          <div className="flex items-center border-b border-border px-4 py-1.5">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">Assunto</span>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto"
              className="border-0 p-0 shadow-none focus-visible:ring-0 text-sm bg-transparent"
            />
          </div>

          {/* Rich-text editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => setBodyVersion((v) => v + 1)}
            className={cn(
              'min-h-[200px] max-h-[280px] overflow-y-auto px-4 py-3 text-sm outline-none',
              '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
              '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
              'empty:before:content-["Escreve_a_tua_mensagem..."] empty:before:text-muted-foreground',
            )}
            style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif", lineHeight: '1.6' }}
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2">
              {attachments.map((a, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="max-w-[120px] truncate">{a.filename}</span>
                  <span className="text-muted-foreground">{fmtSize(a.size)}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* ── Bottom toolbar ────────────────────────────────────── */}
          <div className="flex items-center gap-1 border-t border-border px-3 py-2">
            {/* Send */}
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || savingDraft}
              className="rounded-full px-4 text-xs"
            >
              {sending
                ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Enviar
            </Button>

            <div className="mx-1 h-4 w-px bg-border" />

            {/* Format buttons */}
            <button
              type="button"
              title="Negrito (Ctrl+B)"
              onClick={() => format('bold')}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Itálico (Ctrl+I)"
              onClick={() => format('italic')}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Sublinhado (Ctrl+U)"
              onClick={() => format('underline')}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Underline className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Lista com marcadores"
              onClick={() => format('insertUnorderedList')}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Lista numerada"
              onClick={() => format('insertOrderedList')}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>

            <div className="mx-1 h-4 w-px bg-border" />

            {/* Attach */}
            <button
              type="button"
              title="Anexar ficheiro"
              onClick={() => fileRef.current?.click()}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>

            {/* Save draft manually */}
            <button
              type="button"
              title="Guardar rascunho"
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
            >
              {savingDraft
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <BookmarkCheck className="h-3.5 w-3.5" />}
            </button>

            {/* Discard (far right) */}
            <button
              type="button"
              title="Descartar"
              onClick={handleDiscard}
              className="ml-auto rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}

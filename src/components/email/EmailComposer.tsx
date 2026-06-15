import { useState, useMemo, useRef } from 'react';
import { Loader2, Send, X, Paperclip, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEmailActions } from '@/hooks/useEmailActions';
import { fmtSize } from './emailShared';
import type { EmailMessage, EmailAddress } from '@/hooks/useEmail';

interface Attached { filename: string; contentType: string; b64: string; size: number; }

export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

function fmtAddrs(list: EmailAddress[]) {
  return (list || []).map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(', ');
}
function parseAddrs(s: string): EmailAddress[] {
  return s.split(/[,;]/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const m = p.match(/^(.*?)<([^>]+)>$/);
    if (m) return { name: m[1].trim(), address: m[2].trim() };
    return { name: '', address: p };
  });
}
function ensurePrefix(subject: string, prefix: 'Re:' | 'Fwd:') {
  const s = subject || '';
  return new RegExp(`^${prefix}`, 'i').test(s) ? s : `${prefix} ${s}`;
}
function quoteText(original: EmailMessage) {
  const who = original.from_name || original.from_address || '';
  const body = original.text_body || (original.html_body ? original.html_body.replace(/<[^>]+>/g, '') : '') || '';
  const quoted = body.split('\n').map((l) => `> ${l}`).join('\n');
  return `\n\nEm ${original.date ? new Date(original.date).toLocaleString('pt-PT') : ''}, ${who} escreveu:\n${quoted}`;
}
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function EmailComposer({
  open, onOpenChange, channelId, folderId, mode, original, selfAddress,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  channelId: string | null;
  folderId: string | null;
  mode: ComposeMode;
  original: EmailMessage | null;
  selfAddress?: string;
}) {
  const { toast } = useToast();
  const actions = useEmailActions(channelId, folderId);
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);

  // Prefill from mode + original (recomputed when the dialog (re)opens).
  const initial = useMemo(() => {
    if (!original || mode === 'new') return { to: '', cc: '', subject: '', body: '' };
    const from: EmailAddress = { name: original.from_name || '', address: original.from_address || '' };
    if (mode === 'forward') {
      return { to: '', cc: '', subject: ensurePrefix(original.subject || '', 'Fwd:'),
        body: `\n\n---------- Mensagem reencaminhada ----------\nDe: ${fmtAddrs([from])}\nAssunto: ${original.subject || ''}\n${quoteText(original)}` };
    }
    const self = (selfAddress || '').toLowerCase();
    const cc = mode === 'replyAll'
      ? [...(original.to_addresses || []), ...(original.cc_addresses || [])]
          .filter((a) => a.address && a.address.toLowerCase() !== self && a.address.toLowerCase() !== from.address.toLowerCase())
      : [];
    return { to: fmtAddrs([from]), cc: fmtAddrs(cc), subject: ensurePrefix(original.subject || '', 'Re:'), body: quoteText(original) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [attachments, setAttachments] = useState<Attached[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset fields each time the dialog opens with a (possibly) new prefill.
  useMemo(() => {
    if (open) { setTo(initial.to); setCc(initial.cc); setSubject(initial.subject); setBody(initial.body); setShowCc(!!initial.cc); setAttachments([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const MAX = 15 * 1024 * 1024;
    let running = attachments.reduce((s, a) => s + a.size, 0);
    const added: Attached[] = [];
    for (const f of Array.from(files)) {
      running += f.size;
      if (running > MAX) { toast({ title: `${f.name} excede o limite (15 MB no total)`, variant: 'destructive' }); continue; }
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

  const title = mode === 'reply' ? 'Responder' : mode === 'replyAll' ? 'Responder a todos' : mode === 'forward' ? 'Reencaminhar' : 'Novo email';

  const handleSend = async () => {
    const toList = parseAddrs(to);
    if (toList.length === 0) { toast({ title: 'Indica pelo menos um destinatário', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const refs = original
        ? [...(original.email_references || []), original.message_id].filter(Boolean) as string[]
        : undefined;
      await actions.send({
        to: toList,
        cc: showCc ? parseAddrs(cc) : [],
        subject,
        text: body,
        html: escapeHtml(body).replace(/\n/g, '<br>'),
        inReplyTo: mode === 'reply' || mode === 'replyAll' ? original?.message_id ?? null : null,
        references: refs,
        attachments: attachments.map((a) => ({ filename: a.filename, contentType: a.contentType, b64: a.b64 })),
      });
      toast({ title: 'Email enviado' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Falha ao enviar', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">Para</span>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="nome@exemplo.com, outro@exemplo.com" />
            {!showCc && <button type="button" className="shrink-0 text-xs text-primary hover:underline" onClick={() => setShowCc(true)}>Cc</button>}
          </div>
          {showCc && (
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-xs text-muted-foreground">Cc</span>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@exemplo.com" />
              <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => { setShowCc(false); setCc(''); }}><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">Assunto</span>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto" />
          </div>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="Escreve a tua mensagem..." className="resize-y" />
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="max-w-[160px] truncate">{a.filename}</span>
                  <span className="text-muted-foreground">{fmtSize(a.size)}</span>
                  <button type="button" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={sending}>
            <Paperclip className="mr-1.5 h-4 w-4" /> Anexar
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Enviar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

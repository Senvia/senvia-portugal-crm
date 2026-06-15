import { useState, useEffect, useRef, useMemo } from 'react';
import { Paperclip, Star, Loader2, Mail, FileText, Download, Inbox as InboxIcon, Reply, ReplyAll, Forward, Archive, Trash2, ShieldAlert, MailOpen, PenSquare, Search, X, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmailFolders, useEmailMessages, useEmailMessage, useEmailRealtime, useEmailSearch, useEmailDrafts, type EmailAttachment, type EmailDraft } from '@/hooks/useEmail';
import { useEmailChannels } from '@/hooks/useEmailChannels';
import { useEmailActions } from '@/hooks/useEmailActions';
import { EmailComposer, type ComposeMode } from './EmailComposer';
import { initials, fmtListDate, fmtFullDate, fmtSize, addrText } from './emailShared';

// HTML body in a sandboxed, auto-sized iframe (consistent fonts).
function EmailBody({ html, text }: { html: string | null; text: string | null }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => {
    const font = "-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
    if (html) {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        *{box-sizing:border-box}
        body{margin:0;padding:0;font-family:${font};font-size:14px;line-height:1.6;color:#1a1a1a;word-break:break-word;overflow-wrap:break-word}
        a{color:#2563eb}img{max-width:100%;height:auto}
        blockquote{margin:0 0 0 12px;padding-left:12px;border-left:3px solid #e5e7eb;color:#6b7280}
      </style></head><body>${html}</body></html>`;
    }
    const escaped = (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{margin:0;padding:0;font-family:${font};font-size:14px;line-height:1.6;color:#1a1a1a;white-space:pre-wrap;word-break:break-word}
    </style></head><body>${escaped}</body></html>`;
  }, [html, text]);

  return (
    <iframe
      ref={ref}
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-popups"
      title="Email"
      className="w-full border-0"
      style={{ height: 200 }}
      onLoad={() => {
        try {
          const doc = ref.current?.contentDocument;
          const h = doc?.documentElement?.scrollHeight ?? 0;
          if (h && ref.current) ref.current.style.height = `${h + 12}px`;
        } catch { /* ignore */ }
      }}
    />
  );
}

// Trigger a browser download from base64 content.
function triggerB64Download(filename: string, contentType: string | null, b64: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: contentType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'anexo'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const attachDb = supabase as unknown as { from: (t: string) => any };

// Draft list row (shown when the Rascunhos folder is active).
function DraftRow({ draft, active, onClick }: { draft: EmailDraft; active: boolean; onClick: () => void }) {
  const to = (draft.to_addresses || []).map((a) => a.name || a.address).join(', ') || '(sem destinatário)';
  const snippet = (draft.body_html || '').replace(/<[^>]+>/g, '').slice(0, 120);
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-0.5 border-b px-4 py-3 text-left transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <div className="flex items-center gap-2">
        <FileEdit className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">Para: {to}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{fmtListDate(draft.updated_at)}</span>
      </div>
      <span className="truncate text-sm font-semibold text-foreground">{draft.subject || '(sem assunto)'}</span>
      <span className="truncate text-xs text-muted-foreground">{snippet || '(sem conteúdo)'}</span>
    </button>
  );
}

const DEFAULT_LIST_W = 416; // 26rem
const MIN_LIST_W = 240;
const MAX_LIST_W = 640;

// Message list + reader for one folder. The folder rail lives in the caixa rail.
export function EmailListReader({ channelId, folderId }: { channelId: string | null; folderId: string | null }) {
  const [messageId, setMessageId] = useState<string | null>(null);

  // Resizable list column ─────────────────────────────────────────────────────
  const [listWidth, setListWidth] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('email-list-width-v1') || '', 10) || DEFAULT_LIST_W; } catch { return DEFAULT_LIST_W; }
  });
  const listWidthRef = useRef(listWidth);
  useEffect(() => { listWidthRef.current = listWidth; }, [listWidth]);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: listWidthRef.current };
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const w = Math.max(MIN_LIST_W, Math.min(MAX_LIST_W, dragRef.current.startWidth + e.clientX - dragRef.current.startX));
      setListWidth(w);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      localStorage.setItem('email-list-width-v1', String(listWidthRef.current));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => { setMessageId(null); }, [folderId, channelId]);
  useEmailRealtime(channelId);

  // Detect if current folder is Rascunhos.
  const { data: folders = [] } = useEmailFolders(channelId);
  const isDraftsFolder = !!folderId && folders.find((f) => f.id === folderId)?.role === 'drafts';

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setSearch(''); setDebounced(''); }, [folderId, channelId]);
  const searching = debounced.trim().length >= 2;

  const { data: folderMessages = [], isLoading: loadingFolder } = useEmailMessages(isDraftsFolder ? null : folderId);
  const { data: searchResults = [], isLoading: loadingSearch } = useEmailSearch(channelId, debounced);
  const { data: drafts = [], isLoading: loadingDrafts } = useEmailDrafts(isDraftsFolder ? channelId : null);

  const messages = searching ? searchResults : folderMessages;
  const isLoading = isDraftsFolder ? loadingDrafts : (searching ? loadingSearch : loadingFolder);
  const { data: opened } = useEmailMessage(messageId);

  const { data: caixas = [] } = useEmailChannels();
  const selfAddress = caixas.find((c) => c.id === channelId)?.metadata?.email_address;
  const actions = useEmailActions(channelId, folderId);

  const [compose, setCompose] = useState<{ open: boolean; mode: ComposeMode }>({ open: false, mode: 'new' });
  const [composeDraft, setComposeDraft] = useState<EmailDraft | null>(null);

  // When opening a draft, reset composed draft and open composer.
  const openDraft = (draft: EmailDraft) => {
    setComposeDraft(draft);
    setCompose({ open: true, mode: 'new' });
  };

  // Clear composeDraft when composer closes (so next "Novo email" is blank).
  const handleComposerClose = (o: boolean) => {
    setCompose((c) => ({ ...c, open: o }));
    if (!o) setComposeDraft(null);
  };

  // Auto-mark-read when opening an unread message (standard email behaviour).
  useEffect(() => {
    if (opened?.message && !opened.message.seen) actions.setRead(opened.message.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened?.message?.id]);

  const act = (fn: () => void) => { fn(); setMessageId(null); };

  const { toast } = useToast();
  const [dlId, setDlId] = useState<string | null>(null);
  const downloadAttachment = async (a: EmailAttachment) => {
    setDlId(a.id);
    try {
      const read = () => attachDb.from('email_attachments').select('data_b64, filename, content_type').eq('id', a.id).single();
      let { data } = await read();
      if (!data?.data_b64) {
        await actions.fetchAttachment(a.id);
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 1200));
          const r = await read();
          if (r.data?.data_b64) { data = r.data; break; }
        }
      }
      if (!data?.data_b64) throw new Error('Tempo esgotado a obter o anexo');
      triggerB64Download(data.filename || a.filename || 'anexo', data.content_type || a.content_type, data.data_b64);
    } catch (e) {
      toast({ title: 'Falha ao descarregar', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setDlId(null);
    }
  };

  return (
    <>
      {/* Message list — resizable via drag handle on right border */}
      <section className="relative flex shrink-0 flex-col border-r" style={{ width: listWidth }}>
        {/* Drag handle */}
        <div
          onMouseDown={onResizeStart}
          className="absolute inset-y-0 right-0 z-10 w-[4px] cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors"
        />
        <header className="space-y-2 border-b px-4 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <Button size="sm" onClick={() => { setComposeDraft(null); setCompose({ open: true, mode: 'new' }); }}>
              <PenSquare className="mr-1.5 h-4 w-4" /> Novo email
            </Button>
            <span className="text-xs text-muted-foreground">
              {isDraftsFolder
                ? `${drafts.length} ${drafts.length === 1 ? 'rascunho' : 'rascunhos'}`
                : searching
                  ? `${messages.length} resultado(s)`
                  : `${messages.length} ${messages.length === 1 ? 'email' : 'emails'}`}
            </span>
          </div>
          {!isDraftsFolder && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar emails..."
                className="h-8 pl-8 pr-8 text-sm"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </header>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">A carregar...</span>
            </div>
          ) : isDraftsFolder ? (
            drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <FileEdit className="h-8 w-8 opacity-30" /><span className="text-sm">Sem rascunhos</span>
              </div>
            ) : (
              drafts.map((d) => (
                <DraftRow key={d.id} draft={d} active={composeDraft?.id === d.id && compose.open} onClick={() => openDraft(d)} />
              ))
            )
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <InboxIcon className="h-8 w-8 opacity-30" /><span className="text-sm">Pasta vazia</span>
            </div>
          ) : (
            messages.map((m) => {
              const active = m.id === messageId;
              const who = m.from_name || m.from_address || '(desconhecido)';
              return (
                <button
                  key={m.id}
                  onClick={() => setMessageId(m.id)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 border-b px-4 py-3 text-left transition-colors',
                    active ? 'bg-accent' : 'hover:bg-accent/50',
                    !m.seen && 'bg-primary/[0.03]',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {!m.seen && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <span className={cn('min-w-0 flex-1 truncate text-sm', !m.seen ? 'font-bold' : 'font-medium')}>{who}</span>
                    {m.flagged && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    <span className="shrink-0 text-[11px] text-muted-foreground">{fmtListDate(m.date)}</span>
                  </div>
                  <span className={cn('truncate text-sm', !m.seen ? 'font-semibold text-foreground' : 'text-foreground/80')}>
                    {m.subject || '(sem assunto)'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {m.has_attachments && <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />}
                    <span className="truncate text-xs text-muted-foreground">{m.snippet || ''}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Reader — hidden in drafts mode (drafts open in composer instead) */}
      <section className="flex min-w-0 flex-1 flex-col bg-muted/10">
        {isDraftsFolder ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileEdit className="h-10 w-10 opacity-20" />
            <p className="text-sm">Clica num rascunho para continuar a escrever</p>
          </div>
        ) : !opened ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Mail className="h-10 w-10 opacity-30" />
            <p className="text-sm">Seleciona um email para ler</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-0.5 border-b bg-background px-3 pt-5 pb-2">
              <Button size="sm" variant="ghost" onClick={() => setCompose({ open: true, mode: 'reply' })}><Reply className="mr-1.5 h-4 w-4" /> Responder</Button>
              <Button size="icon" variant="ghost" title="Responder a todos" onClick={() => setCompose({ open: true, mode: 'replyAll' })}><ReplyAll className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" title="Reencaminhar" onClick={() => setCompose({ open: true, mode: 'forward' })}><Forward className="h-4 w-4" /></Button>
              <div className="mx-1 h-5 w-px bg-border" />
              <Button size="icon" variant="ghost" title="Marcar como não lida" onClick={() => act(() => actions.setRead(opened.message.id, false))}><MailOpen className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" title={opened.message.flagged ? 'Remover estrela' : 'Marcar com estrela'} onClick={() => actions.setFlag(opened.message.id, !opened.message.flagged)}><Star className={cn('h-4 w-4', opened.message.flagged && 'fill-amber-400 text-amber-400')} /></Button>
              <Button size="icon" variant="ghost" title="Arquivar" onClick={() => act(() => actions.archive(opened.message.id))}><Archive className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" title="Marcar como spam" onClick={() => act(() => actions.spam(opened.message.id))}><ShieldAlert className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" title="Apagar" onClick={() => act(() => actions.trash(opened.message.id))}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl p-6">
              <h1 className="mb-4 text-xl font-semibold leading-snug">{opened.message.subject || '(sem assunto)'}</h1>
              <div className="mb-4 flex items-start gap-3 border-b pb-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(opened.message.from_name || opened.message.from_address || '?')}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{opened.message.from_name || opened.message.from_address}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{fmtFullDate(opened.message.date)}</span>
                  </div>
                  {opened.message.from_name && (
                    <div className="truncate text-xs text-muted-foreground">{opened.message.from_address}</div>
                  )}
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    Para: {addrText(opened.message.to_addresses) || '—'}
                    {opened.message.cc_addresses?.length > 0 && <>  ·  Cc: {addrText(opened.message.cc_addresses)}</>}
                  </div>
                </div>
              </div>

              {opened.attachments.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {opened.attachments.filter((a) => !a.inline).map((a: EmailAttachment) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => downloadAttachment(a)}
                      disabled={dlId === a.id}
                      title="Descarregar"
                      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-60"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="max-w-[180px] truncate">{a.filename}</span>
                      <span className="text-xs text-muted-foreground">{fmtSize(a.size)}</span>
                      {dlId === a.id ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-lg border bg-white p-4 dark:bg-card">
                {opened.message.body_fetched
                  ? <EmailBody html={opened.message.html_body} text={opened.message.text_body} />
                  : <div className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">A carregar conteúdo...</span></div>}
              </div>
            </div>
          </div>
          </>
        )}
      </section>

      <EmailComposer
        open={compose.open}
        onOpenChange={handleComposerClose}
        channelId={channelId}
        folderId={folderId}
        mode={compose.mode}
        original={opened?.message ?? null}
        selfAddress={selfAddress}
        initialDraft={composeDraft}
      />
    </>
  );
}

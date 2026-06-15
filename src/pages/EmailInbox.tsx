import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Inbox as InboxIcon, Send, FileText, ShieldAlert, Trash2, Archive, Folder,
  Paperclip, Star, Loader2, Mail, ChevronDown, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmailChannels } from '@/hooks/useEmailChannels';
import {
  useEmailFolders, useEmailMessages, useEmailMessage,
  type EmailFolder, type EmailFolderRole, type EmailAddress, type EmailAttachment,
} from '@/hooks/useEmail';

// ── helpers ──────────────────────────────────────────────────────────────────
const ROLE_META: Record<EmailFolderRole, { label: string; Icon: typeof InboxIcon }> = {
  inbox: { label: 'Entrada', Icon: InboxIcon },
  drafts: { label: 'Rascunhos', Icon: FileText },
  sent: { label: 'Enviados', Icon: Send },
  archive: { label: 'Arquivo', Icon: Archive },
  junk: { label: 'Spam', Icon: ShieldAlert },
  trash: { label: 'Lixo', Icon: Trash2 },
  custom: { label: '', Icon: Folder },
};
function folderLabel(f: EmailFolder) {
  return f.role === 'custom' ? f.name : ROLE_META[f.role].label;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function fmtListDate(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startToday) return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtFullDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-PT', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function addrText(list: EmailAddress[]) {
  return (list || []).map((a) => a.name || a.address).join(', ');
}

// ── HTML body in a sandboxed, auto-sized iframe (consistent fonts) ───────────
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

// ── page ─────────────────────────────────────────────────────────────────────
export default function EmailInbox() {
  const { data: caixas = [], isLoading: loadingCaixas } = useEmailChannels();
  const [channelId, setChannelId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [caixaMenuOpen, setCaixaMenuOpen] = useState(false);

  useEffect(() => {
    if (!channelId && caixas.length) setChannelId(caixas[0].id);
  }, [caixas, channelId]);

  const { data: folders = [] } = useEmailFolders(channelId);
  useEffect(() => {
    if (folders.length && (!folderId || !folders.some((f) => f.id === folderId))) {
      setFolderId((folders.find((f) => f.role === 'inbox') || folders[0]).id);
      setMessageId(null);
    }
  }, [folders, folderId]);

  const { data: messages = [], isLoading: loadingMessages } = useEmailMessages(folderId);
  const { data: opened } = useEmailMessage(messageId);
  const activeFolder = folders.find((f) => f.id === folderId) || null;
  const activeCaixa = caixas.find((c) => c.id === channelId) || null;

  if (!loadingCaixas && caixas.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Mail className="h-12 w-12 opacity-30" />
        <p className="text-sm">Ainda não há nenhuma caixa de email configurada.</p>
        <p className="text-xs">Adiciona uma em Definições → Integrações.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Folder rail ── */}
      <aside className="flex w-60 shrink-0 flex-col border-r bg-muted/20">
        <div className="relative border-b p-3">
          <button
            onClick={() => caixas.length > 1 && setCaixaMenuOpen((o) => !o)}
            className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left', caixas.length > 1 && 'hover:bg-accent')}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{activeCaixa?.label || 'Email'}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{activeCaixa?.metadata?.email_address}</span>
            </span>
            {caixas.length > 1 && <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </button>
          {caixaMenuOpen && (
            <div className="absolute inset-x-3 top-full z-10 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md">
              {caixas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setChannelId(c.id); setFolderId(null); setMessageId(null); setCaixaMenuOpen(false); }}
                  className={cn('block w-full px-3 py-2 text-left text-sm hover:bg-accent', c.id === channelId && 'bg-accent')}
                >
                  <span className="block truncate font-medium">{c.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{c.metadata?.email_address}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {folders.map((f) => {
            const { Icon } = ROLE_META[f.role];
            const active = f.id === folderId;
            const showUnread = f.unread_count > 0 && f.role !== 'sent' && f.role !== 'drafts';
            return (
              <button
                key={f.id}
                onClick={() => { setFolderId(f.id); setMessageId(null); }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground/80 hover:bg-accent',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left">{folderLabel(f)}</span>
                {showUnread && (
                  <span className={cn('shrink-0 rounded-full px-1.5 text-[11px] font-semibold', active ? 'bg-primary/20' : 'bg-muted text-muted-foreground')}>
                    {f.unread_count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Message list ── */}
      <section className="flex w-[26rem] shrink-0 flex-col border-r">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{activeFolder ? folderLabel(activeFolder) : ''}</h2>
          <span className="text-xs text-muted-foreground">{messages.length} {messages.length === 1 ? 'email' : 'emails'}</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          {loadingMessages ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">A carregar...</span>
            </div>
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

      {/* ── Reader ── */}
      <section className="flex min-w-0 flex-1 flex-col bg-muted/10">
        {!opened ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Mail className="h-10 w-10 opacity-30" />
            <p className="text-sm">Seleciona um email para ler</p>
          </div>
        ) : (
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
                    <div key={a.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="max-w-[180px] truncate">{a.filename}</span>
                      <span className="text-xs text-muted-foreground">{fmtSize(a.size)}</span>
                      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60" />
                    </div>
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
        )}
      </section>
    </div>
  );
}

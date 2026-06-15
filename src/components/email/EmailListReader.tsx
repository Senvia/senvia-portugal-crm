import { useState, useEffect, useRef, useMemo } from 'react';
import { Paperclip, Star, Loader2, Mail, FileText, Download, Inbox as InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmailMessages, useEmailMessage, type EmailAttachment } from '@/hooks/useEmail';
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

// Message list + reader for one folder. The folder rail lives in the caixa rail.
export function EmailListReader({ channelId, folderId }: { channelId: string | null; folderId: string | null }) {
  const [messageId, setMessageId] = useState<string | null>(null);
  useEffect(() => { setMessageId(null); }, [folderId, channelId]);

  const { data: messages = [], isLoading } = useEmailMessages(folderId);
  const { data: opened } = useEmailMessage(messageId);

  return (
    <>
      {/* Message list */}
      <section className="flex w-[26rem] shrink-0 flex-col border-r">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-xs text-muted-foreground">{messages.length} {messages.length === 1 ? 'email' : 'emails'}</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
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

      {/* Reader */}
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
    </>
  );
}

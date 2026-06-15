import { useState } from 'react';
import { Mailbox, Inbox as InboxIcon, SlidersHorizontal, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { MessagingChannel } from '@/hooks/useMessagingChannels';
import { EmailFolderList } from '@/components/email/EmailFolderList';

function dotColor(ch: MessagingChannel) {
  if (ch.color) return ch.color;
  if (ch.channel_type === 'whatsapp') return '#25D366';
  if (ch.channel_type === 'instagram') return '#E4405F';
  if (ch.channel_type === 'facebook') return '#0084FF';
  return '#64748b';
}

export function InboxCaixaRail({
  caixas,
  caixaFilter,
  emailChannelId,
  emailFolderId,
  onSelectAll,
  onSelectMessaging,
  onSelectEmail,
  onSelectFolder,
}: {
  caixas: MessagingChannel[];
  caixaFilter: number | null;
  emailChannelId: string | null;
  emailFolderId: string | null;
  onSelectAll: () => void;
  onSelectMessaging: (ch: MessagingChannel) => void;
  onSelectEmail: (ch: MessagingChannel) => void;
  onSelectFolder: (folderId: string) => void;
}) {
  const [hidden, setHidden] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('inbox-rail-hidden-v1') || '[]'); } catch { return []; }
  });
  // Track which email caixas have their folder list expanded (independently of active caixa).
  const [openEmails, setOpenEmails] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('inbox-rail-open-emails-v1') || '[]'); } catch { return []; }
  });

  const isHidden = (id: string) => hidden.includes(id);
  const toggleHidden = (id: string) => setHidden((prev) => {
    const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    localStorage.setItem('inbox-rail-hidden-v1', JSON.stringify(next));
    return next;
  });
  const isFolderOpen = (id: string) => openEmails.includes(id);
  const toggleFolderOpen = (id: string, expand: boolean) => setOpenEmails((prev) => {
    const next = expand ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id);
    localStorage.setItem('inbox-rail-open-emails-v1', JSON.stringify(next));
    return next;
  });

  const handleEmailClick = (ch: MessagingChannel) => {
    const wasOpen = isFolderOpen(ch.id);
    if (wasOpen) {
      // Collapse folders (stays in email mode if already active).
      toggleFolderOpen(ch.id, false);
    } else {
      // Expand folders and activate email reader.
      toggleFolderOpen(ch.id, true);
      onSelectEmail(ch);
    }
  };

  const messaging = caixas.filter((c) => c.channel_type !== 'email' && !isHidden(c.id));
  const emails = caixas.filter((c) => c.channel_type === 'email' && !isHidden(c.id));
  const allActive = !emailChannelId && caixaFilter === null;

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/20 md:flex">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <h1 className="px-1 text-sm font-semibold text-muted-foreground">Caixas</h1>
        {caixas.length > 1 && (
          <Popover>
            <PopoverTrigger asChild>
              <button title="Escolher caixas a mostrar" className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-1.5">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Mostrar caixas</p>
              <div className="max-h-72 overflow-y-auto">
                {caixas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleHidden(c.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', !isHidden(c.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                      {!isHidden(c.id) && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{c.label || (c.channel_type === 'email' ? 'Email' : 'WhatsApp')}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mensagens</p>
        <button
          onClick={onSelectAll}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
            allActive ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground/80 hover:bg-accent',
          )}
        >
          <InboxIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">Todas as conversas</span>
        </button>

        {messaging.map((ch) => {
          const active = !emailChannelId && caixaFilter === ch.chatwoot_inbox_id;
          return (
            <button
              key={ch.id}
              onClick={() => onSelectMessaging(ch)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground/80 hover:bg-accent',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dotColor(ch) }} />
              <span className="min-w-0 flex-1 truncate text-left">{ch.label || 'WhatsApp'}</span>
            </button>
          );
        })}

        {emails.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">E-mails</p>
            {emails.map((ch) => {
              const active = emailChannelId === ch.id;
              const expanded = isFolderOpen(ch.id);
              return (
                <div key={ch.id}>
                  <button
                    onClick={() => handleEmailClick(ch)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      active ? 'font-semibold text-primary' : 'text-foreground/80 hover:bg-accent',
                    )}
                  >
                    <Mailbox className="h-4 w-4 shrink-0" style={ch.color ? { color: ch.color } : undefined} />
                    <span className="min-w-0 flex-1 truncate text-left">{ch.label || 'Email'}</span>
                    {expanded
                      ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                  {expanded && (
                    <EmailFolderList
                      channelId={ch.id}
                      activeFolderId={emailFolderId}
                      onSelect={(fid) => {
                        if (emailChannelId !== ch.id) onSelectEmail(ch);
                        onSelectFolder(fid);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}

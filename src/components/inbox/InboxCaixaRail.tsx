import { Mailbox, Inbox as InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessagingChannel } from '@/hooks/useMessagingChannels';
import { EmailFolderList } from '@/components/email/EmailFolderList';

function dotColor(ch: MessagingChannel) {
  if (ch.color) return ch.color;
  if (ch.channel_type === 'whatsapp') return '#25D366';
  if (ch.channel_type === 'instagram') return '#E4405F';
  if (ch.channel_type === 'facebook') return '#0084FF';
  return '#64748b';
}

// Unified caixa rail (Front/Missive style): all caixas in one column. Messaging
// caixas open the chat; email caixas expand to their folders and open the email
// reader — all inside the same Caixa de Entrada.
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
  const messaging = caixas.filter((c) => c.channel_type !== 'email');
  const emails = caixas.filter((c) => c.channel_type === 'email');
  const allActive = !emailChannelId && caixaFilter === null;

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/20 md:flex">
      <div className="border-b px-3 py-3.5">
        <h1 className="px-1 text-sm font-semibold text-muted-foreground">Caixas</h1>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mensagens</p>
        {/* All messaging conversations */}
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

        {/* Messaging caixas (WhatsApp / Instagram / Messenger) */}
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

        {/* Email caixas — expand to folders when active */}
        {emails.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">E-mails</p>
            {emails.map((ch) => {
              const active = emailChannelId === ch.id;
              return (
                <div key={ch.id}>
                  <button
                    onClick={() => onSelectEmail(ch)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      active ? 'font-semibold text-primary' : 'text-foreground/80 hover:bg-accent',
                    )}
                  >
                    <Mailbox className="h-4 w-4 shrink-0" style={ch.color ? { color: ch.color } : undefined} />
                    <span className="min-w-0 flex-1 truncate text-left">{ch.label || 'Email'}</span>
                  </button>
                  {active && (
                    <EmailFolderList channelId={ch.id} activeFolderId={emailFolderId} onSelect={onSelectFolder} />
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

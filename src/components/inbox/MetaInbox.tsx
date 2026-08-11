import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, PanelLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatRelativeTime, formatDateTime } from '@/lib/format';
import { toast } from 'sonner';
import {
  useMetaConversations, useMetaMessages, useSendMetaMessage, useMarkMetaRead,
  type MetaConversation,
} from '@/hooks/useMetaInbox';

/**
 * Caixa de Instagram / Messenger.
 *
 * Lê das nossas tabelas (meta_conversations / meta_messages), não do Chatwoot —
 * estes canais falam direto com a Meta. Monta-se ao lado do cliente de email,
 * como ele: quando se escolhe uma caixa destas, substitui as colunas do chat.
 */
export function MetaInbox({
  channelId,
  channelLabel,
  onOpenRail,
}: {
  channelId: string;
  channelLabel: string;
  onOpenRail?: () => void;
}) {
  const { data: conversations = [], isLoading } = useMetaConversations(channelId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const markRead = useMarkMetaRead();

  // Trocar de caixa não deve manter aberta uma conversa da anterior.
  useEffect(() => { setSelectedId(null); }, [channelId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) =>
      (c.contact_name ?? '').toLowerCase().includes(term)
      || (c.last_message ?? '').toLowerCase().includes(term));
  }, [conversations, search]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const openConversation = (c: MetaConversation) => {
    setSelectedId(c.id);
    if (c.unread_count > 0) markRead.mutate(c.id);
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Lista */}
      <aside className={cn(
        'w-full flex-col border-r md:flex md:w-80 lg:w-96',
        selectedId ? 'hidden md:flex' : 'flex',
      )}>
        <div className="flex items-center gap-2 border-b p-3">
          {onOpenRail && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 md:hidden" onClick={onOpenRail}>
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar conversa…"
            className="h-9"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="Ainda sem conversas"
              description={`Quando alguém enviar uma mensagem para ${channelLabel}, ela aparece aqui.`}
            />
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c)}
                className={cn(
                  'flex w-full items-start gap-3 border-b p-3 text-left transition-colors hover:bg-accent/50',
                  selectedId === c.id && 'bg-primary/5',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {c.contact_name || c.contact_ref}
                    </p>
                    {c.last_message_at && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(c.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {c.last_message || 'Sem mensagens'}
                  </p>
                </div>
                {c.unread_count > 0 && (
                  <span className="mt-1 shrink-0 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
                    {c.unread_count > 99 ? '99+' : c.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Conversa */}
      {selected ? (
        <MetaThread
          conversation={selected}
          onBack={() => setSelectedId(null)}
        />
      ) : (
        <div className="hidden flex-1 items-center justify-center p-8 text-center md:flex">
          <p className="max-w-sm text-sm text-muted-foreground">
            Escolhe uma conversa para a ler e responder.
          </p>
        </div>
      )}
    </div>
  );
}

function MetaThread({
  conversation,
  onBack,
}: {
  conversation: MetaConversation;
  onBack: () => void;
}) {
  const { data: messages = [], isLoading } = useMetaMessages(conversation.id);
  const send = useSendMetaMessage();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDraft(''); }, [conversation.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  // A Meta só deixa responder até 24h depois da última mensagem DA PESSOA.
  // Mostrar isto antes de escrever evita perder uma resposta já redigida.
  const windowExpired = !!conversation.window_expires_at
    && new Date(conversation.window_expires_at) < new Date();

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    send.mutate(
      { conversationId: conversation.id, text },
      {
        onSuccess: () => setDraft(''),
        onError: (e) => toast.error('Não foi enviada', { description: (e as Error).message }),
      },
    );
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        <Button variant="ghost" size="sm" className="md:hidden" onClick={onBack}>Voltar</Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {conversation.contact_name || conversation.contact_ref}
          </p>
          {conversation.window_expires_at && !windowExpired && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Podes responder até {formatDateTime(conversation.window_expires_at)}
            </p>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-2/3 rounded-lg" />)
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Sem mensagens nesta conversa.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn('flex', m.direction === 'outgoing' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                m.direction === 'outgoing'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground',
              )}>
                {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                {m.attachments?.map((a, i) => (
                  a.url
                    ? <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block text-xs underline">
                        {a.type === 'image' ? 'Imagem' : a.type === 'video' ? 'Vídeo' : 'Anexo'}
                      </a>
                    : <span key={i} className="text-xs opacity-70">[{a.type}]</span>
                ))}
                <p className={cn(
                  'mt-0.5 text-[10px]',
                  m.direction === 'outgoing' ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}>
                  {formatRelativeTime(m.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <footer className="border-t p-3">
        {windowExpired ? (
          // Bloquear com explicação é melhor do que deixar escrever e falhar
          // depois: a Meta recusa fora da janela com um erro que não se entende.
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Passaram mais de 24 horas desde a última mensagem desta pessoa. A Meta só permite
            responder dentro desse prazo — poderás voltar a escrever assim que ela enviar
            nova mensagem.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Escreve a resposta…"
              rows={1}
              className="max-h-32 min-h-[40px] resize-none"
            />
            <Button onClick={handleSend} disabled={!draft.trim() || send.isPending} size="icon" className="h-10 w-10 shrink-0">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </footer>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, PanelLeft, Clock, Paperclip, SmilePlus } from 'lucide-react';
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
  useMetaAction, useSendMetaAttachment,
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
                <ContactAvatar name={c.contact_name} url={c.contact_avatar_url} />
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
  const act = useMetaAction();
  const sendFile = useSendMetaAttachment();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<number | null>(null);

  useEffect(() => { setDraft(''); }, [conversation.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  // "Visto" ao abrir a conversa — é o que a pessoa do outro lado espera ver.
  useEffect(() => {
    act.mutate({ conversationId: conversation.id, action: 'mark_seen' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  /**
   * "A escrever…" no Instagram da pessoa.
   *
   * Estrangulado a um envio por 3 segundos: a cada tecla seria uma chamada à
   * Meta por caractere, o que arde o limite de pedidos sem acrescentar nada —
   * o indicador dela dura alguns segundos de qualquer forma.
   */
  const sinalizarEscrita = () => {
    const agora = Date.now();
    if (typingRef.current && agora - typingRef.current < 3000) return;
    typingRef.current = agora;
    act.mutate({ conversationId: conversation.id, action: 'typing_on' });
  };

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
        <ContactAvatar name={conversation.contact_name} url={conversation.contact_avatar_url} />
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
            <div key={m.id} className={cn('group/msg flex items-center gap-1', m.direction === 'outgoing' ? 'justify-end' : 'justify-start')}>
              {/* Reagir. Só faz sentido em mensagens que a Meta conhece pelo id
                  — sem external_id não há a que reagir do lado dela. */}
              {m.direction === 'outgoing' && m.external_id && (
                <ReactionPicker
                  current={m.reaction}
                  onPick={(emoji) => act.mutate({
                    conversationId: conversation.id,
                    action: emoji ? 'react' : 'unreact',
                    messageExternalId: m.external_id,
                    reaction: emoji ?? undefined,
                  })}
                />
              )}
              <div className={cn(
                'relative max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                m.direction === 'outgoing'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground',
              )}>
                {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                {m.attachments?.map((a, i) => <Attachment key={i} type={a.type} url={a.url} />)}
                <p className={cn(
                  'mt-0.5 text-[10px]',
                  m.direction === 'outgoing' ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}>
                  {formatRelativeTime(m.created_at)}
                </p>
                {m.reaction && (
                  // Colada ao canto inferior, como no Instagram.
                  <span
                    title={m.reaction_by === 'agent' ? 'Reagiste a esta mensagem' : 'Reação do contacto'}
                    className="absolute -bottom-2 -right-1 rounded-full border bg-background px-1 text-xs shadow-sm"
                  >
                    {m.reaction}
                  </span>
                )}
              </div>
              {m.direction === 'incoming' && m.external_id && (
                <ReactionPicker
                  current={m.reaction}
                  onPick={(emoji) => act.mutate({
                    conversationId: conversation.id,
                    action: emoji ? 'react' : 'unreact',
                    messageExternalId: m.external_id,
                    reaction: emoji ?? undefined,
                  })}
                />
              )}
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
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,video/*,audio/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                sendFile.mutate(
                  { conversationId: conversation.id, file: f },
                  { onError: (err) => toast.error('Anexo não enviado', { description: (err as Error).message }) },
                );
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              title="Enviar imagem, áudio, vídeo ou PDF"
              disabled={sendFile.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {sendFile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Textarea
              value={draft}
              onChange={(e) => { setDraft(e.target.value); sinalizarEscrita(); }}
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

/**
 * Foto do contacto, com as iniciais como recurso.
 *
 * O endereço da foto vem assinado pela Meta e EXPIRA — por isso o onError não é
 * decoração: quando o link caduca, a imagem falha e sem isto ficava um quadrado
 * partido. Cai nas iniciais, que funcionam sempre.
 */
function ContactAvatar({ name, url }: { name: string | null; url: string | null }) {
  const [failed, setFailed] = useState(false);
  const label = (name ?? '').replace(/^@/, '');
  const initials = label
    ? label.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
    : '?';

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={label || 'Contacto'}
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {initials}
    </span>
  );
}

/** Extrai o código de uma publicação/Reel do Instagram a partir do endereço. */
function instagramCode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[1] ?? null;
}

/**
 * Desenha o anexo conforme o que ele é.
 *
 * A Meta manda tipos diferentes e antes tratava-os todos como "Anexo" com um
 * link — obrigando a sair do CRM para ver uma imagem que já vinha pronta a
 * mostrar.
 *
 * Reels e publicações partilhadas não vêm com ficheiro: vêm com o endereço do
 * post. Para esses usa-se o incorporador público do Instagram, que não precisa
 * de API nem de permissões — mas só funciona com contas/publicações públicas,
 * por isso há sempre o link por baixo.
 *
 * Nota sobre imagens e vídeos: os endereços do CDN da Meta são assinados e
 * EXPIRAM. Enquanto a conversa é recente mostram-se; mais tarde deixam de
 * abrir, e por isso o link fica sempre disponível como alternativa.
 */
function Attachment({ type, url }: { type: string; url: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!url) return <span className="text-xs opacity-70">[{type}]</span>;

  const code = instagramCode(url);
  const isShare = type === 'ig_reel' || type === 'share' || !!code;

  if (isShare && code && !broken) {
    return (
      <div className="mt-1 overflow-hidden rounded-lg bg-background">
        <iframe
          src={`https://www.instagram.com/reel/${code}/embed`}
          title="Publicação do Instagram"
          // 9:16 com folga para a barra do Instagram — a altura fixa de 400px
          // cortava o Reel e obrigava a rolar dentro do próprio anexo.
          className="aspect-[9/16] h-auto w-full max-w-[340px] border-0"
          loading="lazy"
          allowFullScreen
          onError={() => setBroken(true)}
        />
        <a href={url} target="_blank" rel="noreferrer" className="block px-2 py-1 text-[11px] underline opacity-80">
          Abrir no Instagram
        </a>
      </div>
    );
  }

  if (type === 'image' && !broken) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
        <img
          src={url}
          alt="Imagem recebida"
          onError={() => setBroken(true)}
          className="max-h-64 max-w-full rounded-lg object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if ((type === 'video' || type === 'audio') && !broken) {
    const Tag = type === 'video' ? 'video' : 'audio';
    return (
      <Tag
        src={url}
        controls
        onError={() => setBroken(true)}
        className={cn('mt-1 max-w-full rounded-lg', type === 'video' && 'max-h-64')}
      />
    );
  }

  const rotulo = type === 'image' ? 'Imagem'
    : type === 'video' ? 'Vídeo'
    : type === 'audio' ? 'Áudio'
    : type === 'story_mention' ? 'Menção em story'
    : isShare ? 'Publicação do Instagram'
    : 'Anexo';

  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-1 block text-xs underline">
      {rotulo}{broken ? ' (já não abre aqui)' : ''}
    </a>
  );
}

/** As reações que o Instagram aceita na aplicação. */
const REACOES = ['❤️', '😂', '😮', '😢', '😡', '👍'];

/**
 * Escolher (ou tirar) a reação a uma mensagem.
 *
 * Aparece ao passar o rato — colar seis emojis a cada linha da conversa
 * tornaria a leitura impossível.
 */
function ReactionPicker({
  current,
  onPick,
}: {
  current: string | null;
  onPick: (emoji: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Reagir"
        className={cn(
          'rounded-full p-1 text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground',
          open ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100',
        )}
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          {/* Fecha ao clicar fora, sem prender o clique dentro do seletor. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 z-20 mb-1 flex -translate-x-1/2 gap-0.5 rounded-full border bg-popover p-1 shadow-md">
            {REACOES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onPick(current === e ? null : e); setOpen(false); }}
                className={cn(
                  'rounded-full px-1 text-base leading-none transition-transform hover:scale-125',
                  current === e && 'bg-accent',
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

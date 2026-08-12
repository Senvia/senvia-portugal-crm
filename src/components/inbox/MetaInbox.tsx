import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, PanelLeft, Clock, Paperclip, SmilePlus, Mic, X } from 'lucide-react';
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
              accept="image/png,image/jpeg,video/*,application/pdf"
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
              title="Enviar imagem, vídeo ou PDF"
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
            {/* Como no Instagram: sem texto escrito, o botão grava voz; com
                texto, envia. Um só lugar para "responder", em vez de tratar a
                voz como se fosse um ficheiro qualquer. */}
            {draft.trim() ? (
              <Button onClick={handleSend} disabled={send.isPending} size="icon" className="h-10 w-10 shrink-0">
                {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            ) : (
              <VoiceRecorder
                disabled={sendFile.isPending}
                onRecorded={(file) => sendFile.mutate(
                  { conversationId: conversation.id, file },
                  { onError: (err) => toast.error('Áudio não enviado', { description: (err as Error).message }) },
                )}
              />
            )}
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
    return <InstagramEmbed code={code} url={url} onBroken={() => setBroken(true)} />;
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

/**
 * Publicação do Instagram incorporada, sem barra de scroll.
 *
 * Uma altura fixa nunca serve: o incorporador traz cabeçalho, vídeo e legenda, e
 * cada publicação tem um tamanho diferente — foi por isso que 400px cortava o
 * Reel e 9:16 continuava a deixar scroll.
 *
 * O próprio Instagram resolve isto: a página incorporada envia à janela-mãe a
 * altura de que precisa, com `{"type":"MEASURE","details":{"height":N}}`. É o
 * mecanismo que o script oficial deles usa para redimensionar. Ouve-se essa
 * mensagem e ajusta-se — assim cabe sempre, seja qual for a publicação.
 */
function InstagramEmbed({
  code,
  url,
  onBroken,
}: {
  code: string;
  url: string;
  onBroken: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Altura inicial só para não saltar antes de a medição chegar.
  const [height, setHeight] = useState(560);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.origin.includes('instagram.com')) return;
      // Só mensagens deste iframe: a conversa pode ter vários incorporados.
      if (frameRef.current && event.source !== frameRef.current.contentWindow) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const h = Number(data?.details?.height);
        if (data?.type === 'MEASURE' && Number.isFinite(h) && h > 0) setHeight(Math.ceil(h));
      } catch { /* nem tudo o que o Instagram envia é a medição */ }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="mt-1 overflow-hidden rounded-lg bg-background">
      <iframe
        ref={frameRef}
        src={`https://www.instagram.com/reel/${code}/embed`}
        title="Publicação do Instagram"
        style={{ height }}
        // scrolling="no" evita a barra no intervalo entre montar e medir.
        scrolling="no"
        className="w-full max-w-[340px] border-0"
        loading="lazy"
        allowFullScreen
        onError={onBroken}
      />
      <a href={url} target="_blank" rel="noreferrer" className="block px-2 py-1 text-[11px] underline opacity-80">
        Abrir no Instagram
      </a>
    </div>
  );
}

/**
 * Gravar uma mensagem de voz e enviá-la.
 *
 * Sobre o formato: o MediaRecorder de cada browser grava no que lhe apetece, e a
 * Meta só aceita alguns. Tenta-se por ordem de compatibilidade (MP4/AAC primeiro,
 * que é o mais universal; OGG e WEBM a seguir) em vez de assumir um — o Safari
 * não grava WEBM e o Chrome não grava MP4 em todas as versões.
 */
const FORMATOS_AUDIO = [
  { mime: 'audio/mp4', ext: 'm4a' },
  { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
  { mime: 'audio/webm;codecs=opus', ext: 'webm' },
  { mime: 'audio/webm', ext: 'webm' },
];

function VoiceRecorder({
  onRecorded,
  disabled,
}: {
  onRecorded: (file: File) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);

  // Largar o microfone e o contador se o componente sair a meio de uma gravação
  // — senão o browser fica com a luz do micro acesa indefinidamente.
  useEffect(() => () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const começar = async () => {
    const formato = FORMATOS_AUDIO.find((f) => MediaRecorder.isTypeSupported(f.mime));
    if (!formato) {
      toast.error('O teu browser não permite gravar áudio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: formato.mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: formato.mime });
        // Gravações de menos de um segundo são quase sempre um toque acidental.
        if (blob.size > 1000) {
          onRecorded(new File([blob], `voz-${Date.now()}.${formato.ext}`, { type: formato.mime }));
        }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setSeconds(0);
      tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error('Sem acesso ao microfone', {
        description: 'Autoriza o microfone para este site nas definições do browser.',
      });
    }
  };

  const parar = (enviar: boolean) => {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    const rec = recRef.current;
    if (!rec) return;
    // Cancelar: limpa o que foi gravado ANTES de parar, para o onstop não enviar.
    if (!enviar) chunksRef.current = [];
    rec.stop();
    recRef.current = null;
    setRecording(false);
  };

  if (recording) {
    return (
      <div className="flex h-10 shrink-0 items-center gap-1 rounded-md bg-destructive/10 px-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
        <span className="text-xs font-medium tabular-nums text-destructive">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Cancelar" onClick={() => parar(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" className="h-7 w-7" title="Enviar" onClick={() => parar(true)}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 shrink-0"
      title="Gravar mensagem de voz"
      disabled={disabled}
      onClick={começar}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}

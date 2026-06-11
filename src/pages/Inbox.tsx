import { useState, useRef, useEffect, useMemo } from "react";
import { useWhatsappChannel } from "@/hooks/useMessagingChannels";
import {
  useInboxConversations,
  useInboxMessages,
  useSendInboxMessage,
  useMarkConversationRead,
  InboxConversation,
} from "@/hooks/useChatwootInbox";
import { ConnectWhatsAppModal } from "@/components/settings/ConnectWhatsAppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Send, ArrowLeft, Smartphone, Search } from "lucide-react";
import { cn, matchesSearch } from "@/lib/utils";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

function formatTime(value: string | number | null): string {
  if (!value) return "";
  const ms = typeof value === "number" ? value * 1000 : Date.parse(value);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms);
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

// Contact avatar: shows the WhatsApp profile photo, falling back to initials.
function ContactAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const [errored, setErrored] = useState(false);
  if (src && !errored) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErrored(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

export default function Inbox() {
  const { channel } = useWhatsappChannel();
  const connected = channel?.status === "connected";
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: loadingConvos } = useInboxConversations(connected);
  const { data: messages = [], isLoading: loadingMessages } = useInboxMessages(selectedId);
  const sendMessage = useSendInboxMessage();
  const { mutate: markRead } = useMarkConversationRead();

  const selected = conversations.find((c) => c.id === selectedId) || null;

  // Hide the Evolution control bot's QR-code conversations from the inbox.
  const visible = useMemo(
    () => conversations.filter((c) => c.contact_name !== "EvolutionAPI"),
    [conversations],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return visible;
    return visible.filter(
      (c) => matchesSearch(c.contact_name, search) || matchesSearch(c.contact_phone || "", search),
    );
  }, [visible, search]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedId]);

  // Mark the conversation as read in Chatwoot when it is opened.
  useEffect(() => {
    if (selectedId) markRead(selectedId);
  }, [selectedId, markRead]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !selectedId) return;
    setDraft("");
    sendMessage.mutate({ conversationId: selectedId, content });
  };

  // ---- Empty state: WhatsApp not connected ----
  if (!connected) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-2xl bg-green-500/10 p-5">
          <Smartphone className="h-12 w-12 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Liga o teu WhatsApp</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Conecta o teu número para receberes e responderes às mensagens dos clientes aqui, dentro do Senvia.
          </p>
        </div>
        <Button onClick={() => setConnectOpen(true)}>
          <Smartphone className="mr-2 h-4 w-4" />
          Conectar WhatsApp
        </Button>
        <ConnectWhatsAppModal open={connectOpen} onOpenChange={setConnectOpen} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ---- Conversation list ---- */}
      <aside
        className={cn(
          "w-full flex-col border-r md:flex md:w-80 lg:w-96",
          selectedId ? "hidden md:flex" : "flex",
        )}
      >
        <div className="border-b p-4">
          <h1 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="h-5 w-5 text-primary" />
            Caixa de Entrada
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar conversa..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">A carregar conversas...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {search ? "Nenhuma conversa encontrada." : "Ainda não há conversas. Quando um cliente enviar uma mensagem, ela aparece aqui."}
            </div>
          ) : (
            filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ---- Thread ---- */}
      <section className={cn("flex-1 flex-col", selectedId ? "flex" : "hidden md:flex")}>
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-40" />
            <p className="text-sm">Seleciona uma conversa para começar</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b p-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <ContactAvatar name={selected.contact_name} src={selected.contact_thumbnail} className="h-9 w-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selected.contact_name}</p>
                {selected.contact_phone && (
                  <p className="truncate text-xs text-muted-foreground">+{selected.contact_phone}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">A carregar mensagens...</span>
                </div>
              ) : (
                messages
                  .filter((m) => !m.is_activity)
                  .map((m) => (
                    <div key={m.id} className={cn("flex", m.outgoing ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                          m.outgoing
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-card border",
                        )}
                      >
                        {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                        {m.attachments?.length > 0 && (
                          <p className="text-xs italic opacity-70">📎 anexo</p>
                        )}
                        <p className={cn("mt-1 text-[10px]", m.outgoing ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escreve uma mensagem..."
                autoComplete="off"
              />
              <Button type="submit" size="icon" disabled={!draft.trim() || sendMessage.isPending}>
                {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onClick,
}: {
  conversation: InboxConversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50",
        active && "bg-accent",
      )}
    >
      <ContactAvatar name={conversation.contact_name} src={conversation.contact_thumbnail} className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{conversation.contact_name}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(conversation.updated_at)}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{conversation.last_message || "—"}</p>
      </div>
      {conversation.unread_count > 0 && (
        <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-semibold text-white">
          {conversation.unread_count}
        </span>
      )}
    </button>
  );
}

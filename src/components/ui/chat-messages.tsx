import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface ChatMessagesProps {
  messages: ChatMessage[];
  /** O Otto responde de verdade: quem envia é o componente-pai, via backend. */
  onSend?: (content: string) => void | Promise<void>;
  /** Mostrado enquanto a Edge Function não devolve resposta. */
  isThinking?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyState?: React.ReactNode;
  className?: string;
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md border border-white/10 bg-zinc-800/90 px-4 py-3 backdrop-blur-sm"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-white/60"
          animate={{ opacity: [0.4, 1, 0.4], y: [0, -4, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </motion.div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}>
        {!isUser && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-600">
            <Bot className="size-4 text-white" />
          </div>
        )}
        <motion.div
          layout
          className={cn(
            // whitespace-pre-wrap: as respostas do Otto vêm com parágrafos e
            // listas. Sem isto, tudo colapsa numa parede de texto.
            "max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-md bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-[0_8px_24px_-4px_rgba(0,195,255,0.35)]"
              : "rounded-tl-md border border-white/10 bg-zinc-800/90 text-zinc-100 backdrop-blur-sm shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3)]",
          )}
          whileHover={{ scale: 1.01, y: -1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {message.content}
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Chat do Otto.
 *
 * Sem autoplay e sem mensagens de demonstração: o componente original era uma
 * montra que encenava uma conversa e respondia com texto fixo. Aqui as
 * mensagens vêm todas do backend — mostrar uma resposta inventada num
 * assistente que opera dados do CRM seria enganador.
 */
export function ChatMessages({
  messages,
  onSend,
  isThinking = false,
  disabled = false,
  placeholder = "Pergunta ao Otto...",
  emptyState,
  className,
}: ChatMessagesProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isThinking, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || disabled || isThinking || !onSend) return;
    // Limpa antes de enviar: o pedido pode demorar, e deixar o texto no campo
    // convida a carregar em Enter outra vez e duplicar a pergunta.
    setInputValue("");
    await onSend(content);
  }, [inputValue, disabled, isThinking, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const canSend = !!inputValue.trim() && !disabled && !isThinking;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-600">
            <Bot className="size-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Otto</h3>
            <p className="text-xs text-white/40">Assistente do SENVIA OS</p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-label="Conversa com o Otto"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && !isThinking && emptyState}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        <AnimatePresence>{isThinking && <TypingIndicator />}</AnimatePresence>
      </div>

      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/50 px-4 py-2 backdrop-blur-sm focus-within:border-white/20 focus-within:bg-zinc-800/70">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            aria-label="Escreve a tua mensagem"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30 disabled:cursor-not-allowed"
          />
          <motion.button
            whileHover={canSend ? { scale: 1.08 } : undefined}
            whileTap={canSend ? { scale: 0.92 } : undefined}
            onClick={() => void handleSend()}
            disabled={!canSend}
            aria-label="Enviar mensagem"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              canSend ? "bg-cyan-600 text-white hover:bg-cyan-500" : "bg-white/5 text-white/30",
            )}
          >
            <Send className="size-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default ChatMessages;

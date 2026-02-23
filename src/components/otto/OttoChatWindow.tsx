import { useState, useRef, useEffect } from "react";
import { X, Send, Trash2 } from "lucide-react";
import ottoMascot from "@/assets/otto-mascot.svg";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOttoChat } from "@/hooks/useOttoChat";
import { OttoMessageComponent } from "./OttoMessage";
import { OttoQuickActions } from "./OttoQuickActions";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

interface OttoChatWindowProps {
  onClose: () => void;
}

export function OttoChatWindow({ onClose }: OttoChatWindowProps) {
  const { messages, isLoading, sendMessage, clearMessages } = useOttoChat();
  const [input, setInput] = useState("");
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  };

  const handleQuickAction = (text: string) => {
    if (isLoading) return;
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={{ pointerEvents: 'auto' }}
      className={
        isMobile
          ? "fixed inset-0 z-[9999] bg-background flex flex-col"
          : "fixed bottom-20 right-4 z-[9999] w-[380px] h-[520px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      }
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 ${isMobile ? "pt-safe" : ""}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img src={ottoMascot} alt="Otto" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Otto</h3>
            <p className="text-[10px] text-muted-foreground">Assistente Senvia OS</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon-sm" onClick={clearMessages} title="Limpar conversa">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex gap-2.5">
              <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden">
                <img src={ottoMascot} alt="Otto" className="w-full h-full object-cover" />
              </div>
              <div className="max-w-[85%]">
                <OttoQuickActions onSelect={handleQuickAction} />
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <OttoMessageComponent
              key={i}
              message={msg}
              onButtonClick={handleQuickAction}
              isStreaming={isLoading && i === messages.length - 1 && msg.role === "assistant"}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2.5">
              <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden">
                <img src={ottoMascot} alt="Otto" className="w-full h-full object-cover" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-md px-3.5 py-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className={`p-3 border-t border-border bg-muted/20 ${isMobile ? "pb-safe" : ""}`}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreve aqui..."
            disabled={isLoading}
            className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <Button
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

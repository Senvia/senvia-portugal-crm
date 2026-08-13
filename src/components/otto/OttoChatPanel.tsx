import { useMemo } from "react";
import { Bot } from "lucide-react";
import { ChatMessages, type ChatMessage } from "@/components/ui/chat-messages";
import { useOttoChat } from "@/hooks/useOttoChat";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Painel de conversa do Otto.
 *
 * Liga o componente visual ao `useOttoChat`, que já existia e faz streaming e
 * anexos. Não foi reescrito de propósito: substituir um hook em produção por
 * outro mais pobre, só para seguir um passo do plano à letra, era perder
 * funcionalidade sem ganhar nada.
 */
export function OttoChatPanel({ className }: { className?: string }) {
  const { messages, isLoading, sendMessage } = useOttoChat();
  const { profile } = useAuth();

  // O store guarda {role, content}; o componente quer {id, sender, content}. O
  // índice serve de chave porque as mensagens só crescem no fim e a última é
  // reescrita em streaming — uma chave derivada do conteúdo mudaria a cada
  // fragmento e remontava a bolha a meio da resposta.
  const chatMessages = useMemo<ChatMessage[]>(
    () =>
      messages.map((message, index) => ({
        id: `otto-${index}`,
        sender: message.role,
        content: message.content,
      })),
    [messages],
  );

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <ChatMessages
      className={className}
      messages={chatMessages}
      isThinking={isLoading}
      onSend={(content) => sendMessage(content)}
      placeholder="Pergunta ao Otto..."
      emptyState={
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-600">
            <Bot className="size-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {firstName ? `Olá, ${firstName}.` : 'Olá.'}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Pergunte sobre leads, vendas, clientes ou o financeiro da sua empresa.
            </p>
          </div>
        </div>
      }
    />
  );
}

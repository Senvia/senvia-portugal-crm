import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Clock, ArrowRight } from "lucide-react";
import { useWhatsappChannel } from "@/hooks/useMessagingChannels";
import { useInboxConversations, countUnreadConversations } from "@/hooks/useChatwootInbox";

// "à espera 5m / 2h / 3d"
function waitingFor(since: number | null): string {
  if (!since) return "";
  const mins = Math.floor((Date.now() - since * 1000) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Dashboard widget: WhatsApp inbox health at a glance — who is waiting on a
// reply and for how long. Renders nothing when WhatsApp isn't connected.
export function InboxAlertsWidget() {
  const { channel } = useWhatsappChannel();
  const connected = channel?.status === "connected";
  const { data: conversations = [] } = useInboxConversations(connected);

  const { unread, waiting } = useMemo(() => {
    const active = conversations.filter(
      (c) => c.status !== "resolved" && c.contact_name !== "EvolutionAPI",
    );
    return {
      unread: countUnreadConversations(conversations),
      waiting: active
        .filter((c) => !!c.waiting_since)
        .sort((a, b) => (a.waiting_since ?? 0) - (b.waiting_since ?? 0)),
    };
  }, [conversations]);

  if (!connected) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Caixa de Entrada
          </span>
          <Link to="/inbox" className="flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground">
            Abrir <ArrowRight className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold">{unread}</p>
            <p className="text-xs text-muted-foreground">Conversas por ler</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className={waiting.length > 0 ? "text-2xl font-bold text-amber-600" : "text-2xl font-bold"}>
              {waiting.length}
            </p>
            <p className="text-xs text-muted-foreground">À espera de resposta</p>
          </div>
        </div>
        {waiting.length > 0 ? (
          <div className="space-y-1.5">
            {waiting.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                to="/inbox"
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span className="truncate">{c.contact_name}</span>
                <span className="ml-2 flex shrink-0 items-center gap-1 text-xs text-amber-600">
                  <Clock className="h-3 w-3" />
                  {waitingFor(c.waiting_since)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Ninguém à espera de resposta. 🎉</p>
        )}
      </CardContent>
    </Card>
  );
}

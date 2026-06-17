import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, ArrowRight } from "lucide-react";
import { useMessagingChannels } from "@/hooks/useMessagingChannels";
import { useInboxConversations, countUnreadConversations } from "@/hooks/useChatwootInbox";

// Dashboard widget: WhatsApp inbox health at a glance — how many conversations
// are unread and how many are waiting on a reply. MESSAGING ONLY: email caixas
// have their own client, so they're excluded from both counts. Renders nothing
// when WhatsApp isn't connected.
export function InboxAlertsWidget() {
  const { data: channels = [] } = useMessagingChannels();
  const whatsapp = channels.find((c) => c.channel_type === "whatsapp");
  const connected = whatsapp?.status === "connected";
  const { data: conversations = [] } = useInboxConversations(connected);

  // Chatwoot inbox ids that belong to EMAIL caixas — excluded from the counts.
  const emailInboxIds = useMemo(
    () => new Set(
      channels
        .filter((c) => c.channel_type === "email" && c.chatwoot_inbox_id != null)
        .map((c) => c.chatwoot_inbox_id as number),
    ),
    [channels],
  );

  const { unread, waitingCount } = useMemo(() => {
    const isEmail = (inboxId: number | null) => inboxId != null && emailInboxIds.has(inboxId);
    return {
      unread: countUnreadConversations(conversations, emailInboxIds),
      waitingCount: conversations.filter(
        (c) =>
          c.status !== "resolved" &&
          c.contact_name !== "EvolutionAPI" &&
          !isEmail(c.inbox_id) &&
          !!c.waiting_since,
      ).length,
    };
  }, [conversations, emailInboxIds]);

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
        <div className="grid grid-cols-2 gap-3">
          <Link to="/inbox" className="rounded-lg border p-3 transition-colors hover:bg-accent">
            <p className="text-2xl font-bold">{unread}</p>
            <p className="text-xs text-muted-foreground">Conversas por ler</p>
          </Link>
          <Link to="/inbox" className="rounded-lg border p-3 transition-colors hover:bg-accent">
            <p className={waitingCount > 0 ? "text-2xl font-bold text-amber-600" : "text-2xl font-bold"}>
              {waitingCount}
            </p>
            <p className="text-xs text-muted-foreground">À espera de resposta</p>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

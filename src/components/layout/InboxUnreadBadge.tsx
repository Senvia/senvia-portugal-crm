import { useEffect } from "react";
import { useMessagingChannels } from "@/hooks/useMessagingChannels";
import { useInboxUnreadTotal } from "@/hooks/useChatwootInbox";
import { useMetaUnreadTotals } from "@/hooks/useMetaInbox";
import { cn } from "@/lib/utils";

// Unread messages badge for the nav. Mounted globally (sidebar/bottom
// nav), it also keeps the document title in sync — "(3) Senvia OS" — so the
// browser tab shows new messages even when the user is on another page.
export function InboxUnreadBadge({ className }: { className?: string }) {
  const { data: channels = [] } = useMessagingChannels();
  // Mesma regra do channelConfigured da Caixa de Entrada: qualquer caixa ligada
  // conta. Deixou de haver um canal de WhatsApp para consultar à parte.
  const connected = channels.some((c) => c.status === "connected");
  const { total: totalChatwoot } = useInboxUnreadTotal(connected);
  // O Instagram e o Messenger não passam pelo Chatwoot: o contador deles vem das
  // nossas tabelas. Sem esta parcela, chegava uma DM e nada no CRM o dizia — nem
  // o menu, nem o título do separador. Só abrindo a caixa.
  const { data: metaUnread } = useMetaUnreadTotals();
  const totalMeta = Object.values(metaUnread ?? {}).reduce((s, n) => s + n, 0);
  const total = totalChatwoot + totalMeta;

  useEffect(() => {
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
    // Unmounting with unreads (e.g. switching to an org without inbox) must not
    // leave a stale "(3)" stuck in the tab title.
    return () => {
      document.title = document.title.replace(/^\(\d+\)\s*/, "");
    };
  }, [total]);

  if (total <= 0) return null;
  return (
    <span
      className={cn(
        "flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-semibold text-white",
        className,
      )}
    >
      {total > 99 ? "99+" : total}
    </span>
  );
}

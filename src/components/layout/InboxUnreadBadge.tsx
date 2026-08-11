import { useEffect } from "react";
import { useMessagingChannels } from "@/hooks/useMessagingChannels";
import { useInboxUnreadTotal } from "@/hooks/useChatwootInbox";
import { cn } from "@/lib/utils";

// Unread messages badge for the nav. Mounted globally (sidebar/bottom
// nav), it also keeps the document title in sync — "(3) Senvia OS" — so the
// browser tab shows new messages even when the user is on another page.
export function InboxUnreadBadge({ className }: { className?: string }) {
  const { data: channels = [] } = useMessagingChannels();
  // Mesma regra do channelConfigured da Caixa de Entrada: qualquer caixa ligada
  // conta. Deixou de haver um canal de WhatsApp para consultar à parte.
  const connected = channels.some((c) => c.status === "connected");
  const { total } = useInboxUnreadTotal(connected);

  useEffect(() => {
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
    // Unmounting with unreads (e.g. switching to an org without inbox) must not
    // leave a stale "(3)" stuck in the tab title.
    return () => {
      document.title = document.title.replace(/^\(\d+\)\s*/, "");
    };
  }, [total]);

  if (!connected || total <= 0) return null;
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

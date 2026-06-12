import { useEffect } from "react";
import { useWhatsappChannel } from "@/hooks/useMessagingChannels";
import { useInboxUnreadTotal } from "@/hooks/useChatwootInbox";
import { cn } from "@/lib/utils";

// Unread WhatsApp messages badge for the nav. Mounted globally (sidebar/bottom
// nav), it also keeps the document title in sync — "(3) Senvia OS" — so the
// browser tab shows new messages even when the user is on another page.
export function InboxUnreadBadge({ className }: { className?: string }) {
  const { channel } = useWhatsappChannel();
  const connected = channel?.status === "connected";
  const { total } = useInboxUnreadTotal(connected);

  useEffect(() => {
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
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

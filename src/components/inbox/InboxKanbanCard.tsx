import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { InboxConversation } from "@/hooks/inbox";
import { ContactAvatar } from "./ContactAvatar";
import { ChannelBadge } from "./ChannelBadge";
import { ListStatusTicks } from "./StatusTicks";
import {
  firstName,
  formatListDate,
  waitingLabel,
  translateActivity,
} from "./helpers";
import { renderWhatsAppFormatting } from "./MessageBubble";

interface InboxKanbanCardProps {
  conversation: InboxConversation;
  isDragging: boolean;
  onClick: (id: number) => void;
}

export const InboxKanbanCard = memo(function InboxKanbanCard({
  conversation,
  isDragging,
  onClick,
}: InboxKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: `conv-${conversation.id}` });

  const dragging = isDragging || isSortableDragging;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const waiting = waitingLabel(conversation.waiting_since);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only select on click, not on drag
        if (!dragging) {
          e.stopPropagation();
          onClick(conversation.id);
        }
      }}
      className={cn(
        "group relative cursor-grab rounded-lg border bg-card p-2.5 shadow-sm transition-shadow active:cursor-grabbing",
        "hover:shadow-md hover:border-primary/30",
        dragging && "opacity-50 shadow-lg ring-2 ring-primary/40 scale-[1.02] z-10",
      )}
    >
      {/* Top row: avatar + name + time */}
      <div className="flex items-start gap-2">
        <div className="relative shrink-0">
          <ContactAvatar
            name={conversation.contact_name}
            src={conversation.contact_thumbnail}
            className="h-8 w-8"
          />
          <ChannelBadge channel={conversation.channel} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p
              className={cn(
                "truncate text-xs",
                conversation.unread_count > 0
                  ? "font-bold text-foreground"
                  : "font-medium text-foreground/90",
              )}
            >
              {conversation.contact_name}
            </p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatListDate(conversation.updated_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Message preview */}
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        {conversation.last_outgoing && (
          <ListStatusTicks status={conversation.last_status} />
        )}
        <span className="min-w-0 flex-1 truncate">
          {conversation.last_message
            ? renderWhatsAppFormatting(
                translateActivity(conversation.last_message),
              )
            : "—"}
        </span>
      </p>

      {/* Bottom row: assignee + waiting + unread badge */}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1">
          {conversation.assigned_name && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
              {firstName(conversation.assigned_name)}
            </span>
          )}
          {waiting && conversation.status !== "resolved" && (
            <span className="shrink-0 text-[9px] text-amber-600 dark:text-amber-400">
              à espera {waiting}
            </span>
          )}
        </div>
        {conversation.unread_count > 0 && (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-green-600 px-1 text-[9px] font-semibold text-white">
            {conversation.unread_count}
          </span>
        )}
      </div>
    </div>
  );
});

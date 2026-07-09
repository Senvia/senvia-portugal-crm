import { forwardRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { InboxConversation } from "@/hooks/inbox";
import { InboxKanbanCard } from "./InboxKanbanCard";

interface InboxKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  conversations: InboxConversation[];
  activeId: string | null;
  onSelect: (id: number) => void;
}

export const InboxKanbanColumn = forwardRef<
  HTMLDivElement,
  InboxKanbanColumnProps
>(function InboxKanbanColumn(
  { id, title, color, conversations, activeId, onSelect },
  ref,
) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id });

  // Merge refs: droppable + forwarded
  const setRefs = (node: HTMLDivElement | null) => {
    setDroppableRef(node);
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return (
    <div
      ref={setRefs}
      className={cn(
        "flex h-full min-w-[260px] max-w-[320px] flex-col rounded-xl border bg-muted/30",
        isOver && "border-2 ring-2 ring-primary/20",
      )}
      style={{
        borderColor: isOver ? color : undefined,
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between gap-2 rounded-t-xl px-3 py-2"
        style={{
          backgroundColor: color + "20",
          borderBottom: `2px solid ${color}40`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <span
          className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {conversations.length}
        </span>
      </div>

      {/* Cards container — scrollable */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-[11px] text-muted-foreground/50">
            Vazio
          </div>
        ) : (
          <SortableContext
            items={conversations.map((c) => `conv-${c.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {conversations.map((conv) => (
              <InboxKanbanCard
                key={conv.id}
                conversation={conv}
                isDragging={activeId === `conv-${conv.id}`}
                onClick={onSelect}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
});

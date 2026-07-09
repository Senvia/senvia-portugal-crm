import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { InboxConversation } from "@/hooks/inbox";
import { InboxKanbanColumn } from "./InboxKanbanColumn";
import { InboxKanbanCard } from "./InboxKanbanCard";

// ---- Column definitions ----

interface ColumnDef {
  id: string;
  title: string;
  color: string;
}

const COLUMNS: ColumnDef[] = [
  { id: "novo", title: "Novo", color: "#6B7280" },
  { id: "atendimento", title: "Em Atendimento", color: "#3B82F6" },
  { id: "aguarda", title: "Aguarda Resposta", color: "#F59E0B" },
  { id: "resolvido", title: "Resolvido", color: "#10B981" },
];

// ---- Classification logic ----

function classifyConversation(conv: InboxConversation): string {
  // Resolvido
  if (conv.status === "resolved") return "resolvido";

  // Aguarda Resposta: pending status, or open with waiting_since
  if (conv.status === "pending") return "aguarda";
  if (conv.status === "open" && conv.waiting_since) return "aguarda";

  // Novo: open without outbound reply
  if (conv.status === "open" && !conv.last_outgoing) return "novo";

  // Em Atendimento: open with outbound reply
  if (conv.status === "open" && conv.last_outgoing) return "atendimento";

  // Fallback: anything else → novo
  return "novo";
}

// ---- Props ----

interface InboxKanbanViewProps {
  conversations: InboxConversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onStatusChange: (conversationId: number, newStatus: string) => void;
}

// Map column id → Chatwoot status for onStatusChange
const COLUMN_TO_STATUS: Record<string, string> = {
  novo: "open",
  atendimento: "open",
  aguarda: "pending",
  resolvido: "resolved",
};

export function InboxKanbanView({
  conversations,
  selectedId,
  onSelect,
  onStatusChange,
}: InboxKanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // Group conversations by column
  const grouped = useMemo(() => {
    const map: Record<string, InboxConversation[]> = {
      novo: [],
      atendimento: [],
      aguarda: [],
      resolvido: [],
    };
    for (const conv of conversations) {
      const col = classifyConversation(conv);
      map[col].push(conv);
    }
    return map;
  }, [conversations]);

  // Find the active conversation for DragOverlay
  const activeConversation = useMemo(() => {
    if (!activeId) return null;
    const convId = Number(activeId.replace("conv-", ""));
    return conversations.find((c) => c.id === convId) ?? null;
  }, [activeId, conversations]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = e;
      if (!over) return;

      const activeConvId = Number(String(active.id).replace("conv-", ""));
      const targetColumnId = String(over.id);

      // If dropped on a column (not another card)
      if (COLUMNS.some((c) => c.id === targetColumnId)) {
        const newStatus = COLUMN_TO_STATUS[targetColumnId];
        const conv = conversations.find((c) => c.id === activeConvId);
        if (conv && newStatus) {
          // Only fire if status actually changes
          const currentCol = classifyConversation(conv);
          if (currentCol !== targetColumnId) {
            onStatusChange(activeConvId, newStatus);
          }
        }
        return;
      }

      // If dropped on a card, find which column that card belongs to
      const targetConvId = Number(targetColumnId.replace("conv-", ""));
      const targetConv = conversations.find((c) => c.id === targetConvId);
      if (targetConv) {
        const targetCol = classifyConversation(targetConv);
        const newStatus = COLUMN_TO_STATUS[targetCol];
        const conv = conversations.find((c) => c.id === activeConvId);
        if (conv && newStatus) {
          const currentCol = classifyConversation(conv);
          if (currentCol !== targetCol) {
            onStatusChange(activeConvId, newStatus);
          }
        }
      }
    },
    [conversations, onStatusChange],
  );

  return (
    <div className="flex h-full overflow-x-auto overflow-y-hidden">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex h-full gap-3 p-3">
          {COLUMNS.map((col) => {
            const items = grouped[col.id] ?? [];
            return (
              <InboxKanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                color={col.color}
                conversations={items}
                activeId={activeId}
                onSelect={onSelect}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeConversation ? (
            <div className="w-[280px] rotate-3 opacity-90">
              <InboxKanbanCard
                conversation={activeConversation}
                isDragging
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

import { useState } from "react";
import { Lead, LeadStatus, STATUS_LABELS } from "@/types";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onViewDetails: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

const columns: LeadStatus[] = ['new', 'conversation', 'scheduled', 'sold', 'lost'];

const columnColors: Record<LeadStatus, string> = {
  new: "border-t-primary",
  conversation: "border-t-[hsl(280,84%,60%)]",
  scheduled: "border-t-warning",
  sold: "border-t-success",
  lost: "border-t-muted-foreground",
};

const columnBadgeColors: Record<LeadStatus, string> = {
  new: "bg-primary/10 text-primary",
  conversation: "bg-[hsl(280,84%,60%)]/10 text-[hsl(280,84%,50%)]",
  scheduled: "bg-warning/10 text-warning",
  sold: "bg-success/10 text-success",
  lost: "bg-muted text-muted-foreground",
};

export function KanbanBoard({ leads, onStatusChange, onViewDetails, onDelete }: KanbanBoardProps) {
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);

  const getLeadsByStatus = (status: LeadStatus) => 
    leads.filter(lead => lead.status === status);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    if (draggedLead) {
      onStatusChange(draggedLead, status);
    }
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status) => {
        const columnLeads = getLeadsByStatus(status);
        const isOver = dragOverColumn === status;

        return (
          <div
            key={status}
            className={cn(
              "flex w-80 min-w-[320px] flex-col rounded-xl border-t-4 bg-muted/30",
              columnColors[status],
              isOver && "bg-primary/5"
            )}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">
                  {STATUS_LABELS[status]}
                </h3>
                <span className={cn(
                  "flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-medium",
                  columnBadgeColors[status]
                )}>
                  {columnLeads.length}
                </span>
              </div>
            </div>

            {/* Cards Container */}
            <div className="flex-1 space-y-3 px-3 pb-3">
              {columnLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  className="animate-fade-in"
                >
                  <LeadCard
                    lead={lead}
                    onStatusChange={onStatusChange}
                    onViewDetails={onViewDetails}
                    onDelete={onDelete}
                    isDragging={draggedLead === lead.id}
                  />
                </div>
              ))}

              {columnLeads.length === 0 && (
                <div className={cn(
                  "flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground",
                  isOver && "border-primary bg-primary/5"
                )}>
                  {isOver ? "Largar aqui" : "Sem leads"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

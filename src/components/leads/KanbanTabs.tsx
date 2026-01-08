import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LeadCard } from "./LeadCard";
import { Lead, LeadStatus, LeadTemperature, KANBAN_COLUMNS, STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface KanbanTabsProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onTemperatureChange: (leadId: string, newTemperature: LeadTemperature) => void;
  onViewDetails: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

const badgeColors: Record<LeadStatus, string> = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-yellow-500/20 text-yellow-400",
  scheduled: "bg-purple-500/20 text-purple-400",
  won: "bg-green-500/20 text-green-400",
  lost: "bg-red-500/20 text-red-400",
};

const statusDotColors: Record<LeadStatus, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  scheduled: "bg-purple-500",
  won: "bg-green-500",
  lost: "bg-red-500",
};

export function KanbanTabs({
  leads,
  onStatusChange,
  onTemperatureChange,
  onViewDetails,
  onDelete,
}: KanbanTabsProps) {
  const [activeStatus, setActiveStatus] = useState<LeadStatus>("new");

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((lead) => lead.status === status);
  };

  const filteredLeads = getLeadsByStatus(activeStatus);

  return (
    <div className="w-full space-y-4">
      {/* Status Selector */}
      <Select value={activeStatus} onValueChange={(v) => setActiveStatus(v as LeadStatus)}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", statusDotColors[activeStatus])} />
            <SelectValue />
            <Badge variant="secondary" className={cn("ml-auto", badgeColors[activeStatus])}>
              {getLeadsByStatus(activeStatus).length}
            </Badge>
          </div>
        </SelectTrigger>
        <SelectContent>
          {KANBAN_COLUMNS.map((status) => {
            const count = getLeadsByStatus(status).length;
            return (
              <SelectItem key={status} value={status}>
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", statusDotColors[status])} />
                  <span>{STATUS_LABELS[status]}</span>
                  <Badge variant="secondary" className={cn("ml-2", badgeColors[status])}>
                    {count}
                  </Badge>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Leads List */}
      <div className="space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Sem leads nesta fase</p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onTemperatureChange={(temp: LeadTemperature) => onTemperatureChange(lead.id, temp)}
              onViewDetails={() => onViewDetails(lead)}
              onDelete={() => onDelete(lead.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

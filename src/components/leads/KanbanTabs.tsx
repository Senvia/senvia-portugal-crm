import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LeadCard } from "./LeadCard";
import { Lead, LeadStatus, LeadTemperature, KANBAN_COLUMNS, STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface KanbanTabsProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onTemperatureChange: (leadId: string, newTemperature: LeadTemperature) => void;
  onViewDetails: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

const tabColors: Record<LeadStatus, string> = {
  new: "data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400",
  contacted: "data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400",
  scheduled: "data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400",
  won: "data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400",
  lost: "data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400",
};

const badgeColors: Record<LeadStatus, string> = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-yellow-500/20 text-yellow-400",
  scheduled: "bg-purple-500/20 text-purple-400",
  won: "bg-green-500/20 text-green-400",
  lost: "bg-red-500/20 text-red-400",
};

export function KanbanTabs({
  leads,
  onStatusChange,
  onTemperatureChange,
  onViewDetails,
  onDelete,
}: KanbanTabsProps) {
  const [activeTab, setActiveTab] = useState<LeadStatus>("new");

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((lead) => lead.status === status);
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeadStatus)} className="w-full">
      <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-xl overflow-x-auto flex justify-start gap-1 no-scrollbar">
        {KANBAN_COLUMNS.map((status) => {
          const count = getLeadsByStatus(status).length;
          return (
            <TabsTrigger
              key={status}
              value={status}
              className={cn(
                "flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                "data-[state=inactive]:text-muted-foreground",
                tabColors[status]
              )}
            >
              <span className="truncate max-w-[60px]">{STATUS_LABELS[status]}</span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "ml-1.5 h-5 min-w-[20px] text-[10px]",
                  activeTab === status ? badgeColors[status] : ""
                )}
              >
                {count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {KANBAN_COLUMNS.map((status) => (
        <TabsContent key={status} value={status} className="mt-4 space-y-3">
          {getLeadsByStatus(status).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Sem leads nesta fase</p>
            </div>
          ) : (
            getLeadsByStatus(status).map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onTemperatureChange={(temp: LeadTemperature) => onTemperatureChange(lead.id, temp)}
                onViewDetails={() => onViewDetails(lead)}
                onDelete={() => onDelete(lead.id)}
              />
            ))
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

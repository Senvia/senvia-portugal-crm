import { useIsMobile } from "@/hooks/use-mobile";
import { KanbanBoard } from "./KanbanBoard";
import { KanbanTabs } from "./KanbanTabs";
import { Lead, LeadStatus, LeadTemperature } from "@/types";

interface ResponsiveKanbanProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onTemperatureChange: (leadId: string, newTemperature: LeadTemperature) => void;
  onViewDetails: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

export function ResponsiveKanban(props: ResponsiveKanbanProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <KanbanTabs {...props} />;
  }

  return <KanbanBoard {...props} />;
}

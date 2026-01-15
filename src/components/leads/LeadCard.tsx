import { Lead, STATUS_LABELS, LeadStatus, LeadTemperature, TEMPERATURE_LABELS, TEMPERATURE_STYLES } from "@/types";
import { formatRelativeTime, getWhatsAppUrl, formatCurrency } from "@/lib/format";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, Mail, MoreVertical, GripVertical, Thermometer, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string;
  event_type: string;
}

interface LeadCardProps {
  lead: Lead;
  upcomingEvent?: UpcomingEvent | null;
  onStatusChange?: (leadId: string, newStatus: LeadStatus) => void;
  onTemperatureChange?: (leadId: string, temperature: LeadTemperature) => void;
  onViewDetails?: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
  isDragging?: boolean;
}

const statusStyles: Record<LeadStatus, string> = {
  new: "status-new",
  contacted: "status-contacted",
  scheduled: "status-scheduled",
  proposal: "status-proposal",
  won: "status-won",
  lost: "status-lost",
};

export function LeadCard({ 
  lead, 
  upcomingEvent,
  onStatusChange, 
  onTemperatureChange,
  onViewDetails, 
  onDelete,
  isDragging 
}: LeadCardProps) {
  const { canDeleteLeads } = usePermissions();
  const temperature = lead.temperature || 'cold';
  const tempStyle = TEMPERATURE_STYLES[temperature];
  
  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const time = date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return `Hoje às ${time}`;
    if (isTomorrow) return `Amanhã às ${time}`;
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ` às ${time}`;
  };

  const isEventPast = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };
  
  return (
    <div 
      className={cn(
        "group rounded-lg border bg-card p-4 shadow-card transition-all duration-200",
        "hover:shadow-card-hover cursor-pointer",
        isDragging && "rotate-2 scale-105 shadow-lg"
      )}
      onClick={() => onViewDetails?.(lead)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {lead.name.charAt(0).toUpperCase()}
          </div>
          {/* Temperature Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-7 px-2 gap-1.5", tempStyle.color)}
              >
                <Thermometer className="h-4 w-4" />
                <span className="text-xs font-medium">{TEMPERATURE_LABELS[temperature]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              {(Object.keys(TEMPERATURE_LABELS) as LeadTemperature[]).map((temp) => (
                <DropdownMenuItem 
                  key={temp}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onTemperatureChange?.(lead.id, temp); 
                  }}
                  disabled={temperature === temp}
                >
                  <span className="mr-2">{TEMPERATURE_STYLES[temp].emoji}</span>
                  {TEMPERATURE_LABELS[temp]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" className="opacity-0 transition-opacity group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails?.(lead); }}>
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <DropdownMenuItem 
                key={status}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onStatusChange?.(lead.id, status as LeadStatus); 
                }}
                disabled={lead.status === status}
              >
                Mover para {label}
              </DropdownMenuItem>
            ))}
            {canDeleteLeads && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(lead.id); }}
                >
                  Eliminar lead
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Upcoming Event Badge */}
      {upcomingEvent && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className={cn(
                  "mt-3 w-full justify-start gap-1.5",
                  isEventPast(upcomingEvent.start_time)
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="truncate text-xs">
                  {formatEventTime(upcomingEvent.start_time)}
                  {isEventPast(upcomingEvent.start_time) && " (passou)"}
                </span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{upcomingEvent.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatEventTime(upcomingEvent.start_time)}
                {isEventPast(upcomingEvent.start_time) && " - Evento passado"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Content */}
      <div className="mt-3">
        <h4 className="font-semibold text-card-foreground">{lead.name}</h4>
        {lead.value && (
          <p className="mt-1 text-lg font-bold text-primary">
            {formatCurrency(lead.value)}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {formatRelativeTime(lead.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="whatsapp"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            window.open(getWhatsAppUrl(lead.phone), '_blank');
          }}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `tel:${lead.phone}`;
          }}
        >
          <Phone className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `mailto:${lead.email}`;
          }}
        >
          <Mail className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

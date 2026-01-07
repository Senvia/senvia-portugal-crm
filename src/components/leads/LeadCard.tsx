import { Lead, STATUS_LABELS, LeadStatus } from "@/types";
import { formatRelativeTime, getWhatsAppUrl, formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Mail, MoreVertical, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LeadCardProps {
  lead: Lead;
  onStatusChange?: (leadId: string, newStatus: LeadStatus) => void;
  onViewDetails?: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
  isDragging?: boolean;
}

const statusStyles: Record<LeadStatus, string> = {
  new: "status-new",
  contacted: "status-contacted",
  scheduled: "status-scheduled",
  won: "status-won",
  lost: "status-lost",
};

export function LeadCard({ 
  lead, 
  onStatusChange, 
  onViewDetails, 
  onDelete,
  isDragging 
}: LeadCardProps) {
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
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete?.(lead.id); }}
            >
              Eliminar lead
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

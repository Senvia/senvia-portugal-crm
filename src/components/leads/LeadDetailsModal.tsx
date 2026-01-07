import { Lead, STATUS_LABELS, LeadStatus } from "@/types";
import { formatDate, formatDateTime, formatCurrency, getWhatsAppUrl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Calendar, 
  Shield,
  Trash2,
  ExternalLink
} from "lucide-react";
import { useState } from "react";

interface LeadDetailsModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onDelete: (leadId: string) => void;
}

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-primary/10 text-primary border-primary/20",
  contacted: "bg-[hsl(280,84%,60%)]/10 text-[hsl(280,84%,50%)] border-[hsl(280,84%,60%)]/20",
  scheduled: "bg-warning/10 text-warning border-warning/20",
  won: "bg-success/10 text-success border-success/20",
  lost: "bg-muted text-muted-foreground border-muted",
};

export function LeadDetailsModal({ 
  lead, 
  open, 
  onOpenChange, 
  onStatusChange,
  onDelete 
}: LeadDetailsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!lead) return null;

  const handleDelete = () => {
    onDelete(lead.id);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{lead.name}</DialogTitle>
              <DialogDescription className="mt-1">
                Lead criada em {formatDate(lead.created_at)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Estado</span>
            <Select
              value={lead.status}
              onValueChange={(value) => onStatusChange(lead.id, value as LeadStatus)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          {lead.value && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Valor</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(lead.value)}
              </span>
            </div>
          )}

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Informações de Contacto</h4>
            
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{lead.phone}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{lead.email}</span>
            </div>

            {lead.source && (
              <div className="flex items-center gap-3 text-sm">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <span>Origem: {lead.source}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Criada: {formatDateTime(lead.created_at)}</span>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Notas</h4>
                <p className="text-sm text-muted-foreground">{lead.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* GDPR Consent */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <Shield className={lead.gdpr_consent ? "h-5 w-5 text-success" : "h-5 w-5 text-destructive"} />
            <span className="text-sm">
              {lead.gdpr_consent 
                ? "Consentimento RGPD obtido" 
                : "Sem consentimento RGPD"
              }
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="whatsapp"
              className="flex-1"
              onClick={() => window.open(getWhatsAppUrl(lead.phone), '_blank')}
            >
              <MessageCircle className="h-4 w-4" />
              Enviar WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = `tel:${lead.phone}`}
            >
              <Phone className="h-4 w-4" />
              Ligar
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {/* GDPR: Right to Erasure */}
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="h-4 w-4" />
                Eliminar Lead (RGPD)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar eliminação</AlertDialogTitle>
                <AlertDialogDescription>
                  Está prestes a eliminar permanentemente esta lead e todos os dados associados, 
                  em conformidade com o Direito ao Esquecimento do RGPD. Esta ação não pode ser revertida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Eliminar permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

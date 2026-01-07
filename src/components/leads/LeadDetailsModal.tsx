import { Lead, STATUS_LABELS, LeadStatus } from "@/types";
import { formatDate, formatDateTime, getWhatsAppUrl } from "@/lib/format";
import { usePermissions } from "@/hooks/usePermissions";

// Formata número com espaços nos milhares (estilo PT)
const formatNumberWithSpaces = (value: string | number): string => {
  const num = String(value).replace(/\s/g, '').replace(/[^\d]/g, '');
  if (!num) return '';
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Remove espaços para obter o valor numérico
const parseFormattedNumber = (value: string): number | null => {
  const cleaned = value.replace(/\s/g, '');
  return cleaned ? parseFloat(cleaned) : null;
};
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Calendar, 
  Shield,
  Trash2,
  ExternalLink,
  Euro,
  FileText
} from "lucide-react";
import { useState, useEffect } from "react";

interface LeadDetailsModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onDelete: (leadId: string) => void;
  onUpdate?: (leadId: string, updates: Partial<Lead>) => void;
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
  onDelete,
  onUpdate
}: LeadDetailsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { canDeleteLeads } = usePermissions();
  
  // Editable fields state
  const [editValue, setEditValue] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  // Sync state when lead changes
  useEffect(() => {
    if (lead) {
      setEditValue(lead.value ? formatNumberWithSpaces(lead.value) : "");
      setEditNotes(lead.notes || "");
    }
  }, [lead]);

  if (!lead) return null;

  const handleFieldSave = (field: keyof Lead, value: string | number | null) => {
    if (!onUpdate) return;
    onUpdate(lead.id, { [field]: value });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithSpaces(e.target.value);
    setEditValue(formatted);
  };

  const handleValueBlur = () => {
    const numValue = parseFormattedNumber(editValue);
    if (numValue !== lead.value) {
      handleFieldSave("value", numValue);
    }
  };

  const handleNotesBlur = () => {
    if (editNotes !== (lead.notes || "")) {
      handleFieldSave("notes", editNotes || null);
    }
  };


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

          {/* Editable Value */}
          <div className="space-y-2">
            <Label htmlFor="lead-value" className="flex items-center gap-2 text-sm font-medium">
              <Euro className="h-4 w-4 text-muted-foreground" />
              Valor do Negócio
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="lead-value"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={editValue}
                onChange={handleValueChange}
                onBlur={handleValueBlur}
                className="pl-8"
              />
            </div>
          </div>

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

            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Criada: {formatDateTime(lead.created_at)}</span>
            </div>
          </div>

          <Separator />

          {/* Source (Read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              Origem do Lead
            </Label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm">
              {lead.source || 'Não identificada'}
            </div>
          </div>

          <Separator />

          {/* Editable Notes */}
          <div className="space-y-2">
            <Label htmlFor="lead-notes" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Observações Internas
            </Label>
            <Textarea
              id="lead-notes"
              placeholder="Notas sobre este lead..."
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              onBlur={handleNotesBlur}
              className="resize-none"
            />
          </div>

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

        {canDeleteLeads && (
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
        )}
      </DialogContent>
    </Dialog>
  );
}

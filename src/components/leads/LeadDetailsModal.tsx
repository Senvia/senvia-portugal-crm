import { Lead, STATUS_LABELS, LeadStatus, LeadTemperature, TEMPERATURE_LABELS, TEMPERATURE_STYLES, FormSettings, CustomField, ROLE_LABELS } from "@/types";
import { formatDate, formatDateTime, getWhatsAppUrl } from "@/lib/format";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMembers } from "@/hooks/useTeam";

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
  FileText,
  Thermometer,
  ClipboardList,
  Target,
  UserCircle
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

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
  proposal: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
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
  const { canDeleteLeads, canManageTeam } = usePermissions();
  const { organization } = useAuth();
  const { data: teamMembers } = useTeamMembers();
  
  // Editable fields state
  const [editValue, setEditValue] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // Get form settings for custom field labels
  const formSettings = organization?.form_settings as FormSettings | undefined;
  const customFields = formSettings?.custom_fields || [];

  // Parse custom_data and map to labels
  const customDataEntries = useMemo(() => {
    if (!lead?.custom_data || typeof lead.custom_data !== 'object') return [];
    
    const entries: { label: string; value: string; isUtm: boolean }[] = [];
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    
    Object.entries(lead.custom_data).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      
      // Check if it's a UTM param
      const isUtm = utmKeys.includes(key);
      
      // Find the label for this field
      let label = key;
      if (!isUtm) {
        // Try to find by ID first
        const fieldById = customFields.find((f: CustomField) => f.id === key);
        if (fieldById) {
          label = fieldById.label;
        } else {
          // Try to find by label (for backwards compatibility)
          const fieldByLabel = customFields.find((f: CustomField) => f.label === key);
          if (fieldByLabel) {
            label = fieldByLabel.label;
          } else {
            // Clean up the key for display
            label = key.replace(/_/g, ' ').replace(/^(.)/, (m) => m.toUpperCase());
          }
        }
      } else {
        // Format UTM labels
        label = key.replace('utm_', 'UTM ').replace(/^(.)/, (m) => m.toUpperCase());
      }
      
      // Format the value
      let displayValue = String(value);
      if (typeof value === 'boolean') {
        displayValue = value ? 'Sim' : 'Não';
      } else if (Array.isArray(value)) {
        displayValue = value.join(', ');
      }
      
      entries.push({ label, value: displayValue, isUtm });
    });
    
    return entries;
  }, [lead?.custom_data, customFields]);

  const formResponses = customDataEntries.filter(e => !e.isUtm);
  const utmData = customDataEntries.filter(e => e.isUtm);

  // Sync state when lead changes (but not while editing)
  useEffect(() => {
    if (lead) {
      // Only sync value if not editing AND the database value actually changed
      if (!isEditingValue) {
        const currentNumValue = parseFormattedNumber(editValue);
        const leadNumValue = lead.value ? Number(lead.value) : null;
        
        // Only update if values are different (avoids resetting during mutation)
        if (currentNumValue !== leadNumValue) {
          setEditValue(lead.value ? formatNumberWithSpaces(lead.value) : "");
        }
      }
      if (!isEditingNotes) {
        setEditNotes(lead.notes || "");
      }
      if (!isEditingName) {
        setEditName(lead.name || "");
      }
      if (!isEditingEmail) {
        setEditEmail(lead.email || "");
      }
      if (!isEditingPhone) {
        setEditPhone(lead.phone || "");
      }
    }
  }, [lead, isEditingValue, isEditingNotes, isEditingName, isEditingEmail, isEditingPhone, editValue]);

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
    // Compare with type conversion to ensure consistent comparison
    const currentValue = lead.value ? Number(lead.value) : null;
    
    if (numValue !== currentValue) {
      handleFieldSave("value", numValue);
    }
    setIsEditingValue(false);
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle asChild>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onFocus={() => setIsEditingName(true)}
              onBlur={() => {
                if (editName.trim() && editName !== lead.name) {
                  handleFieldSave("name", editName.trim());
                } else if (!editName.trim()) {
                  setEditName(lead.name);
                }
                setIsEditingName(false);
              }}
              className="text-xl font-semibold border-transparent bg-transparent px-0 h-auto w-full focus-visible:ring-1 focus-visible:ring-primary hover:border-muted-foreground/30 transition-colors"
              placeholder="Nome do lead"
            />
          </DialogTitle>
          <DialogDescription>
            Lead criada em {formatDate(lead.created_at)}
          </DialogDescription>
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

          {/* Temperature */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Temperatura</span>
            <Select
              value={lead.temperature || 'cold'}
              onValueChange={(value) => onUpdate?.(lead.id, { temperature: value as LeadTemperature })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TEMPERATURE_LABELS) as LeadTemperature[]).map((temp) => (
                  <SelectItem key={temp} value={temp}>
                    <div className="flex items-center gap-2">
                      <Thermometer className={cn("h-4 w-4", TEMPERATURE_STYLES[temp].color)} />
                      <span>{TEMPERATURE_STYLES[temp].emoji}</span>
                      {TEMPERATURE_LABELS[temp]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned To - Only visible to admins */}
          {canManageTeam && teamMembers && teamMembers.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Atribuído a
              </span>
              <Select
                value={lead.assigned_to || 'unassigned'}
                onValueChange={(value) => onUpdate?.(lead.id, { assigned_to: value === 'unassigned' ? null : value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Não atribuído" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <span className="text-muted-foreground">Não atribuído</span>
                  </SelectItem>
                  {teamMembers
                    .filter(m => !m.is_banned && (m.role === 'salesperson' || m.role === 'admin' || m.role === 'viewer'))
                    .map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name} ({ROLE_LABELS[member.role] || member.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                onFocus={() => setIsEditingValue(true)}
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
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                onFocus={() => setIsEditingPhone(true)}
                onBlur={() => {
                  if (editPhone !== lead.phone) {
                    handleFieldSave("phone", editPhone);
                  }
                  setIsEditingPhone(false);
                }}
                className="h-8 text-sm border-transparent bg-transparent px-2 focus-visible:ring-1 focus-visible:ring-primary hover:border-muted-foreground/30 transition-colors"
                placeholder="Telefone"
              />
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                onFocus={() => setIsEditingEmail(true)}
                onBlur={() => {
                  if (editEmail !== lead.email) {
                    handleFieldSave("email", editEmail);
                  }
                  setIsEditingEmail(false);
                }}
                className="h-8 text-sm border-transparent bg-transparent px-2 focus-visible:ring-1 focus-visible:ring-primary hover:border-muted-foreground/30 transition-colors"
                placeholder="Email"
              />
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Criada: {formatDateTime(lead.created_at)}</span>
            </div>
          </div>

        {/* Form Responses Section */}
        {formResponses.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Respostas do Formulário
              </h4>
              <div className="space-y-2">
                {formResponses.map((entry, index) => (
                  <div key={index} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">{entry.label}</p>
                    <p className="text-sm text-foreground">{entry.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* UTM Data Section */}
        {utmData.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Dados de Campanha
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {utmData.map((entry, index) => (
                  <div key={index} className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">{entry.label}</p>
                    <p className="text-sm text-foreground">{entry.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

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
            onFocus={() => setIsEditingNotes(true)}
            onBlur={() => {
              handleNotesBlur();
              setIsEditingNotes(false);
            }}
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

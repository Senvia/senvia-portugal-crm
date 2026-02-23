import { Lead, STATUS_LABELS, LeadStatus, LeadTemperature, LeadTipologia, TEMPERATURE_LABELS, TEMPERATURE_STYLES, TIPOLOGIA_LABELS, TIPOLOGIA_STYLES, FormSettings, CustomField, ROLE_LABELS } from "@/types";
import { LeadAttachments } from "@/components/leads/LeadAttachments";
import { usePipelineStages } from "@/hooks/usePipelineStages";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  UserCircle,
  Zap,
  ArrowLeft
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
  const { data: stages } = usePipelineStages();
  // Editable fields state
  const [editValue, setEditValue] = useState<string>("");
  const [editConsumo, setEditConsumo] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [isEditingConsumo, setIsEditingConsumo] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  
  // Check if telecom template
  const isTelecom = organization?.niche === 'telecom';

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
      
      const isUtm = utmKeys.includes(key);
      
      let label = key;
      if (!isUtm) {
        const fieldById = customFields.find((f: CustomField) => f.id === key);
        if (fieldById) {
          label = fieldById.label;
        } else {
          const fieldByLabel = customFields.find((f: CustomField) => f.label === key);
          if (fieldByLabel) {
            label = fieldByLabel.label;
          } else {
            label = key.replace(/_/g, ' ').replace(/^(.)/, (m) => m.toUpperCase());
          }
        }
      } else {
        label = key.replace('utm_', 'UTM ').replace(/^(.)/, (m) => m.toUpperCase());
      }
      
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

  // Sync state when lead changes
  useEffect(() => {
    if (lead) {
      if (!isEditingValue) {
        const currentNumValue = parseFormattedNumber(editValue);
        const leadNumValue = lead.value ? Number(lead.value) : null;
        if (currentNumValue !== leadNumValue) {
          setEditValue(lead.value ? formatNumberWithSpaces(lead.value) : "");
        }
      }
      if (!isEditingConsumo) {
        const currentConsumo = parseFormattedNumber(editConsumo);
        const leadConsumo = lead.consumo_anual ? Number(lead.consumo_anual) : null;
        if (currentConsumo !== leadConsumo) {
          setEditConsumo(lead.consumo_anual ? formatNumberWithSpaces(lead.consumo_anual) : "");
        }
      }
      if (!isEditingNotes) setEditNotes(lead.notes || "");
      if (!isEditingName) setEditName(lead.name || "");
      if (!isEditingEmail) setEditEmail(lead.email || "");
      if (!isEditingPhone) setEditPhone(lead.phone || "");
    }
  }, [lead, isEditingValue, isEditingConsumo, isEditingNotes, isEditingName, isEditingEmail, isEditingPhone, editValue, editConsumo]);

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
    const currentValue = lead.value ? Number(lead.value) : null;
    if (numValue !== currentValue) {
      handleFieldSave("value", numValue);
    }
    setIsEditingValue(false);
  };

  const handleConsumoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithSpaces(e.target.value);
    setEditConsumo(formatted);
  };

  const handleConsumoBlur = () => {
    const numValue = parseFormattedNumber(editConsumo);
    const currentConsumo = lead.consumo_anual ? Number(lead.consumo_anual) : null;
    if (numValue !== currentConsumo) {
      handleFieldSave("consumo_anual" as keyof Lead, numValue);
    }
    setIsEditingConsumo(false);
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
      <DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0">
        {/* Fixed Header */}
        <div className="border-b bg-background px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
          <DialogHeader className="pr-8 mt-2">
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
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full px-4 py-6 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Left Column - Editable Data (3/5) */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Status / Temperature / Tipologia Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Estado & Classificação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Estado</span>
                      <Select
                        value={lead.status}
                        onValueChange={(value) => onStatusChange(lead.id, value as LeadStatus)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(stages && stages.length > 0 ? stages : Object.entries(STATUS_LABELS).map(([key, name]) => ({ key, name }))).map((stage) => (
                            <SelectItem key={stage.key} value={stage.key}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Temperature */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Temperatura</span>
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

                    {/* Tipologia - Only for Telecom */}
                    {isTelecom && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tipologia</span>
                        <Select
                          value={lead.tipologia || ''}
                          onValueChange={(value) => onUpdate?.(lead.id, { tipologia: value as LeadTipologia })}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Selecionar tipologia" />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(TIPOLOGIA_LABELS) as LeadTipologia[]).map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>
                                <div className="flex items-center gap-2">
                                  <span className={TIPOLOGIA_STYLES[tipo].color}>{TIPOLOGIA_STYLES[tipo].emoji}</span>
                                  {TIPOLOGIA_LABELS[tipo]}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assignment Card */}
                {canManageTeam && teamMembers && teamMembers.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <UserCircle className="h-4 w-4" />
                        Atribuição
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={lead.assigned_to || 'unassigned'}
                        onValueChange={(value) => onUpdate?.(lead.id, { assigned_to: value === 'unassigned' ? null : value })}
                      >
                        <SelectTrigger className="w-full">
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
                    </CardContent>
                  </Card>
                )}

                {/* Value / Consumo Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      {isTelecom ? <Zap className="h-4 w-4" /> : <Euro className="h-4 w-4" />}
                      {isTelecom ? 'Consumo Anual/kWp (kWh)' : 'Valor do Negócio'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isTelecom ? (
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={editConsumo}
                          onChange={handleConsumoChange}
                          onFocus={() => setIsEditingConsumo(true)}
                          onBlur={handleConsumoBlur}
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">kWh</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                        <Input
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
                    )}
                  </CardContent>
                </Card>

                {/* Notes Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Observações Internas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Notas sobre este lead..."
                      rows={4}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      onFocus={() => setIsEditingNotes(true)}
                      onBlur={() => {
                        handleNotesBlur();
                        setIsEditingNotes(false);
                      }}
                      className="resize-none"
                    />
                  </CardContent>
                </Card>

                {/* Attachments Card - Telecom only */}
                {isTelecom && lead.id && (
                  <Card>
                    <CardContent className="pt-6">
                      <LeadAttachments leadId={lead.id} />
                    </CardContent>
                  </Card>
                )}

                {/* Form Responses Card */}
                {formResponses.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Respostas do Formulário
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {formResponses.map((entry, index) => (
                        <div key={index} className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground mb-1">{entry.label}</p>
                          <p className="text-sm text-foreground">{entry.value}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* UTM Data Card */}
                {utmData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Dados de Campanha
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {utmData.map((entry, index) => (
                          <div key={index} className="rounded-lg bg-muted/50 p-2">
                            <p className="text-xs text-muted-foreground">{entry.label}</p>
                            <p className="text-sm text-foreground">{entry.value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Summary & Actions (2/5, sticky) */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-0 space-y-6">
                  
                  {/* Contact Info Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Informações de Contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* NIF Empresa */}
                      {lead.company_nif && (
                        <div className="flex items-center gap-3 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground">
                            NIF: <strong>{lead.company_nif}</strong>
                            {lead.company_name && <> — {lead.company_name}</>}
                          </span>
                        </div>
                      )}
                      
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

                      <div className="flex items-center gap-3 text-sm">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <span>Origem: {lead.source || 'Não identificada'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* GDPR */}
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                    <Shield className={lead.gdpr_consent ? "h-5 w-5 text-success" : "h-5 w-5 text-destructive"} />
                    <span className="text-sm">
                      {lead.gdpr_consent ? "Consentimento RGPD obtido" : "Sem consentimento RGPD"}
                    </span>
                  </div>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Ações Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button
                        variant="whatsapp"
                        className="w-full"
                        onClick={() => window.open(getWhatsAppUrl(lead.phone), '_blank')}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Enviar WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.location.href = `tel:${lead.phone}`}
                      >
                        <Phone className="h-4 w-4" />
                        Ligar
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Back Button */}
                  <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>

                  {/* Delete Action */}
                  {canDeleteLeads && (
                    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
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
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

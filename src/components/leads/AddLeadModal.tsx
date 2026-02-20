import { useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneInput } from "@/components/ui/phone-input";
import { Loader2, Zap, UserCircle, X, User, Upload, FileText, Trash2, Paperclip, Building2, Contact, Settings2, StickyNote, Eye } from "lucide-react";
import { useCreateLead } from "@/hooks/useLeads";
import { useTeamMembers } from "@/hooks/useTeam";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUploadLeadAttachment } from "@/hooks/useLeadAttachments";
import type { LeadTemperature, LeadTipologia } from "@/types";
import { ROLE_LABELS as RoleLabels, TIPOLOGIA_LABELS, TIPOLOGIA_STYLES } from "@/types";

const SOURCES = [
  "Entrada Manual",
  "Chamada Telefónica",
  "Evento/Networking",
  "Referência",
  "Website (orgânico)",
  "Redes Sociais",
  "Outro",
] as const;

const TEMPERATURE_LABELS: Record<string, { label: string; emoji: string }> = {
  cold: { label: "Frio", emoji: "🧊" },
  warm: { label: "Morno", emoji: "🌤️" },
  hot: { label: "Quente", emoji: "🔥" },
};

const addLeadSchema = z.object({
  company_nif: z.string().min(1, "NIF da empresa é obrigatório"),
  company_name: z.string().min(2, "Nome da empresa é obrigatório"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  phone: z.string().min(9, "Telemóvel inválido").max(20, "Telemóvel muito longo"),
  source: z.string().optional(),
  temperature: z.enum(["cold", "warm", "hot"]).optional(),
  value: z.coerce.number().min(0, "Valor inválido").optional().or(z.literal("")),
  notes: z.string().max(500, "Notas muito longas").optional(),
  gdpr_consent: z.literal(true, {
    errorMap: () => ({ message: "Consentimento RGPD é obrigatório" }),
  }),
  automation_enabled: z.boolean().default(true),
  assigned_to: z.string().optional(),
  tipologia: z.enum(["ee", "gas", "servicos", "ee_servicos"]).optional(),
  consumo_anual: z.coerce.number().min(0, "Consumo inválido").optional().or(z.literal("")),
});

type AddLeadFormData = z.infer<typeof addLeadSchema>;

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadModal({ open, onOpenChange }: AddLeadModalProps) {
  const createLead = useCreateLead();
  const uploadAttachment = useUploadLeadAttachment();
  const { data: teamMembers } = useTeamMembers();
  const { canManageTeam } = usePermissions();
  const { organization } = useAuth();

  const [matchedClient, setMatchedClient] = useState<{ id: string; name: string; email: string | null; phone: string | null; notes: string | null; company: string | null } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTelecom = organization?.niche === 'telecom';

  const form = useForm<AddLeadFormData>({
    resolver: zodResolver(addLeadSchema),
    defaultValues: {
      company_nif: "",
      company_name: "",
      name: "",
      email: "",
      phone: "",
      source: "Entrada Manual",
      temperature: "cold",
      value: "",
      notes: "",
      gdpr_consent: undefined,
      automation_enabled: true,
      assigned_to: "",
      tipologia: undefined,
      consumo_anual: "",
    },
  });

  const watchedValues = useWatch({ control: form.control });

  const searchExistingClient = async (nifValue: string) => {
    if (!nifValue || nifValue.length < 3 || !organization?.id) return;
    setIsSearching(true);
    try {
      const { data } = await supabase
        .from('crm_clients')
        .select('id, name, email, phone, notes, company')
        .eq('organization_id', organization.id)
        .eq('company_nif', nifValue)
        .limit(1)
        .maybeSingle();

      if (data) {
        setMatchedClient(data);
        if (!form.getValues('name')) form.setValue('name', data.name);
        if (!form.getValues('company_name') && data.company) form.setValue('company_name', data.company);
        if (!form.getValues('email') && data.email) form.setValue('email', data.email);
        if (!form.getValues('phone') && data.phone) form.setValue('phone', data.phone);
        if (!form.getValues('notes') && data.notes) form.setValue('notes', data.notes);
      } else {
        setMatchedClient(null);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const clearMatchedClient = () => {
    setMatchedClient(null);
  };

  const onSubmit = async (data: AddLeadFormData) => {
    const lead = await createLead.mutateAsync({
      company_nif: data.company_nif,
      company_name: data.company_name,
      name: data.name,
      email: data.email,
      phone: data.phone,
      source: data.source,
      temperature: data.temperature as LeadTemperature,
      value: isTelecom ? undefined : (data.value ? Number(data.value) : undefined),
      notes: data.notes,
      gdpr_consent: data.gdpr_consent,
      automation_enabled: data.automation_enabled,
      assigned_to: data.assigned_to && data.assigned_to !== 'unassigned' ? data.assigned_to : undefined,
      tipologia: isTelecom ? data.tipologia as LeadTipologia : undefined,
      consumo_anual: isTelecom && data.consumo_anual ? Number(data.consumo_anual) : undefined,
    });

    if (pendingFiles.length > 0 && lead?.id) {
      for (const file of pendingFiles) {
        await uploadAttachment.mutateAsync({ leadId: lead.id, file });
      }
    }

    setMatchedClient(null);
    setPendingFiles([]);
    form.reset();
    onOpenChange(false);
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const maxSize = 10 * 1024 * 1024;
    const validFiles = Array.from(files).filter(f => f.size <= maxSize);
    setPendingFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-4 sm:px-6 pr-14 py-4 border-b border-border/50 shrink-0">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-lg font-semibold">Adicionar Lead</DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-6xl mx-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Column - Form */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Matched client banner */}
                  {matchedClient && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3">
                      <User className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                        Cliente existente: <strong>{matchedClient.name}</strong>
                      </span>
                      <button type="button" onClick={clearMatchedClient} className="text-amber-600 dark:text-amber-400 hover:text-amber-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {isSearching && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      A verificar cliente...
                    </div>
                  )}

                  {/* Card: Empresa */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        Empresa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="company_nif"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>NIF Empresa *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="123456789"
                                  {...field}
                                  onBlur={(e) => {
                                    field.onBlur();
                                    searchExistingClient(e.target.value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="company_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome da Empresa *</FormLabel>
                              <FormControl>
                                <Input placeholder="Empresa Exemplo, Lda" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card: Contacto */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Contact className="h-4 w-4 text-muted-foreground" />
                        Contacto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo *</FormLabel>
                            <FormControl>
                              <Input placeholder="João Silva" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="joao@exemplo.pt" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telemóvel *</FormLabel>
                              <FormControl>
                                <PhoneInput value={field.value} onChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card: Detalhes */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                        Detalhes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="source"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Origem</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecionar" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SOURCES.map((source) => (
                                    <SelectItem key={source} value={source}>{source}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="temperature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temperatura</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecionar" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cold">🧊 Frio</SelectItem>
                                  <SelectItem value="warm">🌤️ Morno</SelectItem>
                                  <SelectItem value="hot">🔥 Quente</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {isTelecom && (
                        <FormField
                          control={form.control}
                          name="tipologia"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipologia</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecionar tipologia" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(Object.keys(TIPOLOGIA_LABELS) as LeadTipologia[]).map((tipo) => (
                                    <SelectItem key={tipo} value={tipo}>
                                      <span className="flex items-center gap-2">
                                        <span>{TIPOLOGIA_STYLES[tipo].emoji}</span>
                                        {TIPOLOGIA_LABELS[tipo]}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {isTelecom ? (
                        <FormField
                          control={form.control}
                          name="consumo_anual"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Consumo Anual/kWp (kWh)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="1" placeholder="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="value"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor do Negócio (€)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {canManageTeam && teamMembers && teamMembers.length > 0 && (
                        <FormField
                          control={form.control}
                          name="assigned_to"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <UserCircle className="h-4 w-4" />
                                Atribuir a
                              </FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Não atribuído" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unassigned">Não atribuído</SelectItem>
                                  {teamMembers
                                    .filter(m => !m.is_banned && (m.role === 'salesperson' || m.role === 'admin' || m.role === 'viewer'))
                                    .map((member) => (
                                      <SelectItem key={member.user_id} value={member.user_id}>
                                        {member.full_name} ({RoleLabels[member.role] || member.role})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Card: Observações & Anexos */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-muted-foreground" />
                        Observações
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Notas adicionais sobre o lead..."
                                className="resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {isTelecom && (
                        <div className="space-y-3 rounded-md border p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              Anexar Faturas
                            </span>
                            <div>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                multiple
                                className="hidden"
                                onChange={handleAddFiles}
                              />
                              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-4 w-4" />
                                Adicionar
                              </Button>
                            </div>
                          </div>
                          {pendingFiles.length > 0 && (
                            <div className="space-y-2">
                              {pendingFiles.map((file, i) => (
                                <div key={i} className="flex items-center gap-2 rounded bg-muted/50 p-2 text-sm">
                                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="flex-1 truncate">{file.name}</span>
                                  <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => removePendingFile(i)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          {pendingFiles.length === 0 && (
                            <p className="text-xs text-muted-foreground">PDF, PNG ou JPG (máx. 10MB)</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Summary & Actions */}
                <div className="lg:col-span-2">
                  <div className="lg:sticky lg:top-0 space-y-6">
                    {/* Summary Card */}
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          Resumo
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <SummaryRow label="Empresa" value={watchedValues.company_name} />
                          <SummaryRow label="NIF" value={watchedValues.company_nif} />
                          <SummaryRow label="Nome" value={watchedValues.name} />
                          <SummaryRow label="Email" value={watchedValues.email} />
                          <SummaryRow label="Telefone" value={watchedValues.phone} />
                          <SummaryRow label="Origem" value={watchedValues.source} />
                          {watchedValues.temperature && (
                            <SummaryRow
                              label="Temperatura"
                              value={`${TEMPERATURE_LABELS[watchedValues.temperature]?.emoji} ${TEMPERATURE_LABELS[watchedValues.temperature]?.label}`}
                            />
                          )}
                          {!isTelecom && watchedValues.value && (
                            <SummaryRow label="Valor" value={`€${watchedValues.value}`} />
                          )}
                          {isTelecom && watchedValues.tipologia && (
                            <SummaryRow
                              label="Tipologia"
                              value={`${TIPOLOGIA_STYLES[watchedValues.tipologia as LeadTipologia]?.emoji} ${TIPOLOGIA_LABELS[watchedValues.tipologia as LeadTipologia]}`}
                            />
                          )}
                          {isTelecom && watchedValues.consumo_anual && (
                            <SummaryRow label="Consumo" value={`${watchedValues.consumo_anual} kWh`} />
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* RGPD & Automation */}
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <FormField
                          control={form.control}
                          name="gdpr_consent"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Consentimento RGPD obtido *</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Confirmo que obtive consentimento para guardar estes dados.
                                </p>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="automation_enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-primary/20 bg-primary/5 p-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="flex items-center gap-2">
                                  <Zap className="h-4 w-4 text-primary" />
                                  Activar automação
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Enviar mensagem automática de WhatsApp e notificar equipa.
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => onOpenChange(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={createLead.isPending}
                        onClick={form.handleSubmit(onSubmit)}
                      >
                        {createLead.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            A criar...
                          </>
                        ) : (
                          "Criar Lead"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate max-w-[60%] text-right">
        {value || <span className="text-muted-foreground/50">—</span>}
      </span>
    </div>
  );
}

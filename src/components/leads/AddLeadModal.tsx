import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { PhoneInput } from "@/components/ui/phone-input";
import { Loader2, Zap, UserCircle, X, User } from "lucide-react";
import { useCreateLead } from "@/hooks/useLeads";
import { useTeamMembers } from "@/hooks/useTeam";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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

const addLeadSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  email: z
    .string()
    .email("Email inválido")
    .max(255, "Email muito longo"),
  phone: z
    .string()
    .min(9, "Telemóvel inválido")
    .max(20, "Telemóvel muito longo"),
  source: z.string().optional(),
  temperature: z.enum(["cold", "warm", "hot"]).optional(),
  value: z.coerce.number().min(0, "Valor inválido").optional().or(z.literal("")),
  notes: z.string().max(500, "Notas muito longas").optional(),
  gdpr_consent: z.literal(true, {
    errorMap: () => ({ message: "Consentimento RGPD é obrigatório" }),
  }),
  automation_enabled: z.boolean().default(true),
  assigned_to: z.string().optional(),
  // Telecom template fields
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
  const { data: teamMembers } = useTeamMembers();
  const { canManageTeam } = usePermissions();
  const { organization } = useAuth();
  
  const [matchedClient, setMatchedClient] = useState<{ id: string; name: string; email: string | null; phone: string | null; notes: string | null } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Check if organization is telecom template
  const isTelecom = organization?.niche === 'telecom';
  
  const form = useForm<AddLeadFormData>({
    resolver: zodResolver(addLeadSchema),
    defaultValues: {
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

  const searchExistingClient = async (field: 'email' | 'phone', value: string) => {
    if (!value || value.length < 3 || !organization?.id) return;
    
    setIsSearching(true);
    try {
      const { data } = await supabase
        .from('crm_clients')
        .select('id, name, email, phone, notes')
        .eq('organization_id', organization.id)
        .eq(field, value)
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setMatchedClient(data);
        if (!form.getValues('name')) form.setValue('name', data.name);
        if (!form.getValues('email') && data.email) form.setValue('email', data.email);
        if (!form.getValues('phone') && data.phone) form.setValue('phone', data.phone);
        if (!form.getValues('notes') && data.notes) form.setValue('notes', data.notes);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const clearMatchedClient = () => {
    setMatchedClient(null);
  };

  const onSubmit = async (data: AddLeadFormData) => {
    await createLead.mutateAsync({
      name: data.name,
      email: data.email,
      phone: data.phone,
      source: data.source,
      temperature: data.temperature as LeadTemperature,
      // For telecom, use consumo_anual; for others, use value
      value: isTelecom ? undefined : (data.value ? Number(data.value) : undefined),
      notes: data.notes,
      gdpr_consent: data.gdpr_consent,
      automation_enabled: data.automation_enabled,
      assigned_to: data.assigned_to && data.assigned_to !== 'unassigned' ? data.assigned_to : undefined,
      // Telecom fields
      tipologia: isTelecom ? data.tipologia as LeadTipologia : undefined,
      consumo_anual: isTelecom && data.consumo_anual ? Number(data.consumo_anual) : undefined,
    });
    
    setMatchedClient(null);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Lead</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Banner cliente existente */}
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="joao@exemplo.pt"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        searchExistingClient('email', e.target.value);
                      }}
                    />
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
                    <div onBlur={() => searchExistingClient('phone', field.value)}>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
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

            {/* Tipologia - Only for Telecom template */}
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

            {/* Conditional: Value for non-telecom, Consumo Anual for telecom */}
            {isTelecom ? (
              <FormField
                control={form.control}
                name="consumo_anual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consumo Anual/kWp (kWh)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        {...field}
                      />
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
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Assigned To - Only visible to admins */}
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
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

            <FormField
              control={form.control}
              name="gdpr_consent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Consentimento RGPD obtido *</FormLabel>
                    <p className="text-sm text-muted-foreground">
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
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-primary/20 bg-primary/5 p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Activar automação
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Enviar mensagem automática de WhatsApp e notificar equipa.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

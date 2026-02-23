import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailAutomation {
  id: string;
  organization_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, string>;
  template_id: string;
  delay_minutes: number;
  is_active: boolean;
  recipient_type: string;
  list_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  total_triggered: number;
  template?: { id: string; name: string; subject: string };
  list?: { id: string; name: string } | null;
}

export interface AutomationQueueItem {
  id: string;
  automation_id: string;
  organization_id: string;
  recipient_email: string;
  recipient_name: string | null;
  variables: Record<string, string>;
  template_id: string;
  scheduled_for: string;
  status: string;
  created_at: string;
}

export const TRIGGER_TYPES = [
  { value: 'lead_created', label: 'Novo Lead Criado' },
  { value: 'lead_status_changed', label: 'Lead Muda de Etapa' },
  { value: 'client_created', label: 'Novo Cliente Criado' },
  { value: 'client_status_changed', label: 'Cliente Muda de Estado' },
  { value: 'sale_created', label: 'Nova Venda Criada' },
  { value: 'proposal_created', label: 'Nova Proposta Criada' },
] as const;

export const STRIPE_TRIGGER_TYPES = [
  { value: 'stripe_subscription_created', label: 'Subscrição Reativada' },
  { value: 'stripe_subscription_renewed', label: 'Subscrição Renovada' },
  { value: 'stripe_subscription_canceled', label: 'Subscrição Cancelada' },
  { value: 'stripe_subscription_past_due', label: 'Pagamento em Atraso' },
  { value: 'stripe_payment_failed', label: 'Pagamento Falhado' },
  { value: 'stripe_welcome_starter', label: 'Bem-vindo ao Plano Starter' },
  { value: 'stripe_welcome_pro', label: 'Bem-vindo ao Plano Pro' },
  { value: 'stripe_welcome_elite', label: 'Bem-vindo ao Plano Elite' },
] as const;

export const ALL_TRIGGER_TYPES = [...TRIGGER_TYPES, ...STRIPE_TRIGGER_TYPES];

// RECIPIENT_TYPES removed — automations now target lists (list_id)

export const DELAY_OPTIONS = [
  { value: 0, label: 'Imediato' },
  { value: 5, label: '5 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 360, label: '6 horas' },
  { value: 1440, label: '1 dia' },
  { value: 2880, label: '2 dias' },
  { value: 4320, label: '3 dias' },
  { value: 10080, label: '7 dias' },
] as const;

export function useAutomations() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const automationsQuery = useQuery({
    queryKey: ['email-automations', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('email_automations' as any)
        .select('*, template:email_templates(id, name, subject), list:client_lists(id, name)')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EmailAutomation[];
    },
    enabled: !!organization?.id,
  });

  const queueQuery = useQuery({
    queryKey: ['automation-queue', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('automation_queue' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as AutomationQueueItem[];
    },
    enabled: !!organization?.id,
  });

  const createAutomation = useMutation({
    mutationFn: async (automation: {
      name: string;
      trigger_type: string;
      trigger_config: Record<string, string>;
      template_id: string;
      delay_minutes: number;
      list_id: string;
    }) => {
      if (!organization?.id) throw new Error('Sem organização');
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('email_automations' as any)
        .insert({
          ...automation,
          organization_id: organization.id,
          created_by: userData.user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-automations'] });
      toast.success('Automação criada com sucesso');
    },
    onError: () => toast.error('Erro ao criar automação'),
  });

  const updateAutomation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailAutomation> & { id: string }) => {
      const { error } = await supabase
        .from('email_automations' as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-automations'] });
      toast.success('Automação atualizada');
    },
    onError: () => toast.error('Erro ao atualizar automação'),
  });

  const toggleAutomation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('email_automations' as any)
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-automations'] });
    },
    onError: () => toast.error('Erro ao alterar estado'),
  });

  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_automations' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-automations'] });
      toast.success('Automação eliminada');
    },
    onError: () => toast.error('Erro ao eliminar automação'),
  });

  return {
    automations: automationsQuery.data || [],
    isLoading: automationsQuery.isLoading,
    queue: queueQuery.data || [],
    queueLoading: queueQuery.isLoading,
    createAutomation,
    updateAutomation,
    toggleAutomation,
    deleteAutomation,
  };
}

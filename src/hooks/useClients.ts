import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CrmClient, ClientStatus } from '@/types/clients';

export function useClients() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['crm-clients', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('crm_clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }

      return data as CrmClient[];
    },
    enabled: !!organizationId,
  });
}

export function useClient(clientId: string | null) {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['crm-client', clientId],
    queryFn: async () => {
      if (!clientId || !organizationId) return null;

      const { data, error } = await supabase
        .from('crm_clients')
        .select('*, lead:leads(*)')
        .eq('id', clientId)
        .single();

      if (error) {
        console.error('Error fetching client:', error);
        throw error;
      }

      return data as CrmClient;
    },
    enabled: !!clientId && !!organizationId,
  });
}

interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  nif?: string;
  status?: ClientStatus;
  source?: string;
  notes?: string;
  lead_id?: string;
}

export function useCreateClient() {
  const { organization } = useAuth();
  const organizationId = organization?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateClientData) => {
      if (!organizationId) throw new Error('No organization');

      const { data: client, error } = await supabase
        .from('crm_clients')
        .insert({
          ...data,
          organization_id: organizationId,
          status: data.status || 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-clients'] });
      toast.success('Cliente criado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating client:', error);
      toast.error('Erro ao criar cliente');
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmClient> & { id: string }) => {
      const { data, error } = await supabase
        .from('crm_clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crm-clients'] });
      queryClient.invalidateQueries({ queryKey: ['crm-client', variables.id] });
      toast.success('Cliente atualizado');
    },
    onError: (error) => {
      console.error('Error updating client:', error);
      toast.error('Erro ao atualizar cliente');
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('crm_clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-clients'] });
      toast.success('Cliente removido');
    },
    onError: (error) => {
      console.error('Error deleting client:', error);
      toast.error('Erro ao remover cliente');
    },
  });
}

export function useConvertLeadToClient() {
  const { organization } = useAuth();
  const organizationId = organization?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadData: {
      lead_id: string;
      name: string;
      email?: string;
      phone?: string;
      company?: string;
      nif?: string;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error('No organization');

      const { data, error } = await supabase
        .from('crm_clients')
        .insert({
          organization_id: organizationId,
          lead_id: leadData.lead_id,
          name: leadData.name,
          email: leadData.email,
          phone: leadData.phone,
          company: leadData.company,
          nif: leadData.nif,
          notes: leadData.notes,
          source: 'lead',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-clients'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead convertido em cliente');
    },
    onError: (error) => {
      console.error('Error converting lead:', error);
      toast.error('Erro ao converter lead');
    },
  });
}

export function useClientStats() {
  const { data: clients, isLoading } = useClients();

  const stats = {
    total: clients?.length || 0,
    active: clients?.filter(c => c.status === 'active').length || 0,
    vip: clients?.filter(c => c.status === 'vip').length || 0,
    inactive: clients?.filter(c => c.status === 'inactive').length || 0,
    totalValue: clients?.reduce((sum, c) => sum + (c.total_value || 0), 0) || 0,
  };

  return { stats, isLoading };
}

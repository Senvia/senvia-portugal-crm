import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Cpe, CpeStatus } from '@/types/cpes';

export function useCpes(clientId?: string | null) {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['cpes', organizationId, clientId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('cpes')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching CPEs:', error);
        throw error;
      }

      return data as Cpe[];
    },
    enabled: !!organizationId,
  });
}

export function useCpe(cpeId: string | null) {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['cpe', cpeId],
    queryFn: async () => {
      if (!cpeId || !organizationId) return null;

      const { data, error } = await supabase
        .from('cpes')
        .select('*')
        .eq('id', cpeId)
        .single();

      if (error) {
        console.error('Error fetching CPE:', error);
        throw error;
      }

      return data as Cpe;
    },
    enabled: !!cpeId && !!organizationId,
  });
}

interface CreateCpeData {
  client_id: string;
  equipment_type: string;
  serial_number?: string;
  comercializador: string;
  fidelizacao_start?: string;
  fidelizacao_end?: string;
  status?: CpeStatus;
  notes?: string;
}

export function useCreateCpe() {
  const { organization } = useAuth();
  const organizationId = organization?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCpeData) => {
      if (!organizationId) throw new Error('No organization');

      const { data: cpe, error } = await supabase
        .from('cpes')
        .insert({
          ...data,
          organization_id: organizationId,
          status: data.status || 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return cpe;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cpes'] });
      toast.success('CPE adicionado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating CPE:', error);
      toast.error('Erro ao adicionar CPE');
    },
  });
}

export function useUpdateCpe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Cpe> & { id: string }) => {
      const { data, error } = await supabase
        .from('cpes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cpes'] });
      queryClient.invalidateQueries({ queryKey: ['cpe', variables.id] });
      toast.success('CPE atualizado');
    },
    onError: (error) => {
      console.error('Error updating CPE:', error);
      toast.error('Erro ao atualizar CPE');
    },
  });
}

export function useDeleteCpe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cpeId: string) => {
      const { error } = await supabase
        .from('cpes')
        .delete()
        .eq('id', cpeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpes'] });
      toast.success('CPE removido');
    },
    onError: (error) => {
      console.error('Error deleting CPE:', error);
      toast.error('Erro ao remover CPE');
    },
  });
}

// Stats for a specific client
export function useClientCpeStats(clientId: string | null) {
  const { data: cpes, isLoading } = useCpes(clientId);

  const stats = {
    total: cpes?.length || 0,
    active: cpes?.filter(c => c.status === 'active').length || 0,
    pending: cpes?.filter(c => c.status === 'pending').length || 0,
    expiringThisMonth: cpes?.filter(c => {
      if (!c.fidelizacao_end) return false;
      const endDate = new Date(c.fidelizacao_end);
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return endDate <= endOfMonth && endDate >= now;
    }).length || 0,
  };

  return { stats, isLoading };
}

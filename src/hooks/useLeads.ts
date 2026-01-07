import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Lead, LeadStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useLeads() {
  const { organization } = useAuth();
  
  return useQuery({
    queryKey: ['leads', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!organization?.id,
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: LeadStatus }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', leadId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o estado do lead.',
        variant: 'destructive',
      });
      console.error('Error updating lead status:', error);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ leadId, updates }: { leadId: string; updates: Partial<Lead> }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Sucesso',
        description: 'Lead atualizado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o lead.',
        variant: 'destructive',
      });
      console.error('Error updating lead:', error);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Lead eliminado',
        description: 'O lead foi eliminado permanentemente (RGPD).',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível eliminar o lead.',
        variant: 'destructive',
      });
      console.error('Error deleting lead:', error);
    },
  });
}

export function useLeadStats() {
  const { data: leads } = useLeads();
  
  if (!leads) {
    return {
      total: 0,
      new: 0,
      conversionRate: 0,
      pipelineValue: 0,
    };
  }
  
  const total = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const won = leads.filter(l => l.status === 'won').length;
  const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
  const pipelineValue = leads
    .filter(l => !['won', 'lost'].includes(l.status))
    .reduce((sum, l) => sum + (l.value || 0), 0);
  
  return {
    total,
    new: newLeads,
    conversionRate,
    pipelineValue,
  };
}

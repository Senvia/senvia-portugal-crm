import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Proposal, ProposalProduct, ProposalStatus } from '@/types/proposals';

export function useProposals() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          lead:leads(id, name, email, phone),
          client:crm_clients(id, name, email, phone)
        `)
        .eq('organization_id', organization!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Proposal[];
    },
    enabled: !!organization?.id,
  });
}

export function useLeadProposals(leadId: string | undefined) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['proposals', 'lead', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Proposal[];
    },
    enabled: !!leadId && !!organization?.id,
  });
}

export function useProposalProducts(proposalId: string | undefined) {
  return useQuery({
    queryKey: ['proposal_products', proposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_products')
        .select('*')
        .eq('proposal_id', proposalId!);
      
      if (error) throw error;
      return data as ProposalProduct[];
    },
    enabled: !!proposalId,
  });
}

interface CreateProposalData {
  client_id?: string;
  lead_id?: string; // Mantido para retrocompatibilidade
  total_value: number;
  status?: ProposalStatus;
  notes?: string;
  proposal_date?: string;
  products: { product_id: string; quantity: number; unit_price: number; total: number }[];
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  const { organization, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateProposalData) => {
      // Create proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          organization_id: organization!.id,
          client_id: data.client_id || null,
          lead_id: data.lead_id || null,
          total_value: data.total_value,
          status: data.status || 'draft',
          notes: data.notes || null,
          proposal_date: data.proposal_date || new Date().toISOString().split('T')[0],
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (proposalError) throw proposalError;

      // Create proposal products
      if (data.products.length > 0) {
        const { error: productsError } = await supabase
          .from('proposal_products')
          .insert(
            data.products.map(p => ({
              proposal_id: proposal.id,
              product_id: p.product_id,
              quantity: p.quantity,
              unit_price: p.unit_price,
              total: p.total,
            }))
          );
        
        if (productsError) throw productsError;
      }

      return proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Proposta criada', description: 'A proposta foi criada com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível criar a proposta.', variant: 'destructive' });
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: ProposalStatus; total_value?: number; notes?: string }) => {
      const { error } = await supabase
        .from('proposals')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Proposta atualizada', description: 'As alterações foram guardadas.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível atualizar a proposta.', variant: 'destructive' });
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Proposta eliminada', description: 'A proposta foi removida.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível eliminar a proposta.', variant: 'destructive' });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamFilter } from '@/hooks/useTeamFilter';
import { useToast } from '@/hooks/use-toast';
import type { Proposal, ProposalProduct, ProposalStatus } from '@/types/proposals';

export function useProposals() {
  const { organization } = useAuth();
  const { effectiveUserId } = useTeamFilter();

  return useQuery({
    queryKey: ['proposals', organization?.id, effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          lead:leads(id, name, email, phone, assigned_to),
          client:crm_clients(id, name, email, phone)
        `)
        .eq('organization_id', organization!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      let result = data as (Proposal & { lead?: { assigned_to?: string } })[];
      
      // Se há filtro de utilizador, filtrar por created_by OU lead atribuído
      if (effectiveUserId) {
        result = result.filter(proposal => 
          proposal.created_by === effectiveUserId || 
          proposal.lead?.assigned_to === effectiveUserId
        );
      }
      
      return result as Proposal[];
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
      // Get proposal products
      const { data: proposalProducts, error: ppError } = await supabase
        .from('proposal_products')
        .select('*')
        .eq('proposal_id', proposalId!);
      
      if (ppError) throw ppError;
      if (!proposalProducts || proposalProducts.length === 0) return [];
      
      // Get product details for each product_id
      const productIds = proposalProducts.map(pp => pp.product_id);
      const { data: products, error: pError } = await supabase
        .from('products')
        .select('id, name, price')
        .in('id', productIds);
      
      if (pError) throw pError;
      
      // Merge products into proposal_products
      const productsMap = new Map(products?.map(p => [p.id, p]) || []);
      
      return proposalProducts.map(pp => ({
        ...pp,
        product: productsMap.get(pp.product_id) || null,
      })) as (ProposalProduct & { product?: { id: string; name: string; price: number } | null })[];
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
  
  // Campos por tipo de proposta
  proposal_type?: 'energia' | 'servicos';
  
  // Campos Energia
  consumo_anual?: number;
  margem?: number;
  dbl?: boolean;
  anos_contrato?: number;
  
  // Campos Serviços
  modelo_servico?: 'transacional' | 'saas';
  kwp?: number;
  
  // Comum
  comissao?: number;
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  const { organization, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateProposalData) => {
      // Auto-infer lead_id from client if not provided
      let leadId = data.lead_id || null;
      
      if (!leadId && data.client_id) {
        // Lookup client to get its lead_id
        const { data: client } = await supabase
          .from('crm_clients')
          .select('lead_id')
          .eq('id', data.client_id)
          .single();
        
        if (client?.lead_id) {
          leadId = client.lead_id;
        }
      }
      
      // Create proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          organization_id: organization!.id,
          client_id: data.client_id || null,
          lead_id: leadId,
          total_value: data.total_value,
          status: data.status || 'draft',
          notes: data.notes || null,
          proposal_date: data.proposal_date || new Date().toISOString().split('T')[0],
          created_by: user?.id,
          // Campos por tipo
          proposal_type: data.proposal_type || 'energia',
          consumo_anual: data.consumo_anual || null,
          margem: data.margem || null,
          dbl: data.dbl || false,
          anos_contrato: data.anos_contrato || null,
          modelo_servico: data.modelo_servico || null,
          kwp: data.kwp || null,
          comissao: data.comissao || null,
        })
        .select(`
          *,
          client:crm_clients(id, name, email, phone),
          lead:leads(id, name, email, phone)
        `)
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

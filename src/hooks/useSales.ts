import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { toast } from "sonner";
import type { SaleStatus, SaleWithDetails, PaymentMethod, PaymentStatus } from "@/types/sales";

export function useSales() {
  const { organization } = useAuth();
  const { effectiveUserId } = useTeamFilter();

  return useQuery({
    queryKey: ["sales", organization?.id, effectiveUserId],
    queryFn: async (): Promise<SaleWithDetails[]> => {
      if (!organization?.id) return [];

      let query = supabase
        .from("sales")
        .select(`
          *,
          lead:leads(name, email, phone, assigned_to),
          proposal:proposals(id, code, proposal_date),
          client:crm_clients(id, name, code)
        `)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      // Se há filtro de utilizador, filtrar por created_by
      if (effectiveUserId) {
        query = query.eq("created_by", effectiveUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as SaleWithDetails[]) || [];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const { organization, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      proposal_id?: string;
      lead_id?: string;
      client_id?: string;
      total_value: number;
      subtotal?: number;
      discount?: number;
      payment_method?: PaymentMethod;
      payment_status?: PaymentStatus;
      due_date?: string;
      invoice_reference?: string;
      sale_date?: string;
      notes?: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          organization_id: organization.id,
          proposal_id: data.proposal_id || null,
          lead_id: data.lead_id || null,
          client_id: data.client_id || null,
          total_value: data.total_value,
          subtotal: data.subtotal || data.total_value,
          discount: data.discount || 0,
          payment_method: data.payment_method || null,
          payment_status: data.payment_status || "pending",
          due_date: data.due_date || null,
          invoice_reference: data.invoice_reference || null,
          sale_date: data.sale_date || new Date().toISOString().split('T')[0],
          notes: data.notes || null,
          created_by: user?.id || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Venda criada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar venda");
    },
  });
}

export function useCreateSaleFromProposal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (proposal: {
      id: string;
      organization_id: string;
      lead_id: string;
      total_value: number;
      client_id?: string;
    }) => {
      // Check if sale already exists for this proposal
      const { data: existingSale } = await supabase
        .from("sales")
        .select("id")
        .eq("proposal_id", proposal.id)
        .single();

      if (existingSale) {
        return existingSale; // Sale already exists, don't create duplicate
      }

      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          organization_id: proposal.organization_id,
          proposal_id: proposal.id,
          lead_id: proposal.lead_id,
          client_id: proposal.client_id || null,
          total_value: proposal.total_value,
          subtotal: proposal.total_value,
          created_by: user?.id || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Venda criada automaticamente!");
    },
    onError: () => {
      toast.error("Erro ao criar venda");
    },
  });
}

export function useUpdateSaleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, status }: { saleId: string; status: SaleStatus }) => {
      const { error } = await supabase
        .from("sales")
        .update({ status })
        .eq("id", saleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Estado atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar estado");
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      saleId, 
      updates 
    }: { 
      saleId: string; 
      updates: { 
        status?: SaleStatus; 
        notes?: string; 
        total_value?: number;
        payment_method?: PaymentMethod | null;
        payment_status?: PaymentStatus;
        due_date?: string | null;
        paid_date?: string | null;
        invoice_reference?: string | null;
        discount?: number;
        subtotal?: number;
      } 
    }) => {
      const { error } = await supabase
        .from("sales")
        .update(updates)
        .eq("id", saleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar venda");
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", saleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Venda eliminada!");
    },
    onError: () => {
      toast.error("Erro ao eliminar venda");
    },
  });
}

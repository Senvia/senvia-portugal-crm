import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SaleStatus, SaleWithDetails } from "@/types/sales";

export function useSales() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["sales", organization?.id],
    queryFn: async (): Promise<SaleWithDetails[]> => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          lead:leads(name, email, phone),
          proposal:proposals(id, proposal_date)
        `)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

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
      total_value: number;
      notes?: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          organization_id: organization.id,
          proposal_id: data.proposal_id || null,
          lead_id: data.lead_id || null,
          total_value: data.total_value,
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
          total_value: proposal.total_value,
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
      updates: { status?: SaleStatus; notes?: string; total_value?: number } 
    }) => {
      const { error } = await supabase
        .from("sales")
        .update(updates)
        .eq("id", saleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
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
      toast.success("Venda eliminada!");
    },
    onError: () => {
      toast.error("Erro ao eliminar venda");
    },
  });
}

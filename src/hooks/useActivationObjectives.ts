import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, startOfYear, format } from "date-fns";
import { toast } from "sonner";

export interface ActivationObjective {
  id: string;
  organization_id: string;
  user_id: string;
  period_type: "monthly" | "annual";
  proposal_type: "energia" | "servicos";
  month: string;
  target_quantity: number;
}

export interface ActivationCount {
  user_id: string;
  count: number;
}

export function useActivationObjectives() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const currentMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const currentYearStart = format(startOfYear(new Date()), "yyyy-MM-dd");
  const now = new Date();
  const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");
  const yearEnd = format(new Date(now.getFullYear(), 11, 31), "yyyy-MM-dd");

  // Fetch all objectives for current month and year
  const { data: objectives = [], isLoading: objectivesLoading } = useQuery({
    queryKey: ["activation-objectives", orgId, currentMonthStart, currentYearStart],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("activation_objectives" as any)
        .select("*")
        .eq("organization_id", orgId)
        .in("month", [currentMonthStart, currentYearStart]);
      if (error) throw error;
      return (data || []) as unknown as ActivationObjective[];
    },
    enabled: !!orgId,
  });

  // Fetch activations (sales with activation_date) for current month
  const { data: monthlyActivations = [], isLoading: monthlyLoading } = useQuery({
    queryKey: ["activations-monthly", orgId, currentMonthStart],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("created_by, proposal_type, activation_date")
        .eq("organization_id", orgId)
        .not("activation_date", "is", null)
        .gte("activation_date", currentMonthStart)
        .lte("activation_date", monthEnd)
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch activations for current year
  const { data: annualActivations = [], isLoading: annualLoading } = useQuery({
    queryKey: ["activations-annual", orgId, currentYearStart],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("created_by, proposal_type, activation_date")
        .eq("organization_id", orgId)
        .not("activation_date", "is", null)
        .gte("activation_date", currentYearStart)
        .lte("activation_date", yearEnd)
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Helper to get objective target
  const getTarget = (userId: string, periodType: "monthly" | "annual", proposalType: "energia" | "servicos"): number => {
    const month = periodType === "monthly" ? currentMonthStart : currentYearStart;
    const obj = objectives.find(
      (o) => o.user_id === userId && o.period_type === periodType && o.proposal_type === proposalType && o.month === month
    );
    return obj?.target_quantity || 0;
  };

  // Helper to count activations
  const countActivations = (
    userId: string | null,
    periodType: "monthly" | "annual",
    proposalType: "energia" | "servicos"
  ): number => {
    const source = periodType === "monthly" ? monthlyActivations : annualActivations;
    return source.filter((s: any) => {
      const matchType = proposalType === "energia"
        ? s.proposal_type === "energia" || (!s.proposal_type && true) // default to energia if null
        : s.proposal_type === "servicos";
      const matchUser = userId ? s.created_by === userId : true;
      return matchType && matchUser;
    }).length;
  };

  // Upsert objective
  const saveObjective = useMutation({
    mutationFn: async ({
      userId,
      periodType,
      proposalType,
      targetQuantity,
    }: {
      userId: string;
      periodType: "monthly" | "annual";
      proposalType: "energia" | "servicos";
      targetQuantity: number;
    }) => {
      if (!orgId) throw new Error("Sem organização");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem utilizador");

      const month = periodType === "monthly" ? currentMonthStart : currentYearStart;
      const { error } = await supabase
        .from("activation_objectives" as any)
        .upsert(
          {
            organization_id: orgId,
            user_id: userId,
            period_type: periodType,
            proposal_type: proposalType,
            month,
            target_quantity: targetQuantity,
            created_by: user.id,
          } as any,
          { onConflict: "organization_id,user_id,period_type,proposal_type,month" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activation-objectives"] });
      toast.success("Objetivo guardado com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao guardar objetivo: " + err.message);
    },
  });

  return {
    objectives,
    isLoading: objectivesLoading || monthlyLoading || annualLoading,
    getTarget,
    countActivations,
    saveObjective,
    currentMonthStart,
    currentYearStart,
  };
}

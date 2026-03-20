import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { DatePeriod, RhHoliday } from "@/lib/rh-utils";
import { countBusinessDays } from "@/lib/rh-utils";

export interface RhAbsence {
  id: string;
  organization_id: string;
  user_id: string;
  absence_type: string;
  status: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  rh_absence_periods?: RhAbsencePeriod[];
  // joined
  user_name?: string;
  user_email?: string;
}

export interface RhAbsencePeriod {
  id: string;
  absence_id: string;
  start_date: string;
  end_date: string;
  business_days: number;
  status: string;
  period_type: string;
  start_time: string | null;
  end_time: string | null;
}

export interface RhVacationBalance {
  id: string;
  organization_id: string;
  user_id: string;
  year: number;
  total_days: number;
  used_days: number;
}

// Fetch user's own absences
export function useMyAbsences() {
  const { user, organization } = useAuth();

  return useQuery({
    queryKey: ["rh-my-absences", user?.id, organization?.id],
    queryFn: async () => {
      if (!user?.id || !organization?.id) return [];
      const { data, error } = await supabase
        .from("rh_absences")
        .select("*, rh_absence_periods(*)")
        .eq("organization_id", organization.id)
        .eq("user_id", user.id)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return (data || []) as RhAbsence[];
    },
    enabled: !!user?.id && !!organization?.id,
  });
}

// Fetch all org absences (admin)
export function useOrgAbsences() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["rh-org-absences", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Get absences
      const { data: absences, error } = await supabase
        .from("rh_absences")
        .select("*, rh_absence_periods(*)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!absences || absences.length === 0) return [];

      // Get user names
      const userIds = [...new Set(absences.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return absences.map(a => ({
        ...a,
        user_name: profileMap.get(a.user_id)?.full_name || "Desconhecido",
        user_email: profileMap.get(a.user_id)?.email || "",
      })) as RhAbsence[];
    },
    enabled: !!organization?.id,
  });
}

// Fetch user's vacation balance
export function useMyVacationBalance() {
  const { user, organization } = useAuth();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ["rh-vacation-balance", user?.id, organization?.id, currentYear],
    queryFn: async (): Promise<RhVacationBalance | null> => {
      if (!user?.id || !organization?.id) return null;
      const { data, error } = await supabase
        .from("rh_vacation_balances")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("user_id", user.id)
        .eq("year", currentYear)
        .maybeSingle();

      if (error) throw error;
      return data as RhVacationBalance | null;
    },
    enabled: !!user?.id && !!organization?.id,
  });
}

// Create absence request
export function useCreateAbsence() {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      absenceType,
      periods,
      notes,
      holidays,
    }: {
      absenceType: string;
      periods: DatePeriod[];
      notes: string;
      holidays: RhHoliday[];
    }) => {
      if (!user?.id || !organization?.id) throw new Error("Não autenticado");

      const allDates = periods.flatMap(p => [p.from, p.to]);
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

      const { data: absence, error: absError } = await supabase
        .from("rh_absences")
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          absence_type: absenceType,
          start_date: format(minDate, "yyyy-MM-dd"),
          end_date: format(maxDate, "yyyy-MM-dd"),
          notes: notes || null,
        })
        .select()
        .single();

      if (absError) throw absError;

      const periodsToInsert = periods.map(p => ({
        absence_id: absence.id,
        start_date: format(p.from, "yyyy-MM-dd"),
        end_date: format(p.to, "yyyy-MM-dd"),
        business_days:
          p.periodType === "partial" && p.businessDays !== undefined
            ? p.businessDays
            : countBusinessDays(p.from, p.to, holidays),
        period_type: p.periodType,
        start_time: p.startTime || null,
        end_time: p.endTime || null,
      }));

      const { error: periodsError } = await supabase
        .from("rh_absence_periods")
        .insert(periodsToInsert);

      if (periodsError) throw periodsError;
      return absence;
    },
    onSuccess: () => {
      toast({ title: "Pedido submetido com sucesso!" });
      qc.invalidateQueries({ queryKey: ["rh-my-absences"] });
      qc.invalidateQueries({ queryKey: ["rh-org-absences"] });
      qc.invalidateQueries({ queryKey: ["rh-vacation-balance"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });
}

// Delete (cancel) own pending absence
export function useDeleteAbsence() {
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (absenceId: string) => {
      await supabase.from("rh_absence_periods").delete().eq("absence_id", absenceId);
      const { error } = await supabase.from("rh_absences").delete().eq("id", absenceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Pedido cancelado" });
      qc.invalidateQueries({ queryKey: ["rh-my-absences"] });
      qc.invalidateQueries({ queryKey: ["rh-org-absences"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });
}

// Approve absence (admin)
export function useApproveAbsence() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ absenceId, mode }: { absenceId: string; mode: "approve" | "reject"; rejectionReason?: string }) => {
      if (!user?.id) throw new Error("Não autenticado");

      if (mode === "approve") {
        const { error } = await supabase
          .from("rh_absences")
          .update({
            status: "approved",
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          })
          .eq("id", absenceId);
        if (error) throw error;

        // Mark all periods as approved
        await supabase
          .from("rh_absence_periods")
          .update({ status: "approved" })
          .eq("absence_id", absenceId);
      }
    },
    onSuccess: () => {
      toast({ title: "Pedido aprovado" });
      qc.invalidateQueries({ queryKey: ["rh-org-absences"] });
      qc.invalidateQueries({ queryKey: ["rh-my-absences"] });
      qc.invalidateQueries({ queryKey: ["rh-vacation-balance"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });
}

// Reject absence (admin)
export function useRejectAbsence() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ absenceId, reason }: { absenceId: string; reason?: string }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("rh_absences")
        .update({
          status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq("id", absenceId);
      if (error) throw error;

      await supabase
        .from("rh_absence_periods")
        .update({ status: "rejected" })
        .eq("absence_id", absenceId);
    },
    onSuccess: () => {
      toast({ title: "Pedido rejeitado" });
      qc.invalidateQueries({ queryKey: ["rh-org-absences"] });
      qc.invalidateQueries({ queryKey: ["rh-my-absences"] });
      qc.invalidateQueries({ queryKey: ["rh-vacation-balance"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });
}

// Admin: update vacation balance
export function useUpdateVacationBalance() {
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
      year,
      totalDays,
    }: {
      organizationId: string;
      userId: string;
      year: number;
      totalDays: number;
    }) => {
      const { error } = await supabase
        .from("rh_vacation_balances")
        .upsert(
          {
            organization_id: organizationId,
            user_id: userId,
            year,
            total_days: totalDays,
          },
          { onConflict: "organization_id,user_id,year" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saldo atualizado" });
      qc.invalidateQueries({ queryKey: ["rh-vacation-balance"] });
      qc.invalidateQueries({ queryKey: ["rh-org-balances"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });
}

// Admin: get all balances
export function useOrgVacationBalances() {
  const { organization } = useAuth();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ["rh-org-balances", organization?.id, currentYear],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("rh_vacation_balances")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("year", currentYear);
      if (error) throw error;

      // Get user names
      const userIds = [...new Set((data || []).map(b => b.user_id))];
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return (data || []).map(b => ({
        ...b,
        user_name: profileMap.get(b.user_id)?.full_name || "Desconhecido",
      }));
    },
    enabled: !!organization?.id,
  });
}

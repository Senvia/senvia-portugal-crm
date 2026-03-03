import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, format } from "date-fns";
import { toast } from "sonner";

export interface CommitmentLine {
  id?: string;
  nif: string;
  energia_mwh: number;
  solar_kwp: number;
  comissao: number;
  proposal_id?: string | null;
  notes?: string | null;
}

interface Commitment {
  id: string;
  organization_id: string;
  user_id: string;
  month: string;
  created_at: string;
  updated_at: string;
  lines: CommitmentLine[];
}

export function useCommitments(targetUserId?: string | null) {
  const { user, organization } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;
  const currentMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const effectiveUserId = targetUserId || user?.id;

  const queryKey = ["commitments", orgId, currentMonth, effectiveUserId];

  const { data: commitment, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!orgId || !effectiveUserId) return null;

      const { data: mc, error } = await supabase
        .from("monthly_commitments")
        .select("*")
        .eq("organization_id", orgId)
        .eq("user_id", effectiveUserId)
        .eq("month", currentMonth)
        .maybeSingle();

      if (error) throw error;
      if (!mc) return null;

      const { data: lines, error: linesErr } = await supabase
        .from("commitment_lines")
        .select("*")
        .eq("commitment_id", mc.id)
        .order("created_at", { ascending: true });

      if (linesErr) throw linesErr;

      return { ...mc, lines: lines || [] } as Commitment;
    },
    enabled: !!orgId && !!effectiveUserId,
  });

  const saveCommitment = useMutation({
    mutationFn: async (lines: CommitmentLine[]) => {
      if (!orgId || !user?.id) throw new Error("Sem organização/utilizador");

      // Upsert the commitment header
      const { data: mc, error: mcErr } = await supabase
        .from("monthly_commitments")
        .upsert(
          { organization_id: orgId, user_id: user.id, month: currentMonth },
          { onConflict: "organization_id,user_id,month" }
        )
        .select("id")
        .single();

      if (mcErr) throw mcErr;

      // Delete existing lines and insert new ones
      await supabase
        .from("commitment_lines")
        .delete()
        .eq("commitment_id", mc.id);

      if (lines.length > 0) {
        const { error: insertErr } = await supabase
          .from("commitment_lines")
          .insert(
            lines.map((l) => ({
              commitment_id: mc.id,
              nif: l.nif,
              energia_mwh: l.energia_mwh,
              solar_kwp: l.solar_kwp,
              comissao: l.comissao,
              proposal_id: l.proposal_id || null,
              notes: l.notes || null,
            }))
          );
        if (insertErr) throw insertErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      toast.success("Compromisso guardado com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao guardar compromisso: " + err.message);
    },
  });

  return { commitment, isLoading, saveCommitment };
}
